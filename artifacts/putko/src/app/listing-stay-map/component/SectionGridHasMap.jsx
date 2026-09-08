"use client";

import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { GoogleMap, useJsApiLoader, OverlayView } from "@react-google-maps/api";
import ButtonClose from "../../Shared/ButtonClose";
import Pagination from "../../Shared/Pagination";
import useFetchData from "../../hooks/useFetchData";
import { FormContext } from "../../FormContext";
import { useSearchParams } from "@/app/components/NextNavigation";
import StayCard3 from "./StayCard3";
import en from "../../locales/en";
import sk from "../../locales/sk";
import SkeletonCard from "@/app/Shared/SkeletonCard";
import { CircleX, Map, MapPin } from "lucide-react";
import StayCardFeatured from "./StayCardFeatured";
import { createSearchKey, resolveCanonicalCity } from "../../utils/searchNormalization";

const containerStyle = {
  width: "100%",
  height: "100%",
};

// Default location (Slovakia)
const defaultLocation = { latitude: 48.669, longitude: 19.699 };
const googleLibraries = ["places"];
const DESKTOP_RESULTS_QUERY = "(min-width: 1536px)";
const COMPACT_ITEMS_PER_PAGE = 6;
const DESKTOP_ITEMS_PER_PAGE = 12;

const ListingMap = ({
  apiKey,
  center,
  pins,
  visiblePinCount,
  renderPin,
  onMapClick,
  onStatusChange,
}) => {
  const mapRef = useRef(null);
  const { isLoaded, loadError } = useJsApiLoader({
    id: "putko-listing-map",
    googleMapsApiKey: apiKey,
    libraries: googleLibraries,
  });

  const fitPins = useCallback(() => {
    if (!mapRef.current || !window.google || pins.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    pins.forEach((pin) => {
      bounds.extend({
        lat: Number(pin.location.latitude),
        lng: Number(pin.location.longitude),
      });
    });

    if (pins.length === 1) {
      mapRef.current.setCenter(bounds.getCenter());
      mapRef.current.setZoom(12);
      return;
    }

    mapRef.current.fitBounds(bounds, 48);
  }, [pins]);

  useEffect(() => {
    if (loadError) {
      onStatusChange("error");
    } else if (isLoaded) {
      onStatusChange("ready");
      fitPins();
    } else {
      onStatusChange("loading");
    }
  }, [fitPins, isLoaded, loadError, onStatusChange]);

  if (!isLoaded || loadError) return null;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={8}
      onLoad={(map) => {
        mapRef.current = map;
        fitPins();
      }}
      onUnmount={() => {
        mapRef.current = null;
      }}
      onClick={onMapClick}
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      {pins.slice(0, visiblePinCount).map(renderPin)}
    </GoogleMap>
  );
};

const SectionGridHasMap = () => {
  const [currentHoverID, setCurrentHoverID] = useState(-1);
  const [showFullMapFixed, setShowFullMapFixed] = useState(false);
  const [stayListings, setStayListings] = useState([]);
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);
  const [showLoading, setShowLoading] = useState(true);
  const [cityReady, setCityReady] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [clickedPriceTagId, setClickedPriceTagId] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia(DESKTOP_RESULTS_QUERY).matches
      ? DESKTOP_ITEMS_PER_PAGE
      : COMPACT_ITEMS_PER_PAGE
  );

  // ===== NEW: Progressive pin loading =====
  const [visiblePinCount, setVisiblePinCount] = useState(0);
  const progressiveLoadRef = useRef(null);
  // =======================================

  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  useEffect(() => {
    const desktopResultsQuery = window.matchMedia(DESKTOP_RESULTS_QUERY);
    const updatePageSize = (event) => {
      setItemsPerPage(
        event.matches ? DESKTOP_ITEMS_PER_PAGE : COMPACT_ITEMS_PER_PAGE
      );
      setCurrentPage(1);
    };

    updatePageSize(desktopResultsQuery);
    desktopResultsQuery.addEventListener("change", updatePageSize);

    return () => {
      desktopResultsQuery.removeEventListener("change", updatePageSize);
    };
  }, []);

  const t = translations[language];

  const { sortOption } = useContext(FormContext);
  const {
    location,
    person,
    city,
    updateCity,
    country,
    drop,
    pricemins,
    pricemaxs,
    Bathroomss,
    rentalform,
    updateacclen,
    acclen,
    Bedss,
    Equipment,
    enddate,
    services,
    BathroomAmenities,
    KitchenDiningAmenities,
    HeatingCoolingAmenities,
    SafetyAmenities,
    WellnessAmenities,
    OutdoorAmenities,
    ParkingFacilities,
    CheckInOptions,
    accommodationName,
    Meals,
    Pets,
    Beds,
    smoking,
    PartyOrganizing,
    startdate,
  } = useContext(FormContext);

  const searchParams = useSearchParams();
  const title = searchParams.get("title");

  const mapApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();
  const hasMapApiKey = Boolean(mapApiKey);
  const [mapStatus, setMapStatus] = useState(
    hasMapApiKey ? "loading" : "unavailable"
  );

  useEffect(() => {
    const prevHandler = window.gm_authFailure;
    window.gm_authFailure = () => {
      setMapStatus("error");
      if (typeof prevHandler === "function") prevHandler();
    };
    return () => {
      window.gm_authFailure = prevHandler;
    };
  }, []);

  useEffect(() => {
    setMapStatus(hasMapApiKey ? "loading" : "unavailable");
  }, [hasMapApiKey]);

  const formattedStartDate = startdate
    ? new Date(startdate).toISOString().split("T")[0]
    : "";
  const formattedEndDate = enddate
    ? new Date(enddate).toISOString().split("T")[0]
    : "";

  // Build one encoded filter set for both requests so map markers always
  // represent the same search criteria as the result cards.
  const commonParameters = new URLSearchParams({
    category: drop || "",
    propertyType: drop || "",
    services: services || "",
    bathroomAmenities: BathroomAmenities || "",
    kitchenDiningAmenities: KitchenDiningAmenities || "",
    heatingCoolingAmenities: HeatingCoolingAmenities || "",
    safetyAmenities: SafetyAmenities || "",
    wellnessAmenities: WellnessAmenities || "",
    outdoorAmenities: OutdoorAmenities || "",
    parkingFacilities: ParkingFacilities || "",
    checkIn: CheckInOptions || "",
    name: accommodationName || "",
    meals: Meals || "",
    pet: Pets || "",
    smoking: smoking || "",
    beds: Beds || "",
    partyOrganizing: PartyOrganizing || "",
    city: city || "",
    location: location || "",
    country: country || "",
    minPrice: pricemins || "",
    maxPrice: pricemaxs || "",
    equipmentAndServices: Equipment || "",
    bedroomCount: Bedss > 0 ? Bedss : "",
    bathroomCount: Bathroomss > 0 ? Bathroomss : "",
    startDate: formattedStartDate,
    endDate: formattedEndDate,
    rentalform: rentalform || "",
    person: person > 0 ? person : "",
  }).toString();

  const paginatedParams = `${commonParameters}&page=${currentPage}&limit=${itemsPerPage}&sortOption=${sortOption || ""}`;
  const mapParams = `${commonParameters}&mapOnly=true`;

  useEffect(() => {
    setCurrentPage(1);
  }, [commonParameters, sortOption]);

  useEffect(() => {
    if (title) {
      updateCity(resolveCanonicalCity(title));
      setCityReady(true);
    } else {
      setCityReady(true);
    }
  }, [title, updateCity]);

  const { data: searchResponse, loading, error } = useFetchData(
    cityReady
      ? `${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/accommodations/searching?${paginatedParams}`
      : null
  );

  const { data: pinsResponse } = useFetchData(
    cityReady
      ? `${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/accommodations/searching?${mapParams}`
      : null
  );

  const [totalPages, setTotalPages] = useState(0);
  const [mapPins, setMapPins] = useState([]);

  // ===== Progressive pin loading logic =====
  useEffect(() => {
    if (pinsResponse && pinsResponse.accommodations) {
      const validPins = pinsResponse.accommodations.filter(
        (acc) =>
          isValidLatitude(acc?.location?.latitude) &&
          isValidLongitude(acc?.location?.longitude)
      );
      setMapPins(validPins);

      // 1. Instantly show first 40
      const firstBatch = Math.min(40, validPins.length);
      setVisiblePinCount(firstBatch);

      // Clear any previous progressive loading
      if (progressiveLoadRef.current) {
        clearInterval(progressiveLoadRef.current);
      }

      // 2. Load remaining pins gradually
      if (validPins.length > 40) {
        progressiveLoadRef.current = setInterval(() => {
          setVisiblePinCount((prev) => {
            const next = Math.min(prev + 15, validPins.length); // add 15 at a time
            if (next >= validPins.length) {
              clearInterval(progressiveLoadRef.current);
            }
            return next;
          });
        }, 60); // every 60ms
      }
    }

    return () => {
      if (progressiveLoadRef.current) {
        clearInterval(progressiveLoadRef.current);
      }
    };
  }, [pinsResponse]);
  // ========================================

  useEffect(() => {
    if (
      selectedAccommodation &&
      !mapPins.some((pin) => pin._id === selectedAccommodation._id)
    ) {
      setSelectedAccommodation(null);
      setClickedPriceTagId(null);
    }
  }, [mapPins, selectedAccommodation]);

  useEffect(() => {
    if (searchResponse) {
      setShowLoading(true);

      const accommodationData = searchResponse.accommodations || [];
      const totalAvailable = searchResponse.totalCount || 0;
      setTotalPages(searchResponse.totalPages || 0);

      let sortedListings = Array.isArray(accommodationData)
        ? accommodationData
        : [];

      // Facebook Search Tracking
      const guestCount = Number(person) || 0;

      if (window.fbq) {
        window.fbq("track", "Search", {
          search_string: city || "",
          content_category: "Stay",
          checkin_date: formattedStartDate,
          checkout_date: formattedEndDate,
          num_guests: guestCount,
        });
      }

      const userPayload = {
        email: localStorage.getItem("userEmail") || "",
        phone: localStorage.getItem("userPhone") || "",
        fbp: document.cookie
          .split("; ")
          .find((row) => row.startsWith("_fbp="))
          ?.split("=")[1],
        fbc: document.cookie
          .split("; ")
          .find((row) => row.startsWith("_fbc="))
          ?.split("=")[1],
      };

      fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/facebook-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "Search",
          eventData: {
            search_string: city || "",
            city: city || "",
            checkin_date: formattedStartDate,
            checkout_date: formattedEndDate,
            num_items: guestCount,
          },
          userPayload,
        }),
      }).catch((err) => console.error("Error sending Search CAPI:", err));

      const validListings = sortedListings.filter(
        (acc) =>
          isValidLatitude(acc?.location?.latitude) &&
          isValidLongitude(acc?.location?.longitude)
      );

      setStayListings(validListings);
      updateacclen(totalAvailable);
      const timer = setTimeout(() => setShowLoading(false), 0);
      return () => clearTimeout(timer);
    }
  }, [searchResponse]);

  useEffect(() => {
    if (!loading && stayListings.length === 0) {
      updateacclen(0);
    }
  }, [loading, stayListings]);

  const handlePageChange = (page) => {
    setCurrentPage(page);

    const section = document.getElementById("listing-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const paginatedListings = stayListings;

  // Helper functions
  const parseCoordinate = (value) => {
    if (value === null || value === undefined || value === "") return NaN;
    const num = typeof value === "string" ? parseFloat(value) : Number(value);
    return Number.isFinite(num) ? num : NaN;
  };

  const isValidLatitude = (lat) => {
    const num = parseCoordinate(lat);
    return Number.isFinite(num) && num >= -90 && num <= 90;
  };

  const isValidLongitude = (lng) => {
    const num = parseCoordinate(lng);
    return Number.isFinite(num) && num >= -180 && num <= 180;
  };

  const isCoordinateValid = (coord) => {
    return (
      coord !== null &&
      coord !== undefined &&
      coord !== "" &&
      !isNaN(coord) &&
      Number.isFinite(Number(coord))
    );
  };

  const createSafePosition = (lat, lng) => {
    const safeLat =
      isCoordinateValid(lat) && isValidLatitude(lat)
        ? Number(lat)
        : defaultLocation.latitude;
    const safeLng =
      isCoordinateValid(lng) && isValidLongitude(lng)
        ? Number(lng)
        : defaultLocation.longitude;

    return {
      lat: Number(safeLat),
      lng: Number(safeLng),
    };
  };

  const getMapCenter = () => {
    if (mapPins && mapPins.length > 0) {
      return createSafePosition(
        mapPins[0].location.latitude,
        mapPins[0].location.longitude
      );
    }

    if (stayListings && stayListings.length > 0) {
      return createSafePosition(
        stayListings[0].location.latitude,
        stayListings[0].location.longitude
      );
    }

    return createSafePosition(
      defaultLocation.latitude,
      defaultLocation.longitude
    );
  };

  const safeSelectedLocation = getMapCenter();

  const handlePriceTagClick = (e, item) => {
    e.stopPropagation();
    setSelectedAccommodation(item);
    setClickedPriceTagId(item._id);
  };

  const handleMapClick = () => {
    setSelectedAccommodation(null);
    setClickedPriceTagId(null);
  };

  const handleCloseSelectedAccommodation = () => {
    setSelectedAccommodation(null);
    setClickedPriceTagId(null);
  };

  useEffect(() => {
    if (!showFullMapFixed) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setShowFullMapFixed(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [showFullMapFixed]);

  const suggestNearbyAreas = (searchTerm) => {
    const nearbyMap = {
      košice: ["Prešov", "Trebišov", "Michalovce"],
      bratislava: ["Trnava", "Nitra", "Senec"],
      poprad: ["Liptovský Mikuláš", "Spišská Nová Ves", "Tatranská Lomnica"],
      žilina: ["Martin", "Ružomberok", "Bytča"],
    };

    if (!searchTerm) return ["Košice", "Prešov", "Bratislava"];

    const normalized = createSearchKey(searchTerm);
    for (const [city, nearby] of Object.entries(nearbyMap)) {
      if (normalized.includes(createSearchKey(city))) return nearby;
    }

    return ["Košice", "Prešov", "Bratislava"];
  };

  const renderPriceTag = (item, index) => {
    if (
      !isCoordinateValid(item?.location?.latitude) ||
      !isCoordinateValid(item?.location?.longitude) ||
      !isValidLatitude(item?.location?.latitude) ||
      !isValidLongitude(item?.location?.longitude)
    ) {
      return null;
    }

    try {
      const safePosition = createSafePosition(
        item.location.latitude,
        item.location.longitude
      );

      const isSelected = selectedAccommodation?._id === item._id;
      const isHovered = currentHoverID === item._id;
      const isClicked = clickedPriceTagId === item._id;

      const priceLabel = item.pricePerNight ? `€${item.pricePerNight}` : null;
      if (!priceLabel) return null;

      return (
        <OverlayView
          key={item._id}
          position={safePosition}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div
            onClick={(e) => handlePriceTagClick(e, item)}
            onMouseEnter={() => setCurrentHoverID(item._id)}
            onMouseLeave={() => setCurrentHoverID(-1)}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              backgroundColor: isClicked ? "#1A3A2E" : "white",
              borderRadius: "999px",
              padding: "5px 10px",
              fontSize: "12px",
              fontWeight: "700",
              color: isClicked ? "white" : "#1A3A2E",
              boxShadow: isClicked
                ? "0 4px 12px rgba(26,58,46,0.35)"
                : "0 2px 6px rgba(0,0,0,0.15)",
              cursor: "pointer",
              transform: `translate(-50%, -50%) scale(${
                isSelected || isHovered ? 1.1 : 1
              })`,
              transition: "all 0.15s ease",
              border: isClicked ? "2px solid #1A3A2E" : "1.5px solid #e5e5e5",
              minWidth: "52px",
              justifyContent: "center",
              whiteSpace: "nowrap",
              letterSpacing: "0.01em",
            }}
          >
            {priceLabel}
          </div>
        </OverlayView>
      );
    } catch (error) {
      return null;
    }
  };

  const displayStays = stayListings || [];

  return (
    <div>
      <div className="relative flex min-h-screen">
        <div className="min-h-screen w-full xl:w-[60%] 2xl:w-[60%] max-w-[1940px] flex-shrink-0 px-4 pt-3 md:px-6 md:pt-4 lg:px-8 lg:pt-5 xl:pl-10 xl:pr-10">
          {/* Results context strip */}
          {displayStays.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-inter sm:mb-5 lg:mb-6">
              <span className="text-sm font-semibold text-[#2C8360]">
                {acclen || displayStays.length}
              </span>
              <span className="text-sm text-neutral-500">
                {language === "sk"
                  ? "overených ubytovaní"
                  : "verified properties"}
              </span>
              <span className="text-neutral-300 mx-1">·</span>
              <span className="flex items-center gap-1 text-sm text-neutral-500">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="flex-shrink-0"
                >
                  <path
                    d="M4 12L9 17L20 6"
                    stroke="#2C8360"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {language === "sk"
                  ? "Všetky ceny sú finálne – bez poplatkov"
                  : "All prices are final – no fees"}
              </span>
            </div>
          )}

          <div
            id="listing-section"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-x-5 2xl:gap-x-6 gap-y-8 pb-32 md:pb-12"
          >
            {loading ? (
              Array.from({ length: itemsPerPage }).map((_, i) => (
                <SkeletonCard key={i} />
              ))
            ) : stayListings && stayListings.length > 0 ? (
              paginatedListings.map((item) => (
                <div key={item._id}>
                  <StayCardFeatured data={item} />
                </div>
              ))
            ) : (
              <div className="mt-12 col-span-full flex flex-col items-center justify-center text-center px-6 text-neutral-700">
                <p className="text-xl font-semibold mb-2">
                  {language === "sk"
                    ? `Žiaľ, momentálne nemáme takéto ubytovanie v oblasti „${
                        city || "Slovensko"
                      }“.`
                    : `Unfortunately, we currently don’t have this type of accommodation in “${
                        city || "Slovakia"
                      }”.`}
                </p>
                <p className="text-sm text-neutral-500 mb-6 max-w-md">
                  {language === "sk"
                    ? "Ale nezúfajte – možno si zamilujete tieto blízke miesta:"
                    : "Don’t worry — you might love one of these nearby places instead:"}
                </p>

                <div className="flex flex-wrap justify-center gap-2">
                  {suggestNearbyAreas(city).map((area) => (
                    <button
                      key={area}
                      onClick={() => updateCity(resolveCanonicalCity(area))}
                      className="px-4 py-2 rounded-full border border-neutral-300 hover:bg-neutral-100 text-sm font-medium transition"
                    >
                      {area}
                    </button>
                  ))}
                </div>

                <p className="text-xs text-neutral-400 mt-6">
                  {language === "sk"
                    ? "Každé miesto má svoj príbeh – objavte ho!"
                    : "Every place has a story — go explore it!"}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-center mt-16">
            <Pagination
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={handlePageChange}
            />
          </div>
        </div>

        {!showFullMapFixed && (
          <button
            type="button"
            aria-label={t.Showmap}
            className="fixed z-40 flex items-center justify-center px-6 py-3 space-x-2 text-sm font-semibold text-white transform -translate-x-1/2 rounded-full shadow-xl cursor-pointer xl:hidden bottom-24 md:bottom-10 left-1/2 bg-neutral-900 hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2C8360] focus:ring-offset-2 active:scale-95"
            onClick={() => setShowFullMapFixed(true)}
            style={{ minHeight: "48px" }}
          >
            <Map size={18} className="text-white" />
            <span>{language === "sk" ? "Mapa" : "Map"}</span>
          </button>
        )}
        <div
          className={`xl:flex-1 xl:static xl:block xl:pr-10 ${
            showFullMapFixed ? "fixed inset-0 z-50" : "hidden"
          }`}
        >
          {showFullMapFixed && (
            <ButtonClose
              onClick={() => setShowFullMapFixed(false)}
              className="absolute z-50 w-10 h-10 text-black bg-white shadow-lg left-3 top-3 rounded-xl xl:bg-white"
            />
          )}

          <div className="fixed xl:sticky top-0 xl:top-[88px] left-0 w-full h-[100dvh] xl:h-[calc(100vh-88px)] rounded-md overflow-hidden bg-white">
            <div className="relative w-full h-full rounded-md overflow-hidden">
              {mapStatus !== "ready" && (
                <div className="flex items-center justify-center w-full h-full bg-white rounded-2xl border border-neutral-100 shadow-sm">
                  <div className="flex flex-col items-center gap-3 text-center px-6">
                    <MapPin size={32} className="text-[#4FBE9F]" />
                    {mapStatus === "loading" ? (
                      <>
                        <p className="text-neutral-600 text-sm font-dmsans">
                          {language === "sk" ? "Načítavame mapu" : "Loading map"}
                        </p>
                        <div
                          className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-100"
                          aria-label={language === "sk" ? "Načítavanie" : "Loading"}
                        >
                          <div className="h-full w-1/2 animate-pulse rounded-full bg-[#4FBE9F]" />
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-neutral-500 text-sm font-dmsans">
                          {language === "sk" ? "Mapa nie je dostupná" : "Map unavailable"}
                        </p>
                        <p className="text-neutral-400 text-xs font-inter">
                          {language === "sk"
                            ? "Ubytovanie si môžete prehľadávať v zozname"
                            : "Browse accommodation in the list below"}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {hasMapApiKey && (
                <div style={{ width: "100%", height: "100%" }}>
                  <ListingMap
                    apiKey={mapApiKey}
                    center={safeSelectedLocation}
                    pins={mapPins}
                    visiblePinCount={visiblePinCount}
                    renderPin={renderPriceTag}
                    onMapClick={handleMapClick}
                    onStatusChange={setMapStatus}
                  />
                </div>
              )}
            </div>

            {selectedAccommodation && (
              <div
                className="absolute z-50 p-4 bg-white rounded-lg shadow-xl"
                style={{
                  bottom: "20px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "400px",
                  maxWidth: "90%",
                  height: "auto",
                  overflowY: "auto",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleCloseSelectedAccommodation}
                  className="absolute z-50 text-3xl text-black top-1 right-1 hover:text-black"
                >
                  <CircleX className="w-8 h-8" />
                </button>

                <StayCard3 data={selectedAccommodation} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionGridHasMap;