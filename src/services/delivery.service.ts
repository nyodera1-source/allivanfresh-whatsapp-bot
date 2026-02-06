/**
 * Delivery service - calculates distance and delivery fees
 * Uses a known locations table for Kisumu-area places (instant, accurate)
 * Falls back to OpenStreetMap Nominatim (free, no API key) for geocoding
 * Uses Haversine formula for distance calculation
 */

// Kisumu Town Center coordinates
const KISUMU_CENTER = {
  lat: -0.0917,
  lon: 34.7680,
};

// Road distance multiplier (straight-line to road distance approximation)
const ROAD_MULTIPLIER = 1.3;

// Max straight-line distance we trust from Nominatim (km).
// If result is further than this, it's likely a wrong geocode.
const MAX_TRUSTED_DISTANCE_KM = 100;

// Viewbox around Kisumu (~100km radius) to bias Nominatim results
// Format: left,top,right,bottom (lon1,lat1,lon2,lat2)
const KISUMU_VIEWBOX = '33.8,-0.9,35.7,0.7';

/**
 * Known locations around Kisumu with approximate road distance in km.
 * This avoids Nominatim failures for small villages/areas.
 */
const KNOWN_LOCATIONS: Record<string, number> = {
  // Kisumu town areas (0-5km)
  'kondele': 2,
  'kibuye': 1,
  'mamboleo': 3,
  'nyamasaria': 5,
  'migosi': 2,
  'lolwe': 1,
  'milimani': 2,
  'nyalenda': 3,
  'manyatta': 2,
  'obunga': 2,
  'bandani': 3,
  'polyview': 4,
  'otonglo': 3,
  'riat': 5,
  'tom mboya': 1,
  'oginga odinga': 1,
  'dunga': 4,
  'hippo point': 5,
  // Nearby areas (5-15km)
  'kisian': 7,
  'kajulu': 8,
  'alendu': 10,
  'rabuor': 13,
  'kibos': 10,
  'kopere': 12,
  'korando': 4,
  'chiga': 6,
  'nyang\'ande': 8,
  'nyahera': 6,
  'ojolla': 5,
  'car wash': 4,
  'obambo': 8,
  'dago': 7,
  'usoma': 5,
  'lwang\'ni': 4,
  // Further areas (15-50km)
  'ahero': 22,
  'maseno': 20,
  'kombewa': 28,
  'muhoroni': 42,
  'chemelil': 48,
  'katito': 35,
  'koru': 33,
  'sondu': 40,
  'awasi': 30,
  'chemase': 25,
  'fort ternan': 38,
  'tamu': 15,
  'pap onditi': 18,
  'miwani': 30,
  'kibigori': 35,
  // Far areas (50km+)
  'bondo': 58,
  'siaya': 55,
  'vihiga': 38,
  'luanda': 48,
  'kendu bay': 55,
  'homa bay': 80,
  'oyugis': 60,
  'nandi hills': 50,
  'kapsabet': 65,
  'kakamega': 60,
  'busia': 110,
  'mumias': 80,
};

export interface DeliveryQuote {
  locationName: string;
  distanceKm: number; // road-adjusted distance
  fee: number; // KES
  zone: 'town' | 'nearby' | 'far';
  minimumOrderRequired?: number; // only for 'far' zone
}

/**
 * Clean location text for geocoding by stripping road direction references
 * that confuse Nominatim (e.g., "on Nairobi road" → Nominatim finds Nairobi city)
 */
function cleanLocationForGeocoding(locationName: string): string {
  let cleaned = locationName;

  // Remove directional phrases like "on Nairobi road", "towards Ahero", "past Alendu"
  cleaned = cleaned.replace(/\b(on|along|towards?|past|near|before|after|opposite|behind|next\s+to|by|via)\s+[\w\s]+\b(road|highway|rd|hwy|avenue|ave|street|st|way|junction|jn|jnc)\b/gi, '');
  // Remove "on [Name] road" patterns
  cleaned = cleaned.replace(/\bon\s+[\w]+\s+road\b/gi, '');
  // Remove standalone direction references like "Nairobi road side", "Busia road"
  cleaned = cleaned.replace(/\b(nairobi|busia|kakamega|ahero|kericho|nandi)\s+(road|highway|rd|hwy|side|direction)\b/gi, '');

  // Clean up extra whitespace and commas
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();
  cleaned = cleaned.replace(/^[,\s]+|[,\s]+$/g, '');

  return cleaned || locationName; // fallback to original if cleaning removed everything
}

/**
 * Geocode a location name to coordinates using Nominatim
 * Uses viewbox to bias results around Kisumu and validates distance
 */
async function geocodeLocation(
  locationName: string
): Promise<{ lat: number; lon: number } | null> {
  try {
    const cleanedName = cleanLocationForGeocoding(locationName);
    console.log(`[Delivery] Geocoding: "${locationName}" → cleaned: "${cleanedName}"`);

    // Search with Kisumu context + viewbox bias for better results
    const query = `${cleanedName}, Kisumu, Kenya`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=3&countrycodes=ke&viewbox=${KISUMU_VIEWBOX}&bounded=0`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AllivanFresh-WhatsApp-Bot/1.0',
      },
    });

    if (!response.ok) {
      console.error('[Delivery] Nominatim API error:', response.status);
      return null;
    }

    const results = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;

    // Try to find the closest result to Kisumu from up to 3 results
    let bestResult = findClosestToKisumu(results);

    if (!bestResult) {
      // Try without Kisumu context but still with viewbox
      const broadUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedName + ', Kenya')}&format=json&limit=3&countrycodes=ke&viewbox=${KISUMU_VIEWBOX}&bounded=0`;
      const broadResponse = await fetch(broadUrl, {
        headers: {
          'User-Agent': 'AllivanFresh-WhatsApp-Bot/1.0',
        },
      });

      if (!broadResponse.ok) return null;

      const broadResults = (await broadResponse.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      bestResult = findClosestToKisumu(broadResults);
    }

    if (!bestResult) {
      console.log(`[Delivery] No results found for "${cleanedName}"`);
      return null;
    }

    // Sanity check: if the best result is still too far from Kisumu, reject it
    const straightLine = haversineDistance(
      KISUMU_CENTER.lat, KISUMU_CENTER.lon,
      bestResult.lat, bestResult.lon
    );

    if (straightLine > MAX_TRUSTED_DISTANCE_KM) {
      console.log(`[Delivery] Result for "${locationName}" is ${Math.round(straightLine)}km from Kisumu - too far, likely wrong geocode`);
      return null;
    }

    console.log(`[Delivery] Geocoded "${locationName}" → [${bestResult.lat}, ${bestResult.lon}] (${Math.round(straightLine)}km from Kisumu)`);
    return bestResult;
  } catch (error: any) {
    console.error('[Delivery] Geocoding error:', error.message);
    return null;
  }
}

/**
 * From multiple Nominatim results, pick the one closest to Kisumu
 */
function findClosestToKisumu(
  results: Array<{ lat: string; lon: string; display_name: string }>
): { lat: number; lon: number } | null {
  if (results.length === 0) return null;

  let closest: { lat: number; lon: number } | null = null;
  let closestDistance = Infinity;

  for (const result of results) {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const dist = haversineDistance(KISUMU_CENTER.lat, KISUMU_CENTER.lon, lat, lon);

    console.log(`[Delivery]   Candidate: "${result.display_name}" → ${Math.round(dist)}km from Kisumu`);

    if (dist < closestDistance) {
      closestDistance = dist;
      closest = { lat, lon };
    }
  }

  return closest;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate delivery fee based on distance
 * - Within ~5km (Kisumu town): FREE
 * - Within 15km: KES 100
 * - Beyond 15km: KES 10/km (minimum order KES 5,000)
 */
function calculateFee(distanceKm: number): DeliveryQuote['fee'] {
  if (distanceKm <= 5) return 0;
  if (distanceKm <= 15) return 100;
  return Math.round(distanceKm * 10);
}

function getZone(distanceKm: number): DeliveryQuote['zone'] {
  if (distanceKm <= 5) return 'town';
  if (distanceKm <= 15) return 'nearby';
  return 'far';
}

/**
 * Look up a location in the known locations table.
 * Searches for any known place name within the customer's text.
 * Returns the longest matching name to avoid partial matches.
 */
export function lookupKnownLocation(text: string): { name: string; distanceKm: number } | null {
  const lowerText = text.toLowerCase();

  const matches = Object.entries(KNOWN_LOCATIONS)
    .filter(([name]) => {
      // Check if the known name appears as a word boundary in the text
      const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(lowerText);
    })
    .sort((a, b) => b[0].length - a[0].length); // longest match first

  if (matches.length > 0) {
    console.log(`[Delivery] Known location match: "${matches[0][0]}" → ${matches[0][1]}km`);
    return { name: matches[0][0], distanceKm: matches[0][1] };
  }

  return null;
}

/**
 * Try to parse a km distance from customer text.
 * Matches patterns like "10km", "about 15 km", "15 kilometers", "around 20km"
 */
export function parseKmFromText(text: string): number | null {
  const match = text.match(/(\d+)\s*(km|kilometers?|kilometres?|kms)/i);
  if (match) {
    const km = parseInt(match[1]);
    if (km > 0 && km < 500) {
      console.log(`[Delivery] Parsed distance from text: ${km}km`);
      return km;
    }
  }
  return null;
}

/**
 * Create a delivery quote from a known distance (no geocoding needed)
 */
export function getDeliveryQuoteFromDistance(
  distanceKm: number,
  locationName: string
): DeliveryQuote {
  const zone = getZone(distanceKm);
  const fee = calculateFee(distanceKm);

  const quote: DeliveryQuote = {
    locationName,
    distanceKm,
    fee,
    zone,
  };

  if (zone === 'far') {
    quote.minimumOrderRequired = 5000;
  }

  console.log(
    `[Delivery] Quote from distance: "${locationName}" → ${distanceKm}km, zone=${zone}, fee=KES ${fee}`
  );

  return quote;
}

/**
 * Get delivery quote for a location.
 * Tries: 1) Known locations table, 2) Nominatim geocoding
 */
export async function getDeliveryQuote(
  locationName: string
): Promise<DeliveryQuote | null> {
  // 1. Try known locations table first (instant, most reliable for local places)
  const known = lookupKnownLocation(locationName);
  if (known) {
    return getDeliveryQuoteFromDistance(known.distanceKm, locationName);
  }

  // 2. Try Nominatim geocoding
  const coords = await geocodeLocation(locationName);

  if (!coords) {
    console.log('[Delivery] Could not geocode location:', locationName);
    return null;
  }

  const straightLineDistance = haversineDistance(
    KISUMU_CENTER.lat,
    KISUMU_CENTER.lon,
    coords.lat,
    coords.lon
  );

  const roadDistance = Math.round(straightLineDistance * ROAD_MULTIPLIER);
  const zone = getZone(roadDistance);
  const fee = calculateFee(roadDistance);

  const quote: DeliveryQuote = {
    locationName,
    distanceKm: roadDistance,
    fee,
    zone,
  };

  if (zone === 'far') {
    quote.minimumOrderRequired = 5000;
  }

  console.log(
    `[Delivery] Quote for "${locationName}": ${roadDistance}km, zone=${zone}, fee=KES ${fee}`
  );

  return quote;
}

/**
 * Get delivery quote from GPS coordinates (WhatsApp location pin)
 */
export function getDeliveryQuoteFromCoords(
  lat: number,
  lon: number,
  locationLabel?: string
): DeliveryQuote {
  const straightLineDistance = haversineDistance(
    KISUMU_CENTER.lat,
    KISUMU_CENTER.lon,
    lat,
    lon
  );

  const roadDistance = Math.round(straightLineDistance * ROAD_MULTIPLIER);
  const zone = getZone(roadDistance);
  const fee = calculateFee(roadDistance);

  const quote: DeliveryQuote = {
    locationName: locationLabel || `GPS (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
    distanceKm: roadDistance,
    fee,
    zone,
  };

  if (zone === 'far') {
    quote.minimumOrderRequired = 5000;
  }

  console.log(
    `[Delivery] Quote from GPS [${lat}, ${lon}]: ${roadDistance}km, zone=${zone}, fee=KES ${fee}`
  );

  return quote;
}
