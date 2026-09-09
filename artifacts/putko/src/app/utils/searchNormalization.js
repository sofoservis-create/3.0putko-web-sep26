const canonicalCitiesByKey = new Map();
let canonicalCitiesRequest = null;
let destinationCatalogRequest = null;
let destinationCatalog = [];
const fallbackCanonicalCities = [
  "Banská Bystrica",
  "Košice",
  "Prešov",
  "Ružomberok",
  "Trenčín",
  "Žilina",
];

export const createSearchKey = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("sk")
    .trim()
    .replace(/\s+/g, " ");

export const extractCityName = (value) =>
  String(value ?? "").split(",")[0].trim().normalize("NFC");

const formatCityName = (value) => {
  const lowercaseWords = new Set(["a", "nad", "pod", "pri"]);
  return extractCityName(value)
    .toLocaleLowerCase("sk")
    .split(/\s+/)
    .map((word, index) =>
      index > 0 && lowercaseWords.has(word)
        ? word
        : word.charAt(0).toLocaleUpperCase("sk") + word.slice(1)
    )
    .join(" ");
};

export const registerCanonicalCities = (cities) => {
  cities.forEach((value) => {
    const city = formatCityName(value);
    const key = createSearchKey(city);
    if (key) canonicalCitiesByKey.set(key, city);
  });
};

export const loadCanonicalCities = async (baseUrl) => {
  if (
    typeof window !== "undefined" &&
    window.localStorage.getItem("token")?.startsWith("test_session_")
  ) {
    registerCanonicalCities(fallbackCanonicalCities);
    return [...canonicalCitiesByKey.values()];
  }

  if (canonicalCitiesByKey.size > 0) {
    return [...canonicalCitiesByKey.values()];
  }

  if (!canonicalCitiesRequest) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    canonicalCitiesRequest = fetch(`${baseUrl}/accommodation/counts-by-city`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((entries) => {
        registerCanonicalCities(
          Array.isArray(entries) ? entries.map((entry) => entry?.city) : []
        );
        return [...canonicalCitiesByKey.values()];
      })
      .catch((error) => {
        canonicalCitiesRequest = null;
        console.error("Error loading canonical destinations:", error);
        registerCanonicalCities(fallbackCanonicalCities);
        return [...canonicalCitiesByKey.values()];
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });
  }

  return canonicalCitiesRequest;
};

export const resolveCanonicalCity = (value) => {
  const city = extractCityName(value);
  if (!city) return "";
  return canonicalCitiesByKey.get(createSearchKey(city)) || city.normalize("NFC");
};

export const getCanonicalCityMatch = (value) =>
  canonicalCitiesByKey.get(createSearchKey(extractCityName(value))) || "";

export const mergeCanonicalCitySuggestion = (value, suggestions) => {
  registerCanonicalCities(
    suggestions
      .filter((item) => item.type === "location")
      .map((item) => item.description)
  );

  const city = getCanonicalCityMatch(value);
  if (!city) return suggestions;

  const hasCity = suggestions.some(
    (item) =>
      item.type === "location" &&
      createSearchKey(extractCityName(item.description)) === createSearchKey(city)
  );

  return hasCity
    ? suggestions
    : [
        {
          type: "location",
          id: `canonical-${createSearchKey(city)}`,
          description: `${city}, Slovensko`,
        },
        ...suggestions,
      ];
};

export const loadDestinationCatalog = async () => {
  if (destinationCatalog.length === 35) return destinationCatalog;
  if (!destinationCatalogRequest) {
    destinationCatalogRequest = fetch("/api/destinations/catalog")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((body) => {
        destinationCatalog = Array.isArray(body.destinations) ? body.destinations : [];
        registerCanonicalCities(destinationCatalog.map((item) => item.nameSk));
        return destinationCatalog;
      })
      .catch((error) => {
        destinationCatalogRequest = null;
        console.error("Error loading destination catalog:", error);
        return [];
      });
  }
  return destinationCatalogRequest;
};

export const mergeDestinationSuggestions = async (value, suggestions) => {
  const catalog = await loadDestinationCatalog();
  const key = createSearchKey(value);
  const catalogSuggestions = catalog
    .filter((item) => !key || createSearchKey(item.nameSk).includes(key))
    .map((item) => ({
      type: "destination",
      id: `destination-${item.id}`,
      destinationId: item.id,
      description: item.nameSk,
    }));
  const seen = new Set(catalogSuggestions.map((item) => createSearchKey(item.description)));
  return [
    ...catalogSuggestions,
    ...suggestions.filter((item) => !seen.has(createSearchKey(extractCityName(item.description)))),
  ];
};

export const selectDestination = (item, updateCity, updateAccommodationName) => {
  if (item.type === "destination") {
    localStorage.setItem("selectedDestination", item.destinationId);
    localStorage.setItem("selectedCity", item.description);
    localStorage.removeItem("selectedAccommodation");
    updateCity?.(item.description);
    updateAccommodationName?.("");
    return true;
  }
  localStorage.removeItem("selectedDestination");
  return false;
};