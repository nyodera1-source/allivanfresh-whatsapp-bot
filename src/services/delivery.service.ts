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

export interface DeliveryQuote {
  locationName: string;
  distanceKm: number; // road-adjusted distance
  fee: number; // KES
  zone: 'town' | 'nearby' | 'far';
  minimumOrderRequired?: number; // only for 'far' zone
}

/**
 * Geocode a location name to coordinates using Nominatim
 */
async function geocodeLocation(
  locationName: string
): Promise<{ lat: number; lon: number } | null> {
  try {
    // Search with Kisumu context for better results
    const query = `${locationName}, Kisumu, Kenya`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ke`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AllivanFresh-WhatsApp-Bot/1.0',
      },
    });

    if (!response.ok) {
      console.error('[Delivery] Nominatim API error:', response.status);
      return null;
    }

    const results = (await response.json()) as Array<{ lat: string; lon: string }>;

    if (results.length === 0) {
      // Try without Kisumu context for broader search
      const broadUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName + ', Kenya')}&format=json&limit=1&countrycodes=ke`;
      const broadResponse = await fetch(broadUrl, {
        headers: {
          'User-Agent': 'AllivanFresh-WhatsApp-Bot/1.0',
        },
      });

      if (!broadResponse.ok) return null;

      const broadResults = (await broadResponse.json()) as Array<{ lat: string; lon: string }>;
      if (broadResults.length === 0) return null;

      return {
        lat: parseFloat(broadResults[0].lat),
        lon: parseFloat(broadResults[0].lon),
      };
    }

    return {
      lat: parseFloat(results[0].lat),
      lon: parseFloat(results[0].lon),
    };
  } catch (error: any) {
    console.error('[Delivery] Geocoding error:', error.message);
    return null;
  }
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
