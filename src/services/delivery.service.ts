/**
 * Delivery service - calculates distance and delivery fees
 * Uses OpenStreetMap Nominatim (free, no API key) for geocoding
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
 * Get delivery quote for a location
 */
export async function getDeliveryQuote(
  locationName: string
): Promise<DeliveryQuote | null> {
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
