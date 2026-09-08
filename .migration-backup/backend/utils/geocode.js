// utils/geocode.js
export async function getLatLngFromAddress(address) {
  if (!address) return null;

  try {
    // Nominatim API request
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`,
      {
        headers: {
          "User-Agent": "putko-app/1.0 (your-email@example.com)", // 🔑 Required by Nominatim policy
        },
      }
    );

    if (!response.ok) {
      console.error(`❌ Geocode fetch failed: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.length > 0) {
      const { lat, lon } = data[0];
      return {
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
      };
    } else {
      console.warn(`⚠️ No results for address: ${address}`);
      return null;
    }
  } catch (error) {
    console.error("❌ Error in geocoding:", error);
    return null;
  }
}

/**
 * Helper with delay to respect Nominatim rate limit
 * (1 request per second recommended)
 */
export async function geocodeWithDelay(address, delay = 1200) {
  const coords = await getLatLngFromAddress(address);
  await new Promise((resolve) => setTimeout(resolve, delay)); // ⏱️ throttle requests
  return coords;
}
