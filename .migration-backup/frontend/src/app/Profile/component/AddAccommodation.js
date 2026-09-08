import React, { useCallback, useContext } from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleMap, Marker, useLoadScript, Autocomplete } from "@react-google-maps/api";
import { toast } from 'react-toastify';
import uploadImageToCloudinary from "../../utlis/uploadCloudinary.js";
import FormItem from './FormItem.js';
import Label from '../../Shared/Label.js';
// import { MapPinIcon } from 'lucide-react';
// import ButtonSecondary from '../../Shared/Button/ButtonSecondary.js';
import NcInputNumber from '../../Shared/NcInputNumber.js';
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import Select from '../../Shared/Select.js';
import Input from '../../Shared/Input.js';
import Checkbox from '../../Shared/Checkbox.js';
import Textarea from '../../Shared/Textarea.js';
// import Heading from '../../Shared/Heading.js';
import useFetchData from '../../hooks/useFetchData.js';
import Loading from '../../components/Loader/Loading.js';
import { FormContext } from '../../FormContext.js';
import "react-phone-input-2/lib/style.css";
import PhoneInput from 'react-phone-input-2';
import en from '@/app/locales/en.js';
import sk from '@/app/locales/sk.js';
import ClipLoader from "react-spinners/ClipLoader";
import Header from '@/app/components/Header/Header.js';
import { format } from "date-fns";
import { ReactSortable } from 'react-sortablejs';
import ReactInputMask from 'react-input-mask';
import { CircleX, Plus, Copy, Link2, Save, RotateCcw, X } from 'lucide-react';
import ButtonPrimary from '@/app/Shared/ButtonPrimary.js';
import { sanitizeFlexiblePrices, validateFlexiblePrices } from '../../utlis/flexiblePricing.js';
import { POLICY_CHOICES, validateTiers } from '../../utlis/cancellationPolicyOptions.js';
import CalendarSyncRows from './CalendarSyncRows.js';
import PayoutAccountSection from './PayoutAccountSection.js';
import {
  makeRow,
  rowsForAccommodation,
  filledRows,
  validateRows,
  saveFeeds,
  syncAllFeeds,
} from '../../utlis/calendarSync.js';
import {
  saveDraft,
  loadDraft,
  clearDraft,
  describeSavedAt,
} from '../../utlis/accommodationDraft.js';

const libraries = ["places"];

/** A blank seasonal price period with a single open-ended tier. */
const makeEmptyFlexiblePeriod = () => ({
  name: "",
  start: "",
  end: "",
  note: "",
  tiers: [{ minNights: 1, maxNights: "", price: "" }],
});

/**
 * Map saved flexiblePrices onto the shape the form inputs expect:
 * dates as yyyy-MM-dd strings and an unbounded maxNights as "".
 */
const toFlexiblePriceForm = (periods) => {
  if (!Array.isArray(periods) || periods.length === 0) return [];

  const toInputDate = (value) =>
    value ? new Date(value).toISOString().split('T')[0] : '';

  return periods.map((period) => ({
    name: period?.name || "",
    start: toInputDate(period?.start),
    end: toInputDate(period?.end),
    note: period?.note || "",
    tiers:
      Array.isArray(period?.tiers) && period.tiers.length > 0
        ? period.tiers.map((tier) => ({
            minNights: tier?.minNights ?? 1,
            maxNights:
              tier?.maxNights === null || tier?.maxNights === undefined
                ? ""
                : tier.maxNights,
            price: tier?.price ?? "",
          }))
        : [{ minNights: 1, maxNights: "", price: "" }],
  }));
};

const AddAccommodation = ({ accommodationId }) => {

  const containerStyle = {
    width: "100%",
    height: "600px",
  };

  console.log("accommodationId", accommodationId)
  const { data: accommodationData, loading, error } = useFetchData(`${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/${accommodationId}`);
  console.log("accommodationData", accommodationData);

  const isEditMode = Boolean(accommodationId);
  const [excludedDates, setExcludedDates] = useState([]);
  const formatTime = (time) => {
    if (!time) return ""; // Default to empty
    if (typeof time === "string" && time.includes(":")) return time; // Already formatted
    if (typeof time === "string" && time.includes("T")) {
      // Convert ISO date string (e.g., "2024-02-04T14:30:00.000Z") to "HH:mm"
      return new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    return time;
  };

  const translations = { en, sk }
  const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
  const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"

  // Update language state when `lang` changes in FormContext
  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  useEffect(() => {
    if (accommodationData) {
      if (accommodationData && accommodationData.propertyType) {
        setPropertyType(accommodationData.propertyType);
      } else {
        setPropertyType({ en: "Nature House", sk: "Prírodný dom" });
      }
      setName(accommodationData.name || "");
      setRoomType(accommodationData.rentalform || { en: "Entire place", sk: "Celé miesto" });
      setState(accommodationData.locationDetails?.state || "");
      setRoomNumber(accommodationData.locationDetails?.roomNumber || "");
      setAcreage(accommodationData.acreage || "100");
      setDescription(accommodationData.description || "");
      setSpecialNote(accommodationData.specialNote || "");
      setCancellationPolicy(accommodationData.cancellationPolicy || "");
      setCancellationPolicyType(accommodationData.cancellationPolicyType || "standard");
      if (accommodationData.customPolicyTiers?.length) {
        setCustomPolicyTiers(accommodationData.customPolicyTiers);
      }
      setPerson(accommodationData.person || 1);
      setBedroom(accommodationData.bedroom || 1);
      setBeds(accommodationData.beds || 1);
      setSingleBed(accommodationData.singlebed || 1);
      setDoubleBed(accommodationData.doublebed || 1);
      setBathroom(accommodationData.bathroom || 1);
      setKitchen(accommodationData.kitchen || 1);
      setWCs(accommodationData.WCs || 1);
      setSocialRoom(accommodationData.SocialRoom || 0);
      setCommonRoom(accommodationData.CommonRoom || 0);
      setLivingRoom(accommodationData.LivingRoom || 0);
      setSofa(accommodationData.Sofa || 0);
      setDiscount(accommodationData.discount || "");
      setStreet(accommodationData.locationDetails?.streetAndNumber || '');
      setCity(accommodationData.locationDetails?.city || '');
      setZipCode(accommodationData.locationDetails?.zipCode || '');
      setPriceRangeStartDate(accommodationData.specialPrice?.start ? new Date(accommodationData.specialPrice?.start).toISOString().split('T')[0] : '');
      setPriceRangeEndDate(accommodationData.specialPrice?.end ? new Date(accommodationData.specialPrice?.end).toISOString().split('T')[0] : '');
      setSpecialOfferName(accommodationData.specialPrice?.name || "");
      setPriceRangePrice(accommodationData.specialPrice?.price || '');
      setFlexiblePrices(toFlexiblePriceForm(accommodationData.flexiblePrices));
      setArrivalFrom(accommodationData.arrivalFrom || "");
      setArrivalTo(accommodationData.arrivalTo || "");
      setDepartureFrom(accommodationData.departureFrom || "");
      setDepartureTo(accommodationData.departureTo || "");
      setPhoneNumber(accommodationData.phoneNumber || "");
      setCountry(accommodationData.locationDetails?.country || 'Slovakia');
      setAddress(accommodationData.address || '');
      setLatitude(accommodationData.latitude || 48.669026);
      setLongitude(accommodationData.longitude || 19.699024);
      setVirtualTourUrl(accommodationData.virtualTourUrl || '');
      // setGeneralAmenities(accommodationData.generalAmenities || []);
      setServices(accommodationData.services || { en: [], sk: [] });
      setBathroomAmenities(accommodationData.bathroomAmenities || { en: [], sk: [] });
      setKitchenDiningAmenities(accommodationData.kitchenDiningAmenities || { en: [], sk: [] });
      setHeatingCoolingAmenities(accommodationData.heatingCoolingAmenities || { en: [], sk: [] });
      setSafetyAmenities(accommodationData.safetyAmenities || { en: [], sk: [] });
      setWellnessAmenities(accommodationData.wellnessAmenities || { en: [], sk: [] });
      setOutdoorAmenities(accommodationData.outdoorAmenities || { en: [], sk: [] });
      setParkingFacilities(accommodationData.parkingFacilities || { en: [], sk: [] });
      setCheckIn(accommodationData.checkIn || { en: [], sk: [] });
      setMeals(accommodationData.meals || { en: [], sk: [] });
      setPet(accommodationData.pet || "");
      setPetFeePerNight(accommodationData.petFeePerNight ?? "");
      setPartyOrganizing(accommodationData.partyOrganizing || "");
      setSmoking(accommodationData.smoking || "");
      setTags(accommodationData.tags || []);
      setPriceRanges(accommodationData.priceRange || []);
      seturl(accommodationData.url || '');
      setPricePerNight(accommodationData.pricePerNight || 89);
      setPricePerPerson(accommodationData.pricePerPerson || "");
      // setFixedPrice(accommodationData.FixedPrice || '');
      // setPriceFriSun(accommodationData.priceFriSun || '');
      setNightMin(accommodationData.nightMin || 1);
      setNightMax(accommodationData.nightMax || 15);
      if (accommodationData?.images?.length > 0) {
        // Set the first image as cover
        setCoverImage(accommodationData.images[0]);

        // Set the rest as remaining images
        setRemainingPreviews(accommodationData.images.slice(1));
      }
      if (accommodationData && accommodationData.excludedDates) {
        setExcludedDates(accommodationData.excludedDates.map(date => new Date(date).toDateString()));
      }
      // Calendars already connected to this listing, so editing shows what is
      // there rather than an empty row.
      setCalendarFeedRows(rowsForAccommodation(accommodationData));
      if (accommodationData.payoutStripeAccountId) {
        setPayoutAccountId(accommodationData.payoutStripeAccountId);
      }
    }
  }, [accommodationData]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Calendar sync (optional) ────────────────────────────────────────────
  // Connecting a calendar here is a convenience, not a requirement: it must
  // never stand between the host and saving the listing. The rows are validated
  // and pushed only AFTER the accommodation itself has been saved, because a
  // listing has no id to attach feeds to until then.
  // Which of the host's connected Stripe accounts THIS listing pays out to.
  // Null means "my default account", which is what a host running one account
  // for everything always means.
  const [payoutAccountId, setPayoutAccountId] = useState(null);
  // The submit handler reads the host out of localStorage when it runs; the
  // payouts section needs it during render, to list this host's accounts.
  const [hostId, setHostId] = useState(null);
  const [calendarFeedRows, setCalendarFeedRows] = useState([makeRow()]);
  const [calendarFeedErrors, setCalendarFeedErrors] = useState({});
  const [calendarFeedResults, setCalendarFeedResults] = useState({});

  // ── Autosave ────────────────────────────────────────────────────────────
  // `restorable` holds a draft found on mount but not yet accepted — the host
  // is asked before their form is overwritten. `draftSavedAt` drives the small
  // "saved" indicator so autosave is visible rather than a silent promise.
  const [restorable, setRestorable] = useState(null);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  // Flipped by the first real edit anywhere in the form. Autosave waits for it
  // so an untouched visit never leaves a draft behind.
  const [formTouched, setFormTouched] = useState(false);
  const draftLoadedRef = useRef(false);

  /**
   * Mark the form as genuinely edited.
   *
   * The <form>'s onChange covers every text input, select and checkbox, because
   * React events bubble. It does NOT cover interactions that are clicks rather
   * than changes — picking dates in the availability calendar, uploading a
   * photo, adding a tag, adding a calendar row — so those call this directly.
   */
  const markTouched = () => setFormTouched((was) => was || true);

  const [propertyType, setPropertyType] = useState(accommodationData?.propertyType || { en: "Nature House", sk: "Prírodný dom" });
  const [name, setName] = useState(accommodationData.name || "");
  const [autocomplete, setAutocomplete] = useState(null);
  const [roomType, setRoomType] = useState(accommodationData.rentalform || { en: "Entire place", sk: "Celé miesto" });
  const [state, setState] = useState(accommodationData.locationDetails?.state || "");
  const [roomNumber, setRoomNumber] = useState(accommodationData.locationDetails?.roomNumber || "");
  const [acreage, setAcreage] = useState(accommodationData.acreage || "100");
  const [description, setDescription] = useState(accommodationData.description || "");
  const [specialNote, setSpecialNote] = useState(accommodationData.specialNote || "");
  const [cancellationPolicy, setCancellationPolicy] = useState(accommodationData.cancellationPolicy || "");
  // The machine-readable policy that actually decides refunds. `standard` is the
  // server's fallback, so defaulting to it here keeps new and existing listings
  // behaving identically until the host chooses otherwise.
  const [cancellationPolicyType, setCancellationPolicyType] = useState(
    accommodationData.cancellationPolicyType || "standard"
  );
  const [customPolicyTiers, setCustomPolicyTiers] = useState(
    accommodationData.customPolicyTiers?.length
      ? accommodationData.customPolicyTiers
      : [{ hoursBefore: 168, refundPercent: 100 }, { hoursBefore: 0, refundPercent: 0 }]
  );
  const [policyErrors, setPolicyErrors] = useState([]);

  /** Edit one tier. The final {0,0} row is fixed and cannot be edited away. */
  const updateTier = (index, field, value) => {
    setCustomPolicyTiers((prev) =>
      prev.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier))
    );
  };

  /**
   * Insert a tier above the mandatory final {0, 0} row, so the "no-show earns
   * nothing" rule cannot be broken by adding rows.
   */
  const addTier = () => {
    setCustomPolicyTiers((prev) => {
      if (prev.length >= 3) return prev;
      const head = prev.slice(0, -1);
      return [...head, { hoursBefore: 48, refundPercent: 50 }, { hoursBefore: 0, refundPercent: 0 }];
    });
  };
  const [person, setPerson] = useState(accommodationData.person || 1);
  const [bedroom, setBedroom] = useState(accommodationData.bedroom || 1);
  const [beds, setBeds] = useState(accommodationData.beds || 1);
  const [singlebed, setSingleBed] = useState(accommodationData.singlebed || 1);
  const [doublebed, setDoubleBed] = useState(accommodationData.doublebed || 1);
  const [bathroom, setBathroom] = useState(accommodationData.bathroom || 1);
  const [kitchen, setKitchen] = useState(accommodationData.kitchen || 1);
  const [WCs, setWCs] = useState(accommodationData.WCs || 1);
  const [SocialRoom, setSocialRoom] = useState(accommodationData.SocialRoom || 0);
  const [CommonRoom, setCommonRoom] = useState(accommodationData.CommonRoom || 0);
  const [LivingRoom, setLivingRoom] = useState(accommodationData.LivingRoom || 0);
  const [specialOfferName, setSpecialOfferName] = useState(accommodationData.specialPrice?.name || "");
  const [pricePerPerson, setPricePerPerson] = useState(accommodationData.pricePerPerson || "");
  const [Sofa, setSofa] = useState(accommodationData.Sofa || 0);
  const [discount, setDiscount] = useState(accommodationData.discount || "");
  const [street, setStreet] = useState(accommodationData.locationDetails?.streetAndNumber || '');
  const [phoneNumber, setPhoneNumber] = useState(accommodationData.phoneNumber || "");
  const [city, setCity] = useState(accommodationData.locationDetails?.city || '');
  const [zipCode, setZipCode] = useState(accommodationData.locationDetails?.zipCode || '');
  const [country, setCountry] = useState(accommodationData.country || 'Slovakia');
  const [CountryCode, setCountryCode] = useState('SK');
  const [address, setAddress] = useState(accommodationData.address || '');
  const [latitude, setLatitude] = useState(accommodationData.longitude || 48.669026);
  const [longitude, setLongitude] = useState(accommodationData.longitude || 19.699024);
  const [cityAutocomplete, setCityAutocomplete] = useState(null);
  const [stateAutocomplete, setStateAutocomplete] = useState(null);
  const [arrivalFrom, setArrivalFrom] = useState(accommodationData.arrivalFrom || "14:00");
  const [arrivalTo, setArrivalTo] = useState(accommodationData.arrivalTo || "18:00");
  const [departureFrom, setDepartureFrom] = useState(accommodationData.departureFrom || "08:00");
  const [departureTo, setDepartureTo] = useState(accommodationData.departureTo || "11:00");
  const [url, seturl] = useState(accommodationData.url || '');
  const [virtualTourUrl, setVirtualTourUrl] = useState(accommodationData.virtualTourUrl || '');
  const [errorMessage, setErrorMessage] = useState("");
  const [services, setServices] = useState({
    en: accommodationData?.services?.en || [],
    sk: accommodationData?.services?.sk || []
  });
  const [bathroomAmenities, setBathroomAmenities] = useState({
    en: accommodationData?.bathroomAmenities?.en || [],
    sk: accommodationData?.bathroomAmenities?.sk || []
  });
  const [kitchenDiningAmenities, setKitchenDiningAmenities] = useState({
    en: accommodationData?.kitchenDiningAmenities?.en || [],
    sk: accommodationData?.kitchenDiningAmenities?.sk || []
  });
  const [heatingCoolingAmenities, setHeatingCoolingAmenities] = useState({
    en: accommodationData?.heatingCoolingAmenities?.en || [],
    sk: accommodationData?.heatingCoolingAmenities?.sk || []
  });
  const [safetyAmenities, setSafetyAmenities] = useState({
    en: accommodationData?.safetyAmenities?.en || [],
    sk: accommodationData?.safetyAmenities?.sk || []
  });
  const [wellnessAmenities, setWellnessAmenities] = useState({
    en: accommodationData?.wellnessAmenities?.en || [],
    sk: accommodationData?.wellnessAmenities?.sk || []
  });
  const [outdoorAmenities, setOutdoorAmenities] = useState({
    en: accommodationData?.outdoorAmenities?.en || [],
    sk: accommodationData?.outdoorAmenities?.sk || []
  });
  const [parkingFacilities, setParkingFacilities] = useState({
    en: accommodationData?.parkingFacilities?.en || [],
    sk: accommodationData?.parkingFacilities?.sk || []
  });
  const [checkIn, setCheckIn] = useState({
    en: accommodationData?.checkIn?.en || [],
    sk: accommodationData?.checkIn?.sk || []
  });
  const [meals, setMeals] = useState({
    en: accommodationData?.meals?.en || [],
    sk: accommodationData?.meals?.sk || []
  });
  const [pet, setPet] = useState({
    en: accommodationData?.pet?.en || "",
    sk: accommodationData?.pet?.sk || ""
  });
  const [petFeePerNight, setPetFeePerNight] = useState(
    accommodationData?.petFeePerNight ?? ""
  );
  const [partyOrganizing, setPartyOrganizing] = useState({
    en: accommodationData?.partyOrganizing?.en || "",
    sk: accommodationData?.partyOrganizing?.sk || ""
  });
  const [smoking, setSmoking] = useState({
    en: accommodationData?.smoking?.en || "",
    sk: accommodationData?.smoking?.sk || ""
  });
  const [tags, setTags] = useState(accommodationData.tags || [
    "No smoking in common areas",
    "Do not wear shoes/shoes in the house",
    "No cooking in the bedroom"
  ]);
  const [newTag, setNewTag] = useState(accommodationData.newTag || "");
  const [pricePerNight, setPricePerNight] = useState(accommodationData.pricePerNight || "");
  // const [FixedPrice, setFixedPrice] = useState(accommodationData.FixedPrice || '');
  // const [priceFriSun, setPriceFriSun] = useState(accommodationData.priceFriSun || '');
  const [nightMin, setNightMin] = useState(accommodationData.nightMin || 1);
  const [nightMax, setNightMax] = useState(accommodationData.nightMax || 15);
  const [coverImage, setCoverImage] = useState(null); // Store cover image URL
  const [coverPreview, setCoverPreview] = useState(null);
  const [remainingImages, setRemainingImages] = useState([]); // Store URLs for additional images
  const [remainingPreviews, setRemainingPreviews] = useState([]); // Previews for additional images
  const [errors, setErrors] = useState({}); // To store errors for each field
  const { selectedpage, updateSelectedpage } = useContext(FormContext);
  const [isMobile, setIsMobile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingRemainingImages, setIsUploadingRemainingImages] = useState(false);
  const [priceRangeStartDate, setPriceRangeStartDate] = useState(
    accommodationData.specialPrice?.start ? new Date(accommodationData.specialPrice?.start).toISOString().split('T')[0] : ''
  );

  const [priceRangeEndDate, setPriceRangeEndDate] = useState(
    accommodationData.specialPrice?.end ? new Date(accommodationData.specialPrice?.end).toISOString().split('T')[0] : ''
  );

  const [priceRangePrice, setPriceRangePrice] = useState(accommodationData.specialPrice?.price);
  const [priceRanges, setPriceRanges] = useState([]);

  // Flexible seasonal pricing: a list of periods, each with its own
  // length-of-stay tiers (e.g. Summer 1-3 nights EUR 120, 4-6 EUR 105, 7+ EUR 95).
  const [flexiblePrices, setFlexiblePrices] = useState(
    toFlexiblePriceForm(accommodationData.flexiblePrices)
  );

  /* ── Autosave ──────────────────────────────────────────────────────────
   *
   * One table drives BOTH saving and restoring. Keeping them in a single
   * declaration is the whole point: two separate lists would drift, and a field
   * that is saved but not restored is worse than one that is never saved — the
   * host is told their work was kept and then watches part of it vanish.
   *
   * Transient state is deliberately absent: submit/upload flags, validation
   * errors, Google Autocomplete instances, the viewport flag and the language.
   * Restoring any of those would resurrect a stale error or a dead map handle.
   *
   * Image fields hold Cloudinary URLs of files that are already uploaded, so
   * they are plain strings and safe to keep.
   */
  const draftFields = {
    name: [name, setName],
    propertyType: [propertyType, setPropertyType],
    roomType: [roomType, setRoomType],
    acreage: [acreage, setAcreage],
    description: [description, setDescription],
    specialNote: [specialNote, setSpecialNote],
    cancellationPolicy: [cancellationPolicy, setCancellationPolicy],
    cancellationPolicyType: [cancellationPolicyType, setCancellationPolicyType],
    customPolicyTiers: [customPolicyTiers, setCustomPolicyTiers],

    person: [person, setPerson],
    bedroom: [bedroom, setBedroom],
    beds: [beds, setBeds],
    singlebed: [singlebed, setSingleBed],
    doublebed: [doublebed, setDoubleBed],
    bathroom: [bathroom, setBathroom],
    kitchen: [kitchen, setKitchen],
    WCs: [WCs, setWCs],
    SocialRoom: [SocialRoom, setSocialRoom],
    CommonRoom: [CommonRoom, setCommonRoom],
    LivingRoom: [LivingRoom, setLivingRoom],
    Sofa: [Sofa, setSofa],

    street: [street, setStreet],
    roomNumber: [roomNumber, setRoomNumber],
    city: [city, setCity],
    state: [state, setState],
    zipCode: [zipCode, setZipCode],
    country: [country, setCountry],
    CountryCode: [CountryCode, setCountryCode],
    address: [address, setAddress],
    latitude: [latitude, setLatitude],
    longitude: [longitude, setLongitude],
    phoneNumber: [phoneNumber, setPhoneNumber],

    arrivalFrom: [arrivalFrom, setArrivalFrom],
    arrivalTo: [arrivalTo, setArrivalTo],
    departureFrom: [departureFrom, setDepartureFrom],
    departureTo: [departureTo, setDepartureTo],

    url: [url, seturl],
    virtualTourUrl: [virtualTourUrl, setVirtualTourUrl],

    services: [services, setServices],
    bathroomAmenities: [bathroomAmenities, setBathroomAmenities],
    kitchenDiningAmenities: [kitchenDiningAmenities, setKitchenDiningAmenities],
    heatingCoolingAmenities: [heatingCoolingAmenities, setHeatingCoolingAmenities],
    safetyAmenities: [safetyAmenities, setSafetyAmenities],
    wellnessAmenities: [wellnessAmenities, setWellnessAmenities],
    outdoorAmenities: [outdoorAmenities, setOutdoorAmenities],
    parkingFacilities: [parkingFacilities, setParkingFacilities],

    checkIn: [checkIn, setCheckIn],
    meals: [meals, setMeals],
    pet: [pet, setPet],
    petFeePerNight: [petFeePerNight, setPetFeePerNight],
    partyOrganizing: [partyOrganizing, setPartyOrganizing],
    smoking: [smoking, setSmoking],
    tags: [tags, setTags],

    pricePerNight: [pricePerNight, setPricePerNight],
    pricePerPerson: [pricePerPerson, setPricePerPerson],
    discount: [discount, setDiscount],
    nightMin: [nightMin, setNightMin],
    nightMax: [nightMax, setNightMax],
    flexiblePrices: [flexiblePrices, setFlexiblePrices],
    specialOfferName: [specialOfferName, setSpecialOfferName],
    priceRangeStartDate: [priceRangeStartDate, setPriceRangeStartDate],
    priceRangeEndDate: [priceRangeEndDate, setPriceRangeEndDate],
    priceRangePrice: [priceRangePrice, setPriceRangePrice],

    excludedDates: [excludedDates, setExcludedDates],

    coverImage: [coverImage, setCoverImage],
    coverPreview: [coverPreview, setCoverPreview],
    remainingImages: [remainingImages, setRemainingImages],
    remainingPreviews: [remainingPreviews, setRemainingPreviews],

    calendarFeedRows: [calendarFeedRows, setCalendarFeedRows],
    payoutAccountId: [payoutAccountId, setPayoutAccountId],
  };

  // Serialised once per render and compared as a string, so the save effect
  // fires on real changes rather than on every re-render — object identity
  // changes constantly here, values do not.
  const draftSnapshot = useMemo(
    () =>
      JSON.stringify(
        Object.fromEntries(Object.entries(draftFields).map(([key, [value]]) => [key, value]))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    Object.values(draftFields).map(([value]) => value)
  );

  // Read the logged-in host once. localStorage is not available during SSR, so
  // this cannot be an initialiser.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setHostId(JSON.parse(stored)?._id || null);
    } catch {
      /* a corrupt user blob simply means no payout accounts to offer */
    }
  }, []);

  // Look for a saved draft once, on mount. It is NOT applied automatically:
  // silently overwriting a form the host has already started typing into would
  // itself be data loss. They are asked.
  useEffect(() => {
    if (draftLoadedRef.current) return;
    draftLoadedRef.current = true;

    const found = loadDraft(accommodationId);
    if (found) setRestorable(found);
  }, [accommodationId]);

  // Autosave. Debounced so a fast typist writes to storage a few times a second
  // at worst, not once per keystroke.
  useEffect(() => {
    // `formTouched` is what stops this saving on mount. Without it every visit
    // writes a draft of the untouched form, and the host is greeted next time
    // by an offer to restore work they never did. In edit mode it also avoids
    // racing the async prefill, which would otherwise bank the empty form as a
    // draft before the listing's own data arrives.
    if (!formTouched) return;
    // Nothing to save while the submit that will clear it is in flight, or
    // while a found draft is still waiting for the host to accept or reject it.
    if (isSubmitting || restorable) return;

    const timer = setTimeout(() => {
      const values = JSON.parse(draftSnapshot);
      if (saveDraft(accommodationId, values)) setDraftSavedAt(Date.now());
    }, 800);

    return () => clearTimeout(timer);
  }, [draftSnapshot, accommodationId, isSubmitting, restorable, formTouched]);

  /** Put a saved draft back into the form. */
  const restoreDraft = () => {
    if (!restorable?.values) return;

    Object.entries(draftFields).forEach(([key, [, setValue]]) => {
      if (Object.prototype.hasOwnProperty.call(restorable.values, key)) {
        setValue(restorable.values[key]);
      }
    });

    setRestorable(null);
    toast.success(t.DraftRestored);
  };

  /** Discard it and start clean. */
  const discardDraft = () => {
    clearDraft(accommodationId);
    setRestorable(null);
    setDraftSavedAt(null);
  };

  const handleAddFlexiblePeriod = () => {
    setFlexiblePrices((prev) => [...prev, makeEmptyFlexiblePeriod()]);
  };

  const handleRemoveFlexiblePeriod = (periodIndex) => {
    setFlexiblePrices((prev) => prev.filter((_, i) => i !== periodIndex));
  };

  const handleFlexiblePeriodChange = (periodIndex, field, value) => {
    setFlexiblePrices((prev) =>
      prev.map((period, i) =>
        i === periodIndex ? { ...period, [field]: value } : period
      )
    );
  };

  const handleAddFlexibleTier = (periodIndex) => {
    setFlexiblePrices((prev) =>
      prev.map((period, i) => {
        if (i !== periodIndex) return period;

        // Start the new tier one night after the highest bounded tier so far,
        // so repeated clicks build 1-3, 4-6, 7+ without retyping.
        const lastBounded = [...period.tiers]
          .reverse()
          .find((tier) => tier.maxNights !== "" && tier.maxNights !== null);
        const nextMin = lastBounded ? Number(lastBounded.maxNights) + 1 : 1;

        return {
          ...period,
          tiers: [...period.tiers, { minNights: nextMin, maxNights: "", price: "" }],
        };
      })
    );
  };

  const handleRemoveFlexibleTier = (periodIndex, tierIndex) => {
    setFlexiblePrices((prev) =>
      prev.map((period, i) =>
        i === periodIndex
          ? { ...period, tiers: period.tiers.filter((_, j) => j !== tierIndex) }
          : period
      )
    );
  };

  const handleFlexibleTierChange = (periodIndex, tierIndex, field, value) => {
    setFlexiblePrices((prev) =>
      prev.map((period, i) =>
        i === periodIndex
          ? {
              ...period,
              tiers: period.tiers.map((tier, j) =>
                j === tierIndex ? { ...tier, [field]: value } : tier
              ),
            }
          : period
      )
    );
  };


  // Handle adding new tag
  const handleAddTag = () => {
    markTouched();
    if (newTag.trim() === "") {
      toast.error(t.PleaseEnterRule);
      return;
    }
    setTags((prevTags) => [...prevTags, newTag]);
    setNewTag(""); // Clear input
  };

  // Function to remove tag
  const handleRemoveTag = (index) => {
    markTouched();
    setTags((prevTags) => prevTags.filter((_, i) => i !== index)); // Correctly update state
  };

  const handleVirtualTourUrlChange = (e) => {
    const url = e.target.value;
    setVirtualTourUrl(url);

    // Regular expression to check if URL is from kuula.co
    const regex = /^https:\/\/kuula\.co\/share\/.*$/;

    // If the URL does not match the expected pattern, set an error message
    if (url && !regex.test(url)) {
      setErrorMessage("Please enter a valid Virtual Tour URL. Example: https://kuula.co/share/collection/7ZJCS?logo=1&info=1&fs=1&vr=0&thumbs=1&inst=0");
    } else {
      setErrorMessage(""); // Clear error message if the URL is valid
    }
  };

  const handleDateChange = (dates) => {
    markTouched();
    let updatedDates = [...excludedDates];

    if (Array.isArray(dates)) {
      const [start, end] = dates;
      if (start && end) {
        let dateArray = [];
        let currentDate = new Date(start);

        while (currentDate <= end) {
          dateArray.push(new Date(currentDate).toDateString());
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Check if all selected dates are already excluded
        const allSelectedExist = dateArray.every((date) =>
          updatedDates.includes(date)
        );

        if (allSelectedExist) {
          // If all exist, remove them (deselect)
          updatedDates = updatedDates.filter((date) => !dateArray.includes(date));
        } else {
          // Otherwise, add new dates (select)
          updatedDates = [...new Set([...updatedDates, ...dateArray])];
        }
      }
    }

    setExcludedDates(updatedDates);
  };


  // Function to disable already excluded dates
  // const isDateDisabled = ({ date }) => {
  //     return excludedDates.includes(date.toDateString()) || date < new Date();
  // };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // Mobile: < 768px
    };

    handleResize(); // Run once on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const propertyTypeTranslations = {
    "Nature House": "Prírodný dom",
    "Wooden House": "Drevený dom",
    "Houseboats": "Hausbóty",
    "Farm House": "Farma",
    "Dome House": "Kupolový dom",
    "Wooden Dome": "Drevená kupola",
    "Apartment": "Apartmán",
    "Glamping": "Glamping",
    "Cottages": "Chaty",
    "Motels/Hostel": "Motely/Hostely",
    "Wooden Houses": "Drevené domy",
    "Guest Houses": "Penzióny",
    "Secluded Accommodation": "Odľahlé ubytovanie",
    "Hotels": "Hotely",
    "Dormitories": "Ubytovne",
    "Campsites": "Kempingy",
    "Treehouses": "Domy na strome",
    "Rooms": "Izby",
    "Entire Homes": "Celé domy",
    "Luxury Accommodation": "Luxusné ubytovanie",
  };

  const roomTypes = {
    "Entire place": "Celé miesto",
    "Private room": "Súkromná izba",
    "Share room": "Zdieľaná izba"
  }


  const countries = [
    { name: "Afghanistan", code: "AF" },
    { name: "Albania", code: "AL" },
    { name: "Algeria", code: "DZ" },
    { name: "Andorra", code: "AD" },
    { name: "Angola", code: "AO" },
    { name: "Antigua and Barbuda", code: "AG" },
    { name: "Argentina", code: "AR" },
    { name: "Armenia", code: "AM" },
    { name: "Australia", code: "AU" },
    { name: "Austria", code: "AT" },
    { name: "Azerbaijan", code: "AZ" },
    { name: "Bahamas", code: "BS" },
    { name: "Bahrain", code: "BH" },
    { name: "Bangladesh", code: "BD" },
    { name: "Barbados", code: "BB" },
    { name: "Belarus", code: "BY" },
    { name: "Belgium", code: "BE" },
    { name: "Belize", code: "BZ" },
    { name: "Benin", code: "BJ" },
    { name: "Bhutan", code: "BT" },
    { name: "Bolivia", code: "BO" },
    { name: "Bosnia and Herzegovina", code: "BA" },
    { name: "Botswana", code: "BW" },
    { name: "Brazil", code: "BR" },
    { name: "Brunei", code: "BN" },
    { name: "Bulgaria", code: "BG" },
    { name: "Burkina Faso", code: "BF" },
    { name: "Burundi", code: "BI" },
    { name: "Cambodia", code: "KH" },
    { name: "Cameroon", code: "CM" },
    { name: "Canada", code: "CA" },
    { name: "Cape Verde", code: "CV" },
    { name: "Central African Republic", code: "CF" },
    { name: "Chad", code: "TD" },
    { name: "Chile", code: "CL" },
    { name: "China", code: "CN" },
    { name: "Colombia", code: "CO" },
    { name: "Comoros", code: "KM" },
    { name: "Congo (Congo-Brazzaville)", code: "CG" },
    { name: "Congo (Democratic Republic)", code: "CD" },
    { name: "Costa Rica", code: "CR" },
    { name: "Croatia", code: "HR" },
    { name: "Cuba", code: "CU" },
    { name: "Cyprus", code: "CY" },
    { name: "Czech Republic", code: "CZ" },
    { name: "Denmark", code: "DK" },
    { name: "Djibouti", code: "DJ" },
    { name: "Dominica", code: "DM" },
    { name: "Dominican Republic", code: "DO" },
    { name: "Ecuador", code: "EC" },
    { name: "Egypt", code: "EG" },
    { name: "El Salvador", code: "SV" },
    { name: "Equatorial Guinea", code: "GQ" },
    { name: "Eritrea", code: "ER" },
    { name: "Estonia", code: "EE" },
    { name: "Eswatini", code: "SZ" },
    { name: "Ethiopia", code: "ET" },
    { name: "Fiji", code: "FJ" },
    { name: "Finland", code: "FI" },
    { name: "France", code: "FR" },
    { name: "Gabon", code: "GA" },
    { name: "Gambia", code: "GM" },
    { name: "Georgia", code: "GE" },
    { name: "Germany", code: "DE" },
    { name: "Ghana", code: "GH" },
    { name: "Greece", code: "GR" },
    { name: "Grenada", code: "GD" },
    { name: "Guatemala", code: "GT" },
    { name: "Guinea", code: "GN" },
    { name: "Guinea-Bissau", code: "GW" },
    { name: "Guyana", code: "GY" },
    { name: "Haiti", code: "HT" },
    { name: "Honduras", code: "HN" },
    { name: "Hungary", code: "HU" },
    { name: "Iceland", code: "IS" },
    { name: "India", code: "IN" },
    { name: "Indonesia", code: "ID" },
    { name: "Iran", code: "IR" },
    { name: "Iraq", code: "IQ" },
    { name: "Ireland", code: "IE" },
    { name: "Israel", code: "IL" },
    { name: "Italy", code: "IT" },
    { name: "Jamaica", code: "JM" },
    { name: "Japan", code: "JP" },
    { name: "Jordan", code: "JO" },
    { name: "Kazakhstan", code: "KZ" },
    { name: "Kenya", code: "KE" },
    { name: "Kiribati", code: "KI" },
    { name: "Kuwait", code: "KW" },
    { name: "Kyrgyzstan", code: "KG" },
    { name: "Laos", code: "LA" },
    { name: "Latvia", code: "LV" },
    { name: "Lebanon", code: "LB" },
    { name: "Lesotho", code: "LS" },
    { name: "Liberia", code: "LR" },
    { name: "Libya", code: "LY" },
    { name: "Liechtenstein", code: "LI" },
    { name: "Lithuania", code: "LT" },
    { name: "Luxembourg", code: "LU" },
    { name: "Madagascar", code: "MG" },
    { name: "Malawi", code: "MW" },
    { name: "Malaysia", code: "MY" },
    { name: "Maldives", code: "MV" },
    { name: "Mali", code: "ML" },
    { name: "Malta", code: "MT" },
    { name: "Mauritania", code: "MR" },
    { name: "Mauritius", code: "MU" },
    { name: "Mexico", code: "MX" },
    { name: "Monaco", code: "MC" },
    { name: "Mongolia", code: "MN" },
    { name: "Montenegro", code: "ME" },
    { name: "Morocco", code: "MA" },
    { name: "Mozambique", code: "MZ" },
    { name: "Myanmar", code: "MM" },
    { name: "Namibia", code: "NA" },
    { name: "Nepal", code: "NP" },
    { name: "Netherlands", code: "NL" },
    { name: "New Zealand", code: "NZ" },
    { name: "Nigeria", code: "NG" },
    { name: "Norway", code: "NO" },
    { name: "Oman", code: "OM" },
    { name: "Pakistan", code: "PK" },
    { name: "Philippines", code: "PH" },
    { name: "Poland", code: "PL" },
    { name: "Portugal", code: "PT" },
    { name: "Qatar", code: "QA" },
    { name: "Romania", code: "RO" },
    { name: "Russia", code: "RU" },
    { name: "Slovakia", code: "SK" },
    { name: "South Africa", code: "ZA" },
    { name: "Spain", code: "ES" },
    { name: "Sweden", code: "SE" },
    { name: "Switzerland", code: "CH" },
    { name: "United Kingdom", code: "GB" },
    { name: "United States", code: "US" },
    { name: "Zimbabwe", code: "ZW" },
  ];

  // autocomplete
  // Passed straight through, NOT as `${...}` — a template literal turns a missing
  // key into the literal string "undefined", which Google accepts and then
  // rejects, so the real cause never surfaces.
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: libraries, // Include Places library
  });

  const mapUnavailable = Boolean(loadError) || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handlePlaceSelect = useCallback(() => {
    if (!autocomplete) {
      console.error("Autocomplete is not initialized");
      return;
    }
    const place = autocomplete.getPlace();
    if (place.geometry) {
      const addressComponents = place.address_components || [];
      const formattedAddress = place.formatted_address || "";

      setStreet(formattedAddress);
      setLatitude(place.geometry.location.lat());
      setLongitude(place.geometry.location.lng());
      // Extract city, state, and postal code
      const citys = addressComponents.find((c) => c.types.includes("locality"))?.long_name || addressComponents.find((c) => c.types.includes("postal_town"))?.long_name || addressComponents.find((c) => c.types.includes("administrative_area_level_2"))?.long_name;
      const states = addressComponents.find((c) => c.types.includes("administrative_area_level_1"))?.long_name || "";
      //  const zipCode = addressComponents.find((c) => c.types.includes("postal_code"))?.long_name || "";
      setZipCode(
        addressComponents.find((c) => c.types.includes("postal_code"))?.long_name || "");
      console.log(zipCode)
      const Counts = addressComponents.find((c) => c.types.includes("country"))?.long_name || ""

      // Update state variables
      if (!country) {
        setCountry(Counts);
      }


      // Update state variables
      if (!city) {
        setCity(citys);
      }
      if (!state) {
        setState(states);
      }
      // toast.success(`Selected: ${formattedAddress}`);
    } else {
      toast.error(t.Unabletogetaddressdetails);
    }
  }, [autocomplete, city, state]);

  const handleAutocompleteLoad = useCallback((autocompleteInstance) => {
    setAutocomplete(autocompleteInstance);
  }, []);
  const handleCitySelect = useCallback(() => {
    const cityPlace = cityAutocomplete.getPlace();
    if (cityPlace.geometry) {
      const cityName = cityPlace.address_components.find((c) => c.types.includes("locality"))?.long_name || "";
      setCity(cityName);
    } else {
      toast.error(t.Unabletogetcitydetails);
    }
  }, [cityAutocomplete]);

  const handleCityAutocompleteLoad = useCallback((autocompleteInstance) => {
    setCityAutocomplete(autocompleteInstance);
  }, []);

  // State autocomplete load handler
  const handleStateAutocompleteLoad = useCallback((autocompleteInstance) => {
    setStateAutocomplete(autocompleteInstance);
  }, []);

  // State selection handler
  const handleStateSelect = useCallback(() => {
    if (stateAutocomplete) {
      const place = stateAutocomplete.getPlace();

      if (place.geometry) {
        // Extract the state name from the address components
        const stateName = place.address_components.find((component) =>
          component.types.includes("administrative_area_level_1")
        )?.long_name || "";

        setState(stateName); // Update the state value
      } else {
        toast.error(t.Unabletogetstatedetails); // Show error message if no geometry
      }
    }
  }, [stateAutocomplete]);

  // const handleStateAutocompleteLoad = useCallback((autocompleteInstance) => {
  //   setCityAutocomplete(autocompleteInstance);
  // }, []);
  // Wait for Google only while it is genuinely still loading.
  //
  // This used to also return on `loadError`, which meant a failed Maps script —
  // a missing key, an expired billing account, a referrer restriction — left the
  // ENTIRE form stuck on a spinner forever. Nothing else on this page needs
  // Google: the address fields below already fall back to plain inputs, and a
  // host must still be able to create a listing by typing their address.
  if (!isLoaded && !mapUnavailable) {
    return <Loading />;
  }

  const handleCountryChange = (e) => {
    setCountry(e.target.value); // Update the selected country
  };

  // Function to handle "Use Current Location"
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);

          // Reverse Geocoding using Google Maps API
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          );
          const data = await response.json();

          if (data.results && data.results.length > 0) {
            const addressComponents = data.results[0].address_components;

            setStreet(data.results[0].formatted_address);
            setCity(
              addressComponents.find((c) => c.types.includes("locality"))?.long_name || ""
            );
            setState(
              addressComponents.find((c) =>
                c.types.includes("administrative_area_level_1")
              )?.long_name || ""
            );
            setZipCode(
              addressComponents.find((c) => c.types.includes("postal_code"))?.long_name || ""
            );
            setCountry(
              addressComponents.find((c) => c.types.includes("country"))?.long_name || ""
            );
          } else {
            toast.error(t.Unabletoretrieveaddressdetails);
          }
        },
        (error) => {
          console.log("Geolocation error: " + error.message);
        }
      );
    } else {
      toast.error(t.Geolocationisnotsupportedbyyourbrowser);
    }
  };

  const handleServicesChange = (checked, amenity, setServices) => {
    const enToSkTranslations = {
      "Wifi": "Wifi",
      "TV": "TV",
      "PC Desk(workspace)": "PC stôl(pracovný priestor)"
    };

    setServices((prev) => {
      const updatedEn = checked
        ? [...prev.en, amenity]
        : prev.en.filter((item) => item !== amenity);

      const updatedSk = checked
        ? [...prev.sk, enToSkTranslations[amenity] || amenity]
        : prev.sk.filter((item) => item !== (enToSkTranslations[amenity] || amenity));

      return { en: updatedEn, sk: updatedSk };
    });
  };

  const handleBathroomAmenitiesChange = (checked, amenity, setBathroomAmenities) => {
    const enToSkTranslations = {
      "Bathtub": "Vaňa",
      "Shower": "Sprcha",
      "Washing Machine": "Práčka",
      "Dryer": "Sušička",
      "Ironing": "Žehlenie"
    };

    setBathroomAmenities((prev) => {
      const updatedEn = checked
        ? [...prev.en, amenity]
        : prev.en.filter((item) => item !== amenity);

      const updatedSk = checked
        ? [...prev.sk, enToSkTranslations[amenity] || amenity]
        : prev.sk.filter((item) => item !== (enToSkTranslations[amenity] || amenity));

      return { en: updatedEn, sk: updatedSk };
    });
  };

  const handleKitchenDiningAmenitiesChange = (checked, amenity, setKitchenDiningAmenities) => {
    const enToSkTranslations = {
      "Stovetop": "Varná doska",
      "Oven": "Rúra",
      "Dishwasher": "Umývačka riadu",
      "Refrigerator": "Chladnička",
      "Freezer": "Mraznička",
      "Dining Table": "Jedálenský stôl",
      "Coffee Maker": "Kávovar"
    };

    setKitchenDiningAmenities((prev) => {
      const updatedEn = checked
        ? [...prev.en, amenity]
        : prev.en.filter((item) => item !== amenity);

      const updatedSk = checked
        ? [...prev.sk, enToSkTranslations[amenity] || amenity]
        : prev.sk.filter((item) => item !== (enToSkTranslations[amenity] || amenity));

      return { en: updatedEn, sk: updatedSk };
    });
  };

  const handleHeatingCoolingAmenitiesChange = (checked, amenity, setHeatingCoolingAmenities) => {
    const enToSkTranslations = {
      "Indoor Fireplace": "Vnútorný krb",
      "Air Conditioning": "Klimatizácia",
      "Central Heating": "Ústredné kúrenie"
    };

    setHeatingCoolingAmenities((prev) => ({
      en: checked ? [...prev.en, amenity] : prev.en.filter((item) => item !== amenity),
      sk: checked ? [...prev.sk, enToSkTranslations[amenity] || amenity] : prev.sk.filter((item) => item !== (enToSkTranslations[amenity] || amenity))
    }));
  };

  const handleSafetyAmenitiesChange = (checked, amenity, setSafetyAmenities) => {
    const enToSkTranslations = {
      "Fire Extinguisher": "Hasiaci prístroj",
      "First Aid Kit": "Lekárnička"
    };

    setSafetyAmenities((prev) => {
      const updatedEn = checked
        ? [...prev.en, amenity]
        : prev.en.filter((item) => item !== amenity);

      const updatedSk = checked
        ? [...prev.sk, enToSkTranslations[amenity] || amenity]
        : prev.sk.filter((item) => item !== (enToSkTranslations[amenity] || amenity));

      return { en: updatedEn, sk: updatedSk };
    });
  };

  const handleWellnessAmenitiesChange = (checked, amenity, setWellnessAmenities) => {
    const enToSkTranslations = {
      "Sauna": "Sauna",
      "Hot Tub": "Vírivka",
      "Indoor Pool": "Vnútorný bazén",
      "Outdoor Pool": "Vonkajší bazén",
      "None": "Žiadne"
    };

    setWellnessAmenities((prev) => {
      let updatedAmenities = [...prev.en];

      if (amenity === "None") {
        // If "None" is checked, clear all other selections
        updatedAmenities = checked ? ["None"] : [];
      } else {
        // Prevent selection if "None" is already active
        if (prev.en.includes("None")) {
          return prev; // Do nothing
        }

        if (checked) {
          updatedAmenities.push(amenity);
        } else {
          updatedAmenities = updatedAmenities.filter((item) => item !== amenity);
        }
      }

      return {
        en: updatedAmenities,
        sk: updatedAmenities.map((item) => enToSkTranslations[item] || item)
      };
    });
  };


  const handleOutdoorAmenities = (checked, amenity, setOutdoorAmenities) => {
    const enToSkTranslations = {
      "Firepit": "Ohnisko",
      "Balcony": "Balkón",
      "Terrace": "Terasa",
      "Outdoor dining area": "Vonkajší jedálenský priestor",
      "Grill": "Gril",
      "None": "Žiadne",
    };

    setOutdoorAmenities((prev) => {
      let updatedAmenities = [...prev.en];

      if (amenity === "None") {
        // If "None" is checked, clear all other selections
        updatedAmenities = checked ? ["None"] : [];
      } else {
        // Prevent selection if "None" is already active
        if (prev.en.includes("None")) {
          return prev; // Do nothing
        }

        if (checked) {
          updatedAmenities.push(amenity);
        } else {
          updatedAmenities = updatedAmenities.filter((item) => item !== amenity);
        }
      }

      return {
        en: updatedAmenities,
        sk: updatedAmenities.map((item) => enToSkTranslations[item] || item)
      };
    });
  };

  const handleParkingFacilitiesChange = (checked, amenity, setParkingFacilities) => {
    const enToSkTranslations = {
      "Free Parking on-site": "Bezplatné parkovanie na mieste",
      "Paid Parking on-site": "Platené parkovanie",
      "Public Parking": "Verejné parkovanie",
    };

    setParkingFacilities((prev) => {
      const updatedEn = checked
        ? [...prev.en, amenity]
        : prev.en.filter((item) => item !== amenity);

      const updatedSk = checked
        ? [...prev.sk, enToSkTranslations[amenity] || amenity]
        : prev.sk.filter((item) => item !== (enToSkTranslations[amenity] || amenity));

      return { en: updatedEn, sk: updatedSk };
    });
  };

  const handleCheckInChange = (checked, amenity, setCheckIn) => {
    const enToSkTranslations = {
      "Self Check-in": "Samoobslužný check-in",
      "Reception": "Recepcia",
      "Host Greeting": "Privítanie hostiteľom",
    };

    setCheckIn((prev) => {
      const updatedEn = checked
        ? [...prev.en, amenity]
        : prev.en.filter((item) => item !== amenity);

      const updatedSk = checked
        ? [...prev.sk, enToSkTranslations[amenity] || amenity]
        : prev.sk.filter((item) => item !== (enToSkTranslations[amenity] || amenity));

      return { en: updatedEn, sk: updatedSk };
    });
  };

  const handleMealsChange = (checked, amenity, setMeals) => {
    const enToSkTranslations = {
      "No Meals": "Bez stravy",
      "Breakfast": "Raňajky",
      "Half Board": "Polpenzia",
      "Full Board": "Plná penzia",
      "All-Inclusive": "All-inclusive",
    };

    setMeals((prev) => {
      let updatedMeals = [...prev.en];

      if (amenity === "No Meals") {
        // If selecting "No Meals", clear all other selections
        updatedMeals = checked ? ["No Meals"] : [];
      } else {
        // Prevent selection if "No Meals" is already active
        if (prev.en.includes("No Meals")) {
          return prev; // Do nothing
        }

        if (checked) {
          updatedMeals.push(amenity);
        } else {
          updatedMeals = updatedMeals.filter((item) => item !== amenity);
        }
      }

      return {
        en: updatedMeals,
        sk: updatedMeals.map((item) => enToSkTranslations[item] || item)
      };
    });
  };

  // Simulated cloud upload function
  const handleCoverImageChange = async (input) => {
    markTouched();
    let file;

    // Determine if the input is a file input event or a direct file
    if (input.target && input.target.files) {
      file = input.target.files[0]; // File input case
    } else {
      file = input; // Drag-and-drop case
    }

    if (!file) return;

    setIsUploading(true); // 🔄 Start spinner

    try {
      // Upload the image to Cloudinary
      const data = await uploadImageToCloudinary(file, t);

      // Update the state with the secure URL
      setCoverImage(data.secure_url);
      setCoverPreview(data.secure_url);

    } catch (error) {
      console.error("Cover image upload failed:", error);
      toast.error(error.message);
    } finally {
      setIsUploading(false); // ✅ Stop spinner
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0]; // Get the first dropped file
    if (file) {
      handleCoverImageChange(file); // Pass the file directly
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleRemainingImagesChange = async (event) => {
    markTouched();
    const files = Array.from(event.target.files); // Convert to array
    if (!files.length) return;

    setIsUploadingRemainingImages(true); // Start loading

    let uploadedImages = [...remainingImages];
    let previews = [...remainingPreviews];

    try {
      for (const file of files) {
        const data = await uploadImageToCloudinary(file, t); // Upload image
        uploadedImages.push(data.secure_url); // Use Cloudinary secure URL
        previews.push(data.secure_url); // Use secure URL for preview
      }

      if (uploadedImages.length < 4) {
        setErrors({ ...errors, remainingImages: t.Youmustuploadatleastimages });
      } else {
        setErrors({ ...errors, remainingImages: null });
      }

      setRemainingImages(uploadedImages);
      setRemainingPreviews(previews);
    } catch (error) {
      console.error("Image upload failed:", error);
      toast.error(error.message);
    } finally {
      setIsUploadingRemainingImages(false); // Stop loading
    }
  };

  const handleRemainingDrop = async (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files; // Extract files from drag-and-drop
    await handleRemainingImagesChange({ target: { files } }); // Pass files to the existing handler
  };

  const handleRemainingDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle removing cover image
  const handleRemoveCoverImage = () => {
    setCoverImage(null);
    setCoverPreview(null);
  };

  // Handle removing an additional image
  const handleRemoveAdditionalImage = (index) => {
    const updatedPreviews = remainingPreviews.filter((_, i) => i !== index);
    const updatedImages = remainingImages.filter((_, i) => i !== index);

    setRemainingPreviews(updatedPreviews);
    setRemainingImages(updatedImages);
  };

  const validateTime = (value, field) => {
    if (!value) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [field]: t.Timeisrequired,
      }));
      return false;
    }

    const [hours, minutes] = value.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours > 23 || minutes > 59) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [field]: `${t.Pleaseenteravalidtime}`,
      }));
      return false;
    }

    setErrors((prevErrors) => ({
      ...prevErrors,
      [field]: "",
    }));
    return true;
  };

  const handleBlur = (e, field) => {
    const isValid = validateTime(e.target.value, field);
    if (!isValid) {
      e.target.focus(); // Keeps focus if invalid
    }
  };

  const handlePropertyTypeChange = (e) => {
    const selectedEn = e.target.value; // Get selected English name
    const selectedSk = propertyTypeTranslations[selectedEn] || selectedEn; // Get SK translation

    console.log("Selected Property Type:", { en: selectedEn, sk: selectedSk });

    setPropertyType({ en: selectedEn, sk: selectedSk }); // Store both languages
  };

  // const handleRoomTypesChange = (e) => {
  //   const selectedEn = e.target.value; // Get selected English name
  //   const selectedSk = roomTypes[selectedEn] || selectedEn; // Get SK translation

  //   console.log("Selected Room Type:", { en: selectedEn, sk: selectedSk });

  //   setRoomType({ en: selectedEn, sk: selectedSk }); // Store both languages
  // };
  const handleRoomTypesChange = (e) => {
    const selectedEn = e.target.value;
    console.log("handleRoomTypesChange selected:", selectedEn);
    console.log("Available roomTypes:", roomTypes);
    const skValue = roomTypes && roomTypes[selectedEn] ? roomTypes[selectedEn] : selectedEn;
    setRoomType({
      en: selectedEn,
      sk: skValue
    });
  };


  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return; // Prevent multiple clicks

    setIsSubmitting(true); // Disable button immediately
    console.log("starting point");

    //Get the user from localStorage
    const userr = localStorage.getItem("user");
    const users = JSON.parse(userr);
    console.log("user", users?._id); // Ensure user is logged in

    // No need to set userId state, use users._id directly
    const userId = users?._id;

    if (!userId) {
      console.error("User ID not found");
      toast.error(t.Usermustbeloggedin);
      setIsSubmitting(false); // Re-enable the Submit button
      return;
    }

    const newErrors = {};

    if (!name) newErrors.name = `${t.PleasefilltheNamefield}`;
    if (!propertyType) newErrors.propertyType = `${t.PleaseselectthePropertyType}`;
    if (!roomType) newErrors.roomType = `${t.PleasefilltheRentalForm}`;
    if (!country) newErrors.country = `${t.CountryRegionisrequired}`;
    if (!street) newErrors.street = `${t.Streetisrequired}`;
    if (!phoneNumber) newErrors.street = `${t.Phoneisrequired}`;
    if (!city) newErrors.city = `${t.Cityisrequired}`;
    // if (!state) newErrors.state = `${t.Stateisrequired}`;
    if (!zipCode) newErrors.zipCode = `${t.PostalCodeisrequired}`;
    if (!acreage) newErrors.acreage = `${t.Pleaseselecttheacreage}`;
    if (services.length === 0) newErrors.services = `${t.Pleaseselectatleastoneservices}`;
    if (bathroomAmenities.length === 0) newErrors.bathroomAmenities = `${t.Pleaseselectatleastonebathroomamenities}`;
    if (kitchenDiningAmenities.length === 0) newErrors.kitchenDiningAmenities = `${t.PleaseselectatleastoneKitchenandDiningAmenities}`;
    if (heatingCoolingAmenities.length === 0) newErrors.heatingCoolingAmenities = `${t.PleaseselectatleastoneHeatingandCoolingAmenities}`;
    if (safetyAmenities.length === 0) newErrors.safetyAmenities = `${t.Pleaseselectatleastonesafetyamenity}`;
    if (wellnessAmenities.length === 0) newErrors.wellnessAmenities = `${t.Pleaseselectatleastonewellnessamenity}`;
    if (outdoorAmenities.length === 0) newErrors.outdoorAmenities = `${t.Pleaseselectatleastoneoutdooramenity}`;
    if (parkingFacilities.length === 0) newErrors.parkingFacilities = `${t.Pleaseselectatleastoneparkingfacility}`;
    if (checkIn.length === 0) newErrors.checkIn = `${t.Pleaseselectatleastonecheckinoption}`;
    if (meals.length === 0) newErrors.meals = `${t.Pleaseselectatleastonemealoption}`;
    if (!description) newErrors.description = `${t.Minimumcharactersrequired}`;
    if (!pricePerNight) newErrors.pricePerNight = `${t.PleasefillthePriceMonThufield}`;
    // if (!priceFriSun) newErrors.priceFriSun = `${t.PleasefillthePriceFriSunfield}`;
    if (!coverImage) newErrors.coverImage = `${t.Pleaseuploadacoverimage}`;
    // if (!amenties) newErrors.amenties = "Please select an option for smoking.";
    if (!pet) newErrors.pet = `${t.Pleaseselectanoptionforpets}`;
    if (!partyOrganizing)
      newErrors.partyOrganizing = `${t.Pleaseselectanoptionforpartyorganizing}`;
    if (!smoking) newErrors.smoking = `${t.Pleaseselectanoptionforsmoking}`;
    if (arrivalFrom) {
      const [hours, minutes] = arrivalFrom.split(":").map(Number);
      if (hours > 23 || minutes > 59) {
        newErrors.arrivalFrom = `${t.Pleaseenteravalidtime24hours}`;
      }
    }
    if (arrivalTo) {
      const [hours, minutes] = arrivalTo.split(":").map(Number);
      if (hours > 23 || minutes > 59) {
        newErrors.arrivalTo = `${t.Pleaseenteravalidtime24hours}`;
      }
    }
    if (departureFrom) {
      const [hours, minutes] = departureFrom.split(":").map(Number);
      if (hours > 23 || minutes > 59) {
        newErrors.departureFrom = `${t.Pleaseenteravalidtime24hours}`;
      }
    }
    if (departureTo) {
      const [hours, minutes] = departureTo.split(":").map(Number);
      if (hours > 23 || minutes > 59) {
        newErrors.departureTo = `${t.Pleaseenteravalidtime24hours}`;
      }
    }

    // Flexible seasonal pricing: blank rows are ignored, half-filled ones are not
    const flexiblePriceErrors = validateFlexiblePrices(flexiblePrices, t);
    if (flexiblePriceErrors.length > 0) {
      newErrors.flexiblePrices = flexiblePriceErrors.join(" · ");
    }

    // Custom cancellation tiers. The server rejects these too, in a pre-validate
    // hook — catching them here just means the host finds out while editing.
    if (cancellationPolicyType === "custom") {
      const tierErrors = validateTiers(customPolicyTiers);
      setPolicyErrors(tierErrors);
      if (tierErrors.length > 0) {
        newErrors.customPolicyTiers = tierErrors.join(" · ");
      }
    } else {
      setPolicyErrors([]);
    }

    // Specific validations for add and update
    if (!accommodationId) {
      // Add Accommodation: Validate remainingImages
      if (remainingImages.length < 4) {
        newErrors.remainingImages = `${t.Pleaseuploadatleastadditionalimages}`;
      }
    } else {
      // Update Accommodation: Validate imagesPreview
      if (remainingPreviews.length < 4) {
        newErrors.remainingPreviews = t.Pleaseensurethereareatleastimagesinthepreview;
      }
    }

    setErrors(newErrors); // Update state with the errors

    if (Object.keys(newErrors).length > 0) {
      // If there are errors, stop the form submission
      toast.error(`${t.Pleasefilltheimportantfieldswithasterisksignbeforesubmitting}`);
      setIsSubmitting(false); // Re-enable the Submit button
      return;
    }

    const accommodationData = {
      stripeEnabled: true,
      propertyType: {
        en: propertyType?.en?.trim() || "Unknown",  // ✅ Default fallback
        sk: propertyType?.sk?.trim() || "Unknown",
      },
      name,
      userId,
      url: url || '',
      virtualTourUrl,
      acreage,
      description,
      specialNote,
      // Free text shown to guests; descriptive only.
      cancellationPolicy,
      // The policy that actually decides refunds.
      cancellationPolicyType,
      customPolicyTiers:
        cancellationPolicyType === "custom"
          ? customPolicyTiers.map((tier) => ({
              hoursBefore: Number(tier.hoursBefore) || 0,
              refundPercent: Number(tier.refundPercent) || 0,
            }))
          : [],
      // FixedPrice,
      specialPrice: {
        name: specialOfferName,
        start: priceRangeStartDate,
        end: priceRangeEndDate,
        price: priceRangePrice,
      },
      flexiblePrices: sanitizeFlexiblePrices(flexiblePrices),
      rentalform: {
        en: roomType?.en?.trim() || "Unknown",
        sk: roomType?.sk?.trim() || "Unknown"
      },
      bedroom,
      bathroom,
      beds,
      singlebed,
      doublebed,
      kitchen,
      WCs,
      SocialRoom,
      CommonRoom,
      LivingRoom,
      Sofa,
      person,
      phoneNumber,
      arrivalFrom,
      arrivalTo,
      departureFrom,
      departureTo,
      services: {
        en: services.en,
        sk: services.sk,
      },
      bathroomAmenities: {
        en: bathroomAmenities.en,
        sk: bathroomAmenities.sk,
      },
      kitchenDiningAmenities: {
        en: kitchenDiningAmenities.en,
        sk: kitchenDiningAmenities.sk,
      },
      heatingCoolingAmenities: {
        en: heatingCoolingAmenities.en,
        sk: heatingCoolingAmenities.sk,
      },
      safetyAmenities: {
        en: safetyAmenities.en,
        sk: safetyAmenities.sk,
      },
      wellnessAmenities: {
        en: wellnessAmenities.en,
        sk: wellnessAmenities.sk,
      },
      outdoorAmenities: {
        en: outdoorAmenities.en,
        sk: outdoorAmenities.sk,
      },
      parkingFacilities: {
        en: parkingFacilities.en,
        sk: parkingFacilities.sk,
      },
      checkIn: {
        en: checkIn.en,
        sk: checkIn.sk,
      },
      meals: {
        en: meals.en,
        sk: meals.sk,
      },
      pet: {
        en: pet.en || "Not Allowed",
        sk: pet.en === "Allowed at no extra charge" ? "Povolené bez príplatku" : pet.en === "Allowed with an additional fee" ? "Povolené za príplatok" : "Nepovolené"
      },
      // 0 (or a blank field) means pets are allowed without an extra charge
      petFeePerNight:
        pet.en === "Allowed with an additional fee"
          ? Number(petFeePerNight) || 0
          : 0,
      partyOrganizing: {
        en: partyOrganizing.en || "Not Allowed",
        sk: partyOrganizing.en === "Allowed" ? "Povolené" : "Nepovolené"
      },
      smoking: {
        en: smoking.en || "Not allowed",
        sk: smoking.en === "Allowed indoors" ? "Povolené v interiéri" : smoking.en === "Allowed in designated areas" ? "Povolené v určených priestoroch" : "Nepovolené"
      },
      tags: tags,
      pricePerNight,
      pricePerPerson: pricePerPerson ? Number(pricePerPerson) : undefined,
      discount,
      nightMax,
      nightMin,
      excludedDates: excludedDates.map(date => new Date(date)),
      location: {
        address,
        latitude,
        longitude,
      },
      locationDetails: {
        streetAndNumber: street.toLowerCase(),
        state: state.toLowerCase(),
        city: city.toLowerCase(),
        zipCode: zipCode.toLowerCase(),
        country: country,
        roomNumber: roomNumber.toLowerCase(),
      },
      isApproved: "true",
      // Which connected account this property pays out to. Null means the
      // host's default, which is what a host running one account for every
      // property always means. The server re-derives listingStatus from it.
      payoutStripeAccountId: payoutAccountId || null,
      // Drop a removed cover (null) and any URL that appears in both the
      // previews and the freshly uploaded list, so neither reaches the DB
      images: Array.from(
        new Set(
          [coverImage, ...(accommodationId ? remainingPreviews : []), ...remainingImages]
            .filter((img) => typeof img === "string" && img.trim() !== "")
        )
      )
    };
    console.log("accommodationData", accommodationData)
    try {
      let response;
      let SuccessMessage;

      if (accommodationId) {
        // Update existing accommodation
        response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/${accommodationId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(accommodationData),
        });

        SuccessMessage = t.Accommodationupdatedsuccessfully;
        updateSelectedpage("overview");
      } else {
        // Create new accommodation
        response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/accommodation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(accommodationData),
        });
        SuccessMessage = t.AccommodationDataStoreSuccessfully;
      }

      const responseBody = await response.json(); // Assuming the response is JSON

      if (!response.ok) {
        throw new Error(responseBody.message || t.Failedtopostdata); // Dynamic error message
      }

      // The listing is safely stored, so the local draft has done its job.
      // Cleared here rather than after the calendar step, which is allowed to
      // fail — a listing that saved must not leave a draft behind offering to
      // restore itself the next time the host opens the form.
      clearDraft(accommodationId);
      setDraftSavedAt(null);

      // Calendars attach once the listing has an id — a new listing has none
      // until this response comes back. Failures here never fail the save.
      const savedAccommodationId =
        accommodationId ||
        responseBody.accommodation?._id ||
        responseBody.updatedAccommodation?._id;
      await persistCalendarFeeds(savedAccommodationId);

      // Only reset fields if the request was successful
      if (!accommodationId) {
        setName("");
        setVirtualTourUrl("");
        setDescription("");
        setBedroom("");
        setBathroom("");
        setBeds("");
        setKitchen("");
        setWCs("");
        setSocialRoom("");
        setCommonRoom("");
        setLivingRoom("");
        setSofa("");
        setPerson("");
        setPet("");
        setPetFeePerNight("");
        setPricePerPerson("");
        setPartyOrganizing("");
        setSmoking("");
        setTags([]);
        setDiscount("");
        setPricePerNight("");
        setNightMax("");
        setNightMin("");
        setExcludedDates([]);
        setAddress("");
        setLatitude("");
        setLongitude("");
        setStreet("");
        setState("");
        setCity("");
        setZipCode("");
        setCountry("");
        setRoomNumber("");
        setCalendarFeedRows([makeRow()]);
        setPayoutAccountId(null);
        setCalendarFeedErrors({});
        setCalendarFeedResults({});
      }

      console.log('Data posted successfully');
      // Use the dynamic message from backend if it exists
      const successMessage = responseBody.message;
      console.log("Sucess Message", successMessage)
      toast.success(SuccessMessage); // Display dynamic success message

      // Redirect to "AccommodationShow" page
      updateSelectedpage("Accommodation");

    } catch (error) {
      console.error(`${t.Errorpostingdata}`, error);
      // If the error object has a message, show that, otherwise fallback to a generic message
      const errorMessage = error.message || t.Failedtostoreaccommodationdata;
      toast.error(errorMessage); // Display dynamic error message
    } finally {
      setIsSubmitting(false); // Enable button after completion
    }
  };




  // ── Calendar sync rows ──────────────────────────────────────────────────
  const updateCalendarRow = (localId, patch) => {
    setCalendarFeedRows((prev) =>
      prev.map((row) => (row.localId === localId ? { ...row, ...patch } : row))
    );
    // Clear the row's error as soon as the host starts fixing it.
    setCalendarFeedErrors((prev) => {
      if (!prev[localId]) return prev;
      const next = { ...prev };
      delete next[localId];
      return next;
    });
  };

  const addCalendarRow = () => {
    markTouched();
    setCalendarFeedRows((prev) => [...prev, makeRow()]);
  };

  // Removing a row here only drops it from the list. The feed and any dates it
  // imported are removed server-side by the save below, which sends the list as
  // the host left it. Disconnecting with the "also delete imported dates"
  // choice lives on the Calendar Synchronization page.
  const removeCalendarRow = (row) =>
    setCalendarFeedRows((prev) => {
      const next = prev.filter((r) => r.localId !== row.localId);
      return next.length ? next : [makeRow()];
    });

  /**
   * Save and sync the listing's calendars, after the listing itself is stored.
   *
   * Deliberately swallows its own failures: the listing is already saved by the
   * time this runs, and a bad iCal link is not a reason to tell the host their
   * accommodation did not save. Problems surface as a warning and on the
   * Calendar Synchronization page, where they can be fixed without re-entering
   * the whole form.
   */
  const persistCalendarFeeds = async (savedAccommodationId) => {
    if (!savedAccommodationId) return;

    const filled = filledRows(calendarFeedRows);
    const hadFeedsBefore = (accommodationData?.calendarSync || []).length > 0;
    // Nothing typed and nothing to clear — the host skipped this section.
    if (!filled.length && !hadFeedsBefore) return;

    const errors = validateRows(calendarFeedRows, t.InvalidCalendarURL);
    if (Object.keys(errors).length) {
      setCalendarFeedErrors(errors);
      toast.warn(t.CalendarSyncSkippedInvalidURL);
      return;
    }

    try {
      const calendarSync = await saveFeeds(savedAccommodationId, calendarFeedRows);
      const savedRows = calendarSync.map(makeRow);
      setCalendarFeedRows(savedRows.length ? savedRows : [makeRow()]);

      if (!savedRows.length) return;

      const { outcomes, okCount } = await syncAllFeeds(savedAccommodationId, savedRows);
      setCalendarFeedResults(outcomes);

      if (okCount < savedRows.length) {
        toast.warn(
          t.SyncFinishedSummary.replace("{ok}", okCount).replace("{total}", savedRows.length)
        );
      }
    } catch (err) {
      console.error("Calendar sync failed after saving the listing:", err);
      toast.warn(t.CalendarSyncFailedListingSaved);
    }
  };

  // Function to render the radio buttons
  const renderRadio = (name, id, label, value, isChecked) => {
    const handleChange = (e) => {
      if (name === "pet") {
        setPet({ ...pet, en: e.target.value });
        // Drop any previously entered fee when pets are free or not allowed
        if (e.target.value !== "Allowed with an additional fee") {
          setPetFeePerNight("");
        }
      } else if (name === "partyOrganizing") {
        setPartyOrganizing({ ...partyOrganizing, en: e.target.value });
      } else if (name === "smoking") {
        setSmoking({ ...smoking, en: e.target.value });
      }
    };

    return (
      <div className="flex items-center">
        <input
          type="radio"
          id={id + name}
          name={name}
          value={value} // Value is passed to identify the selection
          checked={isChecked} // Controlled radio state based on `amenities`
          onChange={handleChange} // Update the state on selection
          className="h-6 w-6 border border-neutral-400 rounded bg-white focus:ring-0 focus:outline-none checked:bg-[#357965] checked:border-[#357965] checked:ring-0 bg-transparent appearance-none"
          required
        />
        <label
          htmlFor={id + name}
          className="block ml-3 text-sm font-medium text-neutral-700"
        >
          {label}
        </label>
      </div>
    );
  };


  const renderNoInclude = (tag, index) => {
    return (
      <div key={index} className="flex items-center justify-between py-3">
        <span className="font-medium text-neutral-600">{tag}</span>
        <CircleX
          className="text-2xl cursor-pointer text-neutral-400 hover:text-neutral-900"
          onClick={() => handleRemoveTag(index)}
        />
      </div>
    );
  };

  return (
    // React events bubble, so one handler on the form marks it touched no
    // matter which of its ~90 inputs the host edits first — far more reliable
    // than remembering to flag it in every individual onChange.
    <form
      className=''
      onSubmit={handleSubmit}
      onChange={markTouched}
      onInput={markTouched}
    >

      {!isEditMode && (
        <Header
          title={t.AddNewAccommodation}
          subtitle=""
          showAddButton={false}
        />
      )}

      {/* Unsaved work found in this browser.
          Never applied automatically — silently overwriting a form the host has
          already started typing into would itself be the data loss this feature
          exists to prevent. They choose. */}
      {restorable && (
        <div className="max-w-4xl mx-auto px-6 pt-4">
          <div className="relative flex flex-col gap-3 p-4 pl-5 overflow-hidden bg-white border border-[#DFBA73]/40 rounded-xl shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="absolute top-0 left-0 h-full w-1.5 bg-[#DFBA73]" />
            <div className="flex items-start gap-3 min-w-0">
              <RotateCcw className="w-5 h-5 mt-0.5 text-[#9a7a3a] shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#1E3E2B]">{t.UnsavedDraftFound}</p>
                <p className="text-sm text-neutral-500">
                  {t.UnsavedDraftSavedAt} {describeSavedAt(restorable.savedAt, language)}
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={restoreDraft}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#357965] hover:bg-[#1e4636] rounded-lg transition-colors active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                {t.RestoreDraft}
              </button>
              <button
                type="button"
                onClick={discardDraft}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-neutral-600 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors active:scale-95"
              >
                <X className="w-4 h-4" />
                {t.DiscardDraft}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Autosave indicator. Small, but it is the whole reassurance: a host who
          cannot see that their work is being kept does not believe it is. */}
      {draftSavedAt && !restorable && (
        <div className="max-w-4xl mx-auto px-6 pt-3">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
            <Save className="w-3.5 h-3.5 shrink-0" />
            {t.DraftAutosaved} · {describeSavedAt(draftSavedAt, language)}
          </p>
        </div>
      )}
      {/* <div className='flex flex-row gap-4 px-4 pt-20 pb-2 mx-auto nc-PageAddListing1 md:pb-6'> */}
      {/* <div className='flex items-center justify-center'>
          <h1 className='text-xl font-bold md:text-4xl'>
            {t.Accommodation} 
          </h1>
        </div> */}
      {/* <div>
          <ButtonPrimary className="flex-shrink-0 bg-[#357965]">
            <Plus />
              <span className="ml-3">Add New</span>
          </ButtonPrimary>
        </div> */}
      {/* </div> */}

      <>
        <div className=' pt-8 pb-2 mx-auto nc-PageAddListing1 md:pb-6'>
          <div className="listingSection__wrap space-y-11">
            <h2 className="text-2xl font-semibold">{t.Choosinglistingcategories}</h2>
            <div className="border-b w-14 border-neutral-200"></div>
            {/* FORM */}
            <div className="space-y-8 ">
              {/* ITEM */}
              <FormItem
                label={`${t.Chooseapropertytype}`}
                desc={`${t.PropertyTypeDesc}`}
                isRequired={true}
              >
                <Select
                  value={Object.keys(propertyTypeTranslations).find(key =>
                    propertyTypeTranslations[key] === propertyType[language]
                  ) || propertyType.en}  // Ensure the value matches the English key
                  onChange={handlePropertyTypeChange}
                  defaultMenuIsOpen={true}
                >
                  {Object.entries(propertyTypeTranslations).map(([enKey, skValue]) => (
                    <option key={enKey} value={enKey}>
                      {language === "sk" ? skValue : enKey}
                    </option>
                  ))}
                </Select>
                {errors.propertyType && (
                  <p className="mt-1 text-sm text-red-500">{errors.propertyType}</p>
                )}
              </FormItem>
              <FormItem
                label={`${t.Placename}`}
                desc={`${t.AcatchynameusuallyincludesHousenameRoomnameFeaturedpropertyTouristdestination}`}
                isRequired={true}
              >
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`${t.Placename}`}
                  required
                />

                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </FormItem>
              <FormItem
                label={`${t.Rentalform}`}
                desc={`${t.Rentalformdesc}`}
                isRequired={true}
              >
                <Select
                  value={Object.keys(roomTypes).find(key =>
                    roomTypes[key] === roomType[language]
                  ) || roomType.en}  // Ensure the value matches the English key
                  onChange={handleRoomTypesChange}
                  defaultMenuIsOpen={true}
                >
                  {Object.entries(roomTypes).map(([enKey, skValue]) => (
                    <option key={enKey} value={enKey}>
                      {language === "sk" ? skValue : enKey}
                    </option>
                  ))}
                </Select>

                {errors.roomType && (
                  <p className="mt-1 text-sm text-red-500">{errors.roomType}</p>
                )}
              </FormItem>
            </div>
          </div>
        </div>
      </>

      {/* Form 2 */}
      <>
        <div className=' pb-2 mx-auto nc-PageAddListing1 md:pb-6'>
          <div className="listingSection__wrap space-y-11">
            <h2 className="text-2xl font-semibold">{t.Yourplacelocation}</h2>
            <div className="border-b w-14 border-neutral-200"></div>
            {/* FORM */}
            <div className="space-y-8">
              {/* <ButtonSecondary onClick={handleUseCurrentLocation}>
          <MapPinIcon className="w-5 h-5 text-neutral-500" />
          <span className="ml-3">{t.Usecurrentlocation}</span>
        </ButtonSecondary> */}
              {/* ITEM */}
              <FormItem label={`${t.CountryRegion}`} isRequired={true}>
                <Select
                  value={country}
                  onChange={(e) => {
                    const selected = countries.find(c => c.name === e.target.value);
                    setCountry(selected.name);
                    setCountryCode(selected.code); // Store country code
                  }}
                  className="relative z-10 w-full px-3 py-2 bg-white border rounded-md focus:outline-none focus:ring focus:ring-green-500"
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                {errors.country && (
                  <p className="mt-1 text-sm text-red-500">{errors.country}</p>
                )}
              </FormItem>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-5">
                <FormItem label={`${t.City}`} isRequired={true}>
                  {isLoaded && window.google?.maps?.places ? (
                    <Autocomplete
                      onLoad={handleCityAutocompleteLoad}
                      onPlaceChanged={handleCitySelect}
                      options={{
                        types: ["(cities)"], // Restrict to city suggestions only
                        componentRestrictions: { country: CountryCode },// Optional: Restrict to specific country
                      }}
                    >
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                      />
                    </Autocomplete>
                  ) : (
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                  )}
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-500">{errors.city}</p>
                  )}
                </FormItem>
                {/* <FormItem label={`${t.State}`} 
            // isRequired={true}
          >
            <Autocomplete
              onLoad={handleStateAutocompleteLoad} // Attach the load handler
              onPlaceChanged={handleStateSelect} // Attach the selection handler
              options={{
                types: ["(regions)"], // Restrict to regions/states
                // Optional: Restrict to a specific country (e.g., US)
              }}
            >
              <Input
                value={state}
                onChange={(e) => setState(e.target.value)}
                // required
              />
            </Autocomplete>
            {errors.state && (
              <p className="mt-1 text-sm text-red-500">{errors.state}</p>
            )}
          </FormItem> */}
                <FormItem label={`${t.Postalcode}`} isRequired={true}>
                  <Input
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    required
                  />
                  {errors.zipCode && (
                    <p className="mt-1 text-sm text-red-500">{errors.zipCode}</p>
                  )}
                </FormItem>
              </div>
              <FormItem label={`${t.Street}`} isRequired={true}>
                {isLoaded && window.google?.maps?.places ? (
                  <Autocomplete
                    onLoad={handleAutocompleteLoad}
                    onPlaceChanged={handlePlaceSelect}
                    options={{
                      // Restrict to city suggestions only
                      componentRestrictions: { country: CountryCode },// Optional: Restrict to specific country
                    }}
                  >
                    <Input
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder={`${t.Starttypingtosearchforanaddress}`}
                      required
                    />
                  </Autocomplete>
                ) : (
                  <Input
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder={`${t.Starttypingtosearchforanaddress}`}
                    required
                  />
                )}
                {errors.street && (
                  <p className="mt-1 text-sm text-red-500">{errors.street}</p>
                )}
              </FormItem>
              <FormItem label={`${t.phoneNumber}`} isRequired={true}>
                <div className="border border-gray-300 rounded-lg shadow-sm ">
                  <PhoneInput
                    country={"sk"} // Default to Slovakia
                    value={phoneNumber}
                    onChange={(value) => setPhoneNumber(value)}
                    // className="mt-1.5"
                    containerClass="!border-0"
                    inputProps={{
                      name: "phone",
                      required: true,
                    }}
                    inputClass="w-full  text-sm  px-12 rounded-lg !border-0"
                    buttonClass="mr-2"
                    dropdownClass="border border-gray-300 rounded-lg shadow-lg"
                  />
                </div>
                {errors.phoneNumber && (
                  <p className="mt-1 text-sm text-red-500">{errors.phoneNumber}</p>
                )}
              </FormItem>

              <FormItem label={`${t.Roomnumberoptional}`}>
                <Input
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
              </FormItem>
              <div>
                <Label>{t.Detailedaddress}</Label>
                <span className="block mt-1 text-sm text-neutral-500">
                  {street}
                </span>
                <div className="mt-4">
                  <div className="aspect-w-5 aspect-h-5 sm:aspect-h-2">
                    <div className="overflow-hidden rounded-xl">
                      {isLoaded ? (
                        <GoogleMap
                          mapContainerStyle={containerStyle}
                          center={{ lat: latitude, lng: longitude }} // Dynamically updated
                          zoom={12}
                          options={{
                            styles: [
                              {
                                elementType: "labels",
                                featureType: "poi",
                                stylers: [{ visibility: "off" }],
                              },
                            ],
                            disableDefaultUI: true,
                            zoomControl: true,
                          }}
                        >
                          <Marker position={{ lat: latitude, lng: longitude }} />
                        </GoogleMap>
                      ) : mapUnavailable ? (
                        // Without this the box span a loader forever whenever the
                        // Maps script failed, with no hint as to why.
                        <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-1 bg-neutral-50 p-6 text-center">
                          <span className="text-sm font-semibold text-neutral-600">
                            {t.MapUnavailable || "Map preview unavailable"}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {t.MapUnavailableHint ||
                              "You can still enter the address by hand — the listing will save normally."}
                          </span>
                        </div>
                      ) : (
                        <Loading />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>

      <>
        <div className=' pb-2 mx-auto nc-PageAddListing1 md:pb-6'>
          <div className="listingSection__wrap space-y-11">
            <h2 className="text-2xl font-semibold">{t.Sizeofyourlocation}</h2>
            <div className="border-b w-14 border-neutral-200"></div>
            {/* FORM */}
            {/* ITEM */}
            <div className="relative">
              <input
                list="acreage-options"
                id="acreage"
                name="acreage"
                value={acreage}
                onChange={(e) => setAcreage(e.target.value)}
                placeholder={`${t.Selectorentercustomacreage}`}
                className="block w-full px-3 py-2 bg-white border rounded-2xl border-neutral-300 text-neutral-900 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
              <datalist id="acreage-options">
                <option value="100" />
                <option value="200" />
                <option value="300" />
                <option value="400" />
                <option value="500" />
              </datalist>
              <span className="absolute text-sm transform -translate-y-1/2 right-8 top-1/2 text-neutral-500">{t.Metersquaredm}</span>
            </div>
            <div className="space-y-8 lg:px-40">

              <NcInputNumber
                label={`${t.MaxGuests}`}
                defaultValue={person}
                value={person}
                onChange={(value) => setPerson(value)}
              />

              <NcInputNumber
                label={`${t.Bedroom}`}
                defaultValue={bedroom}
                value={bedroom}
                onChange={(value) => setBedroom(value)} // Corrected to receive the value directly
              />

              <NcInputNumber
                label={`${t.Beds}`}
                defaultValue={beds}
                value={beds}
                onChange={(value) => setBeds(value)} // Corrected to receive the value directly
              />

              <NcInputNumber
                label={`${t.SingleBed}`}
                defaultValue={singlebed}
                value={singlebed}
                onChange={(value) => setSingleBed(value)} // Corrected to receive the value directly
              />

              <NcInputNumber
                label={`${t.DoubleBed}`}
                defaultValue={doublebed}
                value={doublebed}
                onChange={(value) => setDoubleBed(value)} // Corrected to receive the value directly
              />

              <NcInputNumber
                label={`${t.LivingRoom}`}
                defaultValue={LivingRoom}
                value={LivingRoom}
                onChange={(value) => setLivingRoom(value)} // Corrected to receive the value directly
              />

              <NcInputNumber
                label={`${t.Bathroom}`}
                defaultValue={bathroom}
                value={bathroom}
                onChange={(value) => setBathroom(value)} // Corrected to receive the value directly
              />
              <NcInputNumber
                label={`${t.WCs}`}
                defaultValue={WCs}
                value={WCs}
                onChange={(value) => setWCs(value)} // Corrected to receive the value directly
              />

              <NcInputNumber
                label={`${t.Kitchen}`}
                defaultValue={kitchen}
                value={kitchen}
                onChange={(value) => setKitchen(value)} // Corrected to receive the value directly
              />
              <NcInputNumber
                label={`${t.SocialRoom}`}
                defaultValue={SocialRoom}
                value={SocialRoom}
                onChange={(value) => setSocialRoom(value)} // Corrected to receive the value directly
              />

              <NcInputNumber
                label={`${t.CommonRoom}`}
                defaultValue={CommonRoom}
                value={CommonRoom}
                onChange={(value) => setCommonRoom(value)}
              />

              <NcInputNumber
                label={`${t.Sofa}`}
                defaultValue={Sofa}
                value={Sofa}
                onChange={(value) => setSofa(value)} // Corrected to receive the value directly
              />

            </div>
          </div>
        </div>
      </>


      <>
        <div className=" pb-2 mx-auto nc-PageAddListing1 md:pb-6">
          <div className="listingSection__wrap space-y-11">
            {/* Title */}
            <div>
              <h2 className="text-2xl font-semibold">{t.Amenities}</h2>
              <span className="block mt-2 text-neutral-500">
                {t.Amenitiesdesc}
              </span>
            </div>
            <div className="border-b w-14 border-neutral-200"></div>
            {/* FORM */}
            <div className="space-y-8">

              {/* Services */}
              <div className="space-y-4">
                <label className="text-lg font-semibold">{t.Services}</label>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {["Wifi", "TV", "PC Desk(workspace)"].map((amenity) => (
                    <Checkbox
                      key={amenity}
                      label={t[amenity] || amenity}
                      name={amenity}
                      checked={services.en.includes(amenity)}
                      onChange={(checked) => handleServicesChange(checked, amenity, setServices)}
                      required
                    />
                  ))}
                </div>
                {errors.services && (
                  <p className="mt-1 text-sm text-red-500">{errors.services}</p>
                )}
              </div>

              {/* Bathroom */}
              <div className="space-y-4">
                <label className="text-lg font-semibold">{t.Bathroom}</label>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {["Bathtub", "Shower", "Washing Machine", "Dryer", "Ironing"].map((amenity) => (
                    <Checkbox
                      key={amenity}
                      label={t[amenity] || amenity}
                      name={amenity}
                      checked={bathroomAmenities.en.includes(amenity)}
                      onChange={(checked) => handleBathroomAmenitiesChange(checked, amenity, setBathroomAmenities)}
                    />
                  ))}
                </div>
                {errors.bathroomAmenities && (
                  <p className="mt-1 text-sm text-red-500">{errors.bathroomAmenities}</p>
                )}
              </div>

              {/* Kitchen and Dining */}
              <div className="space-y-4">
                <label className="text-lg font-semibold">{t.KitchenandDining}</label>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {["Stovetop", "Oven", "Dishwasher", "Refrigerator", "Freezer", "Dining Table", "Coffee Maker"].map((amenity) => (
                    <Checkbox
                      key={amenity}
                      label={t[amenity] || amenity}
                      name={amenity}
                      checked={kitchenDiningAmenities.en.includes(amenity)}
                      onChange={(checked) => handleKitchenDiningAmenitiesChange(checked, amenity, setKitchenDiningAmenities)}
                    />
                  ))}
                </div>
                {errors.kitchenDiningAmenities && (
                  <p className="mt-1 text-sm text-red-500">{errors.kitchenDiningAmenities}</p>
                )}
              </div>

              {/* Heating and Cooling */}
              <div className="space-y-4">
                <label className="text-lg font-semibold">{t.HeatingandCooling}</label>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {["Indoor Fireplace", "Air Conditioning", "Central Heating"].map((amenity) => (
                    <Checkbox
                      key={amenity}
                      label={t[amenity] || amenity}
                      name={amenity}
                      checked={heatingCoolingAmenities.en.includes(amenity)}
                      onChange={(checked) => handleHeatingCoolingAmenitiesChange(checked, amenity, setHeatingCoolingAmenities)}
                    />
                  ))}
                </div>
                {errors.heatingCoolingAmenities && (
                  <p className="mt-1 text-sm text-red-500">{errors.heatingCoolingAmenities}</p>
                )}
              </div>

              {/* Home Safety */}
              <div className="space-y-4">
                <label className="text-lg font-semibold">{t.HomeSafety}</label>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {["Fire Extinguisher", "First Aid Kit"].map((amenity) => (
                    <Checkbox
                      key={amenity}
                      label={t[amenity] || amenity}
                      name={amenity}
                      checked={safetyAmenities.en.includes(amenity)}
                      onChange={(checked) => handleSafetyAmenitiesChange(checked, amenity, setSafetyAmenities)}
                    />
                  ))}
                </div>
                {errors.safetyAmenities && (
                  <p className="mt-1 text-sm text-red-500">{errors.safetyAmenities}</p>
                )}
              </div>

              {/* Wellness & Spa */}
              <div className="space-y-4">
                <label className="text-lg font-semibold">{t.WellnessSpa}</label>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {["Sauna", "Hot Tub", "Indoor Pool", "Outdoor Pool", "None"].map((amenity) => (
                    <Checkbox
                      key={amenity}
                      label={t[amenity] || amenity}
                      name={amenity}
                      checked={wellnessAmenities.en.includes(amenity)}
                      onChange={(checked) => handleWellnessAmenitiesChange(checked, amenity, setWellnessAmenities)}
                      disabled={wellnessAmenities.en.includes("None") && amenity !== "None"}
                    />
                  ))}
                </div>
                {errors.wellnessAmenities && (
                  <p className="mt-1 text-sm text-red-500">{errors.wellnessAmenities}</p>
                )}
              </div>

              {/* Outdoor */}
              <div className="space-y-4">
                <label className="text-lg font-semibold">{t.Outdoor}</label>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {["Firepit", "Balcony", "Terrace", "Outdoor dining area", "Grill", "None"].map((amenity) => (
                    <Checkbox
                      key={amenity}
                      label={t[amenity] || amenity}
                      name={amenity}
                      checked={outdoorAmenities.en.includes(amenity)}
                      onChange={(checked) => handleOutdoorAmenities(checked, amenity, setOutdoorAmenities)}
                      disabled={outdoorAmenities.en.includes("None") && amenity !== "None"} // Disable other checkboxes if "None" is selected
                    />
                  ))}
                </div>
                {errors.outdoorAmenities && (
                  <p className="mt-1 text-sm text-red-500">{errors.outdoorAmenities}</p>
                )}
              </div>

              {/* Parking and Facilities */}
              <div className="space-y-4">
                <label className="text-lg font-semibold">{t.ParkingandFacilities}</label>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {["Free Parking on-site", "Paid Parking on-site", "Public Parking"].map((amenity) => (
                    <Checkbox
                      key={amenity}
                      label={t[amenity] || amenity}
                      name={amenity}
                      checked={parkingFacilities.en.includes(amenity)}
                      onChange={(checked) => handleParkingFacilitiesChange(checked, amenity, setParkingFacilities)}
                    />
                  ))}
                </div>
                {errors.parkingFacilities && (
                  <p className="mt-1 text-sm text-red-500">{errors.parkingFacilities}</p>
                )}
              </div>

              {/* Check-in */}
              <div className="space-y-4">
                <label className="text-lg font-semibold">{t.Checkin}</label>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {["Self Check-in", "Reception", "Host Greeting"].map((amenity) => (
                    <Checkbox
                      key={amenity}
                      label={t[amenity] || amenity}
                      name={amenity}
                      checked={checkIn.en.includes(amenity)}
                      onChange={(checked) => handleCheckInChange(checked, amenity, setCheckIn)}
                    />
                  ))}
                </div>
                {errors.checkIn && (
                  <p className="mt-1 text-sm text-red-500">{errors.checkIn}</p>
                )}
              </div>

              {/* Meals */}
              <div className="space-y-4">
                <label className="text-lg font-semibold">{t.Meals}</label>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {["No Meals", "Breakfast", "Half Board", "Full Board", "All-Inclusive"].map((amenity) => (
                    <Checkbox
                      key={amenity}
                      label={t[amenity] || amenity}
                      name={amenity}
                      checked={meals.en.includes(amenity)}
                      onChange={(checked) => handleMealsChange(checked, amenity, setMeals)}
                      disabled={meals.en.includes("No Meals") && amenity !== "No Meals"}
                    />
                  ))}
                </div>
                {errors.meals && (
                  <p className="mt-1 text-sm text-red-500">{errors.meals}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </>

      <>
        <div className=' pb-2 mx-auto nc-PageAddListing1 md:pb-6'>
          <div className="listingSection__wrap space-y-11">
            <div>
              <h2 className="text-2xl font-semibold">
                {t.houserule}{" "}
              </h2>
              <span className="block mt-2 text-neutral-500">
                {t.houseruledesc}.
              </span>
            </div>
            <div className="w-full border-b border-neutral-200"></div>
            {/* FORM */}
            <div className="space-y-8">
              {/* ITEM */}
              {/* <div>
              <label className="text-lg font-semibold" htmlFor="">
                General amenities
              </label>
              <div className="grid grid-cols-1 gap-5 mt-4 sm:grid-cols-2 lg:grid-cols-3">
                {renderRadio("amenities", "Smoking", "Do not allow", "Do not allow", amenties === "Do not allow")}
                {renderRadio("amenities", "Smoking", "Allow", "Allow", amenties === "Allow")}
                {renderRadio("amenities", "Smoking", "Charge", "Charge", amenties === "Charge")}
              </div>
              {errors.amenties && (
                <p className="mt-2 text-sm text-red-500">{errors.amenties}</p>
              )}
            </div> */}

              {/* ITEM */}
              <div>
                <label className="text-lg font-semibold" htmlFor="">
                  {t.Pet}
                </label>
                <div className="grid grid-cols-1 gap-5 mt-4 sm:grid-cols-2 lg:grid-cols-3">
                  {renderRadio("pet", "Pet", t["Allowed at no extra charge"], "Allowed at no extra charge", pet.en === "Allowed at no extra charge")}
                  {renderRadio("pet", "Pet", t["Allowed with an additional fee"], "Allowed with an additional fee", pet.en === "Allowed with an additional fee")}
                  {renderRadio("pet", "Pet", t["Not Allowed"], "Not Allowed", pet.en === "Not Allowed")}
                </div>
                {errors.pet && (
                  <p className="mt-2 text-sm text-red-500">{errors.pet}</p>
                )}

                {/* Fee is only relevant when pets are allowed for a charge.
                    Optional — leave it at 0 to not charge anything. */}
                {pet.en === "Allowed with an additional fee" && (
                  <div className="mt-5 sm:max-w-xs">
                    <FormItem label={`${t.PetFeePerNight}`} isRequired={false}>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <span className="text-gray-500">€</span>
                        </div>
                        <Input
                          className="!pl-8 !pr-14"
                          placeholder="0.00"
                          value={petFeePerNight}
                          onChange={(e) => setPetFeePerNight(e.target.value)}
                          type="number"
                          min="0"
                          step="0.01"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-gray-500">EUR</span>
                        </div>
                      </div>
                    </FormItem>
                    <span className="block mt-2 text-sm text-neutral-500">
                      {t.PetFeePerNightDesc}
                    </span>
                  </div>
                )}
              </div>

              {/* ITEM */}
              <div>
                <label className="text-lg font-semibold" htmlFor="">
                  {t.Partyorganizing}
                </label>
                <div className="grid grid-cols-1 gap-5 mt-4 sm:grid-cols-2 lg:grid-cols-3">
                  {renderRadio("partyOrganizing", "PartyOrganizing", t["Allowed"], "Allowed", partyOrganizing.en === "Allowed")}
                  {renderRadio("partyOrganizing", "PartyOrganizing", t["Not Allowed"], "Not Allowed", partyOrganizing.en === "Not Allowed")}
                </div>
                {errors.partyOrganizing && (
                  <p className="mt-2 text-sm text-red-500">{errors.partyOrganizing}</p>
                )}

              </div>

              {/* ITEM */}
              <div>
                <label className="text-lg font-semibold" htmlFor="">
                  {t.Smoking}
                </label>
                <div className="grid grid-cols-1 gap-5 mt-4 sm:grid-cols-2 lg:grid-cols-3">
                  {renderRadio("smoking", "Smoking", t["Allowed indoors"], "Allowed indoors", smoking.en === "Allowed indoors")}
                  {renderRadio("smoking", "Smoking", t["Allowed in designated areas"], "Allowed in designated areas", smoking.en === "Allowed in designated areas")}
                  {renderRadio("smoking", "Smoking", t["Not allowed"], "Not allowed", smoking.en === "Not allowed")}
                </div>
                {errors.smoking && (
                  <p className="mt-2 text-sm text-red-500">{errors.smoking}</p>
                )}
              </div>

              {/* ----------- */}
              <div className="w-full border-b border-neutral-200"></div>
              <span className="block text-lg font-semibold">{t.Additionalrules}</span>
              {/* Render existing tags */}
              <div className="flow-root">
                <div className="-my-3 divide-y divide-neutral-100">
                  {tags.map((tag, index) => renderNoInclude(tag, index))}
                </div>
              </div>

              {/* Input to add a new tag */}
              <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:space-y-0 sm:space-x-5">
                <Input
                  className="!h-full"
                  placeholder="No smoking..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)} // Update the newTag state as user types
                />
                <ButtonPrimary className="flex-shrink-0 bg-[#357965]" type="button" onClick={handleAddTag}>
                  <Plus />
                  <span className="ml-3">{t.Addtag}</span>
                </ButtonPrimary>
              </div>
            </div>
          </div>
        </div>
      </>

      <>
        <div className=' pb-2 mx-auto nc-PageAddListing1 md:pb-6'>
          <div className="listingSection__wrap space-y-11">
            <div>
              <h2 className="text-2xl font-semibold">
                {t.Yourplacedescriptionforclient}
              </h2>
              <span className="block mt-2 text-neutral-500">
                {t.placedesc}.
              </span>
            </div>

            <Textarea
              placeholder="..."
              rows={14}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          {description.length < 100 && (
            <p className="mt-1 text-sm text-red-500">
              {t.Minimumcharactersrequired}. ({description.length}/100)
            </p>
          )}
        </div>
      </>

      <>
        <div className=' pb-2 mx-auto nc-PageAddListing1 md:pb-6'>
          <div className="listingSection__wrap space-y-11">
            <div>
              <h2 className="text-2xl font-semibold">{t.PicturesVRoftheplace}</h2>
              <span className="block mt-2 text-neutral-500">
                {t.pictuturedesc}.
              </span>
            </div>

            <div className="border-b w-14 border-neutral-200"></div>
            {/* FORM */}
            <div className="space-y-8">
              {/* Cover Image Section */}
              <div>
                <span className="text-lg font-semibold">{t.CoverImage}</span>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="flex justify-center px-6 pt-5 pb-2 mt-5 border-2 border-dashed rounded-md border-neutral-300">
                  <label
                    htmlFor="cover-image-upload"
                    className="flex flex-col items-center justify-center w-full h-full"
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center justify-center h-48">
                        <ClipLoader size={40} color="#0f766e" loading={isUploading} />
                        <span className="mt-2 text-sm text-neutral-600">{t.Uploading}...</span>
                      </div>
                    ) : coverImage ? (
                      <div className="relative flex items-center justify-center">
                        <img
                          src={coverImage}
                          alt="Cover Image"
                          className="object-cover w-64 h-40 rounded"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveCoverImage}
                          className="absolute p-1 text-sm text-white bg-red-500 rounded-full top-2 right-2"
                        >
                          <CircleX className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48">
                        <svg
                          className="w-12 h-12 text-neutral-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                          aria-hidden="true"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                        <label
                          htmlFor="cover-image-upload"
                          className="relative mt-2 font-medium text-teal-700 rounded-md cursor-pointer hover:text-teal-900 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                        >
                          <span>{t.UploadCoverImage}</span>
                          <input
                            id="cover-image-upload"
                            name="cover-image-upload"
                            type="file"
                            className="sr-only"
                            onChange={handleCoverImageChange}
                            accept=".jpg, .png"
                            required
                          />
                        </label>

                        <p className="mt-1 text-xs text-neutral-500">
                          PNG, JPG up to 10MB
                        </p>
                      </div>
                    )}
                  </label>
                </div>
                {errors.coverImage && (
                  <p className="mt-1 text-sm text-red-500">{errors.coverImage}</p>
                )}
              </div>

              {/* Additional Images Section */}
              {/* Additional Images Section */}
              <div>
                <span className="text-lg font-semibold">{t.PicturesofthePlace}</span>
                <div className="mt-5">
                  {/* Drop zone – always visible */}
                  <div
                    onDrop={handleRemainingDrop}
                    onDragOver={handleRemainingDragOver}
                    className="flex justify-center px-6 pt-5 pb-6 mt-1 border-2 border-dashed rounded-md border-neutral-300"
                  >
                    <label
                      htmlFor="additional-images-upload"
                      className="flex flex-col items-center justify-center w-full h-full"
                    >
                      <div className="space-y-1 text-center">
                        <svg
                          className="w-12 h-12 mx-auto text-neutral-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                          aria-hidden="true"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                        <label
                          htmlFor="additional-images-upload"
                          className="relative font-medium text-teal-700 rounded-md cursor-pointer hover:text-teal-900 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                        >
                          <span>{t.UploadAdditionalImages}</span>
                          <input
                            id="additional-images-upload"
                            name="additional-images-upload"
                            type="file"
                            className="sr-only"
                            onChange={handleRemainingImagesChange}
                            accept=".jpg, .png, .gif"
                            multiple
                          />
                        </label>
                        <p className="text-xs text-neutral-500 ">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Previews – ALWAYS show existing ones */}
                  {remainingPreviews.length > 0 && (
                    <ReactSortable
                      list={remainingPreviews.map((url, index) => ({ id: index, url }))}
                      setList={(newList) =>
                        setRemainingPreviews(newList.map((item) => item.url))
                      }
                      className="flex flex-wrap gap-4 mt-5"
                    >
                      {remainingPreviews.map((url, index) => (
                        <div key={index} className="relative cursor-move">
                          <img
                            src={url}
                            alt={`Preview ${index}`}
                            className="object-cover w-32 h-32 rounded"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveAdditionalImage(index)}
                            className="absolute top-0 right-0 p-1 text-sm text-white bg-red-500 rounded-full"
                          >
                            <CircleX className="w-4 h-4" strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                    </ReactSortable>
                  )}

                  {/* Loading indicator – only appears while uploading, does NOT hide previews */}
                  {isUploadingRemainingImages && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <ClipLoader size={28} color="#0f766e" loading={true} />
                      <span className="text-sm text-neutral-600">
                        {t.Uploadingimages}...
                      </span>
                    </div>
                  )}
                </div>

                {errors.remainingImages && (
                  <p className="mt-1 text-sm text-red-500">{errors.remainingImages}</p>
                )}
              </div>
            </div>

            <FormItem
              label={`${t.VirtualTourlink}`}
              isRequired={false}
            >
              <Input
                value={virtualTourUrl}
                onChange={handleVirtualTourUrlChange}
                placeholder=""
              />
              {errorMessage && (
                <div className="mt-1 text-sm text-red-500">
                  {errorMessage}
                </div>
              )}
            </FormItem>
          </div>
        </div>
      </>

      <>
        <div className=' pb-2 mx-auto nc-PageAddListing1 md:pb-6'>
          <div className="listingSection__wrap space-y-11">
            <div>
              <h2 className="text-2xl font-semibold">{t.Priceyourspace}</h2>
              <span className="block mt-2 text-neutral-500 ">
                {` ${t.Priceyourspacedesc}.`}
              </span>
            </div>
            <div className="border-b w-14 border-neutral-200"></div>
            {/* FORM */}
            <div className="space-y-8">
              {/* ITEM */}
              <FormItem label={`${t.Currency}`} isRequired={true}>
                <Select>
                  <option value="EUR">EUR</option>
                </Select>
              </FormItem>

              <FormItem label={`${t.PricePerNight}`} isRequired={true}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="text-gray-500">€</span>
                  </div>
                  <Input className="!pl-8 !pr-10" placeholder="0.00"
                    value={pricePerNight}
                    onChange={(e) => setPricePerNight(e.target.value)}
                    type="number"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-gray-500">EUR</span>
                  </div>
                </div>
              </FormItem>

              <FormItem label={`${t.PricePerPerson || "Price per person"}`} isRequired={false}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="text-gray-500">€</span>
                  </div>
                  <Input className="!pl-8 !pr-10" placeholder="0.00"
                    value={pricePerPerson}
                    onChange={(e) => setPricePerPerson(e.target.value)}
                    type="number"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-gray-500">EUR</span>
                  </div>
                </div>
              </FormItem>

              <div className="mt-6">
                <FormItem label={`${t.SpecialOffer}`} isRequired={false}>
                  <div className="flex flex-col items-center gap-4 2xl:flex-row">

                    <Input
                      type="text"
                      value={specialOfferName}
                      onChange={(e) => setSpecialOfferName(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded 2xl:w-1/3"
                      placeholder={t.SpecialOfferName || "Special Offer Name"}
                      disabled={priceRanges.length >= 1}
                    />

                    <Input
                      type="date"
                      value={priceRangeStartDate}
                      onChange={(e) => setPriceRangeStartDate(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded 2xl:w-1/3"
                      placeholder="From"
                      disabled={priceRanges.length >= 1}
                    />

                    {/* To Date */}
                    <Input
                      type="date"
                      value={priceRangeEndDate}
                      onChange={(e) => setPriceRangeEndDate(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded 2xl:w-1/3"
                      placeholder="To"
                      disabled={priceRanges.length >= 1}
                    />

                    {/* Price */}
                    <Input
                      type="number"
                      placeholder={`${t.Price}`}
                      value={priceRangePrice}
                      onChange={(e) => setPriceRangePrice(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded 2xl:w-1/3"
                      disabled={priceRanges.length >= 1}
                    />

                  </div>
                </FormItem>
              </div>

              {/* FLEXIBLE SEASONAL PRICING */}
              <div className="pt-8 mt-8 border-t border-neutral-200">
                <h3 className="text-lg font-semibold">
                  {t.FlexiblePricing || "Flexible pricing"}
                </h3>
                <span className="block mt-1 text-sm text-neutral-500">
                  {t.FlexiblePricingDesc ||
                    "Set different nightly rates per season and per length of stay. Leave the maximum empty for an open-ended range such as 7+ nights."}
                </span>

                <div className="mt-6 space-y-6">
                  {flexiblePrices.length === 0 && (
                    <p className="text-sm text-neutral-500">
                      {t.FlexiblePricingEmpty ||
                        "No price periods yet. Add one to charge seasonal rates."}
                    </p>
                  )}

                  {flexiblePrices.map((period, periodIndex) => (
                    <div
                      key={periodIndex}
                      className="p-4 border rounded-lg border-neutral-200 dark:border-neutral-700"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="font-medium">
                          {period.name?.trim() ||
                            `${t.FlexiblePricePeriod || "Period"} ${periodIndex + 1}`}
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleRemoveFlexiblePeriod(periodIndex)}
                          className="p-1 text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          aria-label={t.FlexiblePriceRemovePeriod || "Remove period"}
                        >
                          <CircleX className="w-5 h-5" strokeWidth={2} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-3">
                        <div>
                          <Label className="block">{t.FlexiblePricePeriodName || "Period name"}</Label>
                          <Input
                            type="text"
                            className="mt-1"
                            value={period.name}
                            onChange={(e) =>
                              handleFlexiblePeriodChange(periodIndex, "name", e.target.value)
                            }
                            placeholder={t.FlexiblePricePeriodNamePlaceholder || "Summer"}
                          />
                        </div>
                        <div>
                          <Label className="block">{t.From || "From"}</Label>
                          <Input
                            type="date"
                            className="mt-1"
                            value={period.start}
                            onChange={(e) =>
                              handleFlexiblePeriodChange(periodIndex, "start", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label className="block">{t.To || "To"}</Label>
                          <Input
                            type="date"
                            className="mt-1"
                            value={period.end}
                            onChange={(e) =>
                              handleFlexiblePeriodChange(periodIndex, "end", e.target.value)
                            }
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <Label className="block">{t.Note || "Note"}</Label>
                        <Textarea
                          className="mt-1"
                          rows={2}
                          value={period.note}
                          onChange={(e) =>
                            handleFlexiblePeriodChange(periodIndex, "note", e.target.value)
                          }
                          placeholder={
                            t.FlexiblePriceNotePlaceholder || "Peak season, minimum 2 nights"
                          }
                        />
                      </div>

                      <div className="mt-5">
                        <Label className="block">{t.FlexiblePriceTiers || "Rates by length of stay"}</Label>

                        <div className="mt-2 space-y-3">
                          {period.tiers.map((tier, tierIndex) => (
                            <div
                              key={tierIndex}
                              className="flex flex-col gap-3 sm:flex-row sm:items-center"
                            >
                              <div className="flex items-center flex-1 gap-2">
                                <span className="text-sm shrink-0 text-neutral-500">
                                  {t.Nights || "Nights"}
                                </span>
                                <Input
                                  type="number"
                                  min={1}
                                  value={tier.minNights}
                                  onChange={(e) =>
                                    handleFlexibleTierChange(
                                      periodIndex,
                                      tierIndex,
                                      "minNights",
                                      e.target.value
                                    )
                                  }
                                  placeholder="1"
                                />
                                <span className="text-neutral-500">–</span>
                                <Input
                                  type="number"
                                  min={1}
                                  value={tier.maxNights}
                                  onChange={(e) =>
                                    handleFlexibleTierChange(
                                      periodIndex,
                                      tierIndex,
                                      "maxNights",
                                      e.target.value
                                    )
                                  }
                                  placeholder={t.NoLimit || "No limit"}
                                />
                              </div>

                              <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                  <span className="text-gray-500">€</span>
                                </div>
                                <Input
                                  type="number"
                                  className="!pl-8 !pr-10"
                                  value={tier.price}
                                  onChange={(e) =>
                                    handleFlexibleTierChange(
                                      periodIndex,
                                      tierIndex,
                                      "price",
                                      e.target.value
                                    )
                                  }
                                  placeholder="0.00"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                  <span className="text-gray-500">EUR</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveFlexibleTier(periodIndex, tierIndex)}
                                className="self-end p-1 text-red-500 rounded shrink-0 hover:bg-red-50 dark:hover:bg-red-900/20 sm:self-auto"
                                aria-label={t.FlexiblePriceRemoveTier || "Remove rate"}
                              >
                                <CircleX className="w-5 h-5" strokeWidth={2} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddFlexibleTier(periodIndex)}
                          className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400"
                        >
                          <Plus className="w-4 h-4" strokeWidth={2} />
                          {t.FlexiblePriceAddTier || "Add night range"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddFlexiblePeriod}
                  className="inline-flex items-center gap-1 mt-5 text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400"
                >
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  {t.FlexiblePriceAddPeriod || "Add price period"}
                </button>

                {errors.flexiblePrices && (
                  <p className="mt-2 text-sm text-red-500">{errors.flexiblePrices}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </>

      <>
        <div className=' pb-2 mx-auto nc-PageAddListing1 md:pb-6'>
          <div className="listingSection__wrap space-y-11">
            <div>
              <h2 className="text-2xl font-semibold">{t.Howlongcanguestsstay}?</h2>
              <span className="block mt-2 text-neutral-500">
                {t.longdtaydesc}
              </span>
            </div>
            <div className="border-b w-14 border-neutral-200"></div>
            {/* FORM */}
            <div className="space-y-7">
              {/* ITEM */}
              <NcInputNumber
                label={`${t.Nightsmin}`}
                defaultValue={nightMin}
                value={nightMin}
                min={1} // Ensures the minimum value is 1
                onChange={(value) => setNightMin(value)}
              />
              <NcInputNumber
                label={`${t.Nightsmax}`}
                defaultValue={nightMax}
                value={nightMax}
                min={nightMin} // Dynamically set min value
                onChange={(value) => setNightMax(value)}
              />
            </div>
            <h2 className="text-2xl font-semibold">{t.ArrivalandDeparture}</h2>
            <div className="border-b w-14 border-neutral-200"></div>
            <FormItem label={`${t.CheckinFrom}`} isRequired={true}>
              {/* <Input
            className="w-full p-2 text-gray-900 bg-white border rounded-md dark:text-white dark:bg-gray-800"
            placeholder="00:00"
            value={arrivalFrom}
            onChange={handleTimeChange}
            type="time"
            step="60" // Ensures minute precision, prevents seconds input
            min="00:00" // Earliest allowed time (Midnight)
            max="23:59" // Latest allowed time (23:59)
            required
          /> */}
              <ReactInputMask
                mask="99:99"
                placeholder="HH:mm"
                value={arrivalFrom}
                onChange={(e) => setArrivalFrom(e.target.value)}
                onBlur={(e) => handleBlur(e, "arrivalFrom")}
                className="w-full p-2 text-gray-900 bg-white border rounded-md dark:bg-gray-800 dark:text-white"
                required
              />
              {errors.arrivalFrom && <p className="mt-1 text-sm text-red-500">{errors.arrivalFrom}</p>}

            </FormItem>

            <FormItem label={`${t.CheckinTo}`} isRequired={true}>
              {/* <Input 
              placeholder="00:00" 
              value={arrivalTo}
              onChange={(e) => setArrivalTo(e.target.value)} 
              type="time"
              required
            /> */}
              <ReactInputMask
                mask="99:99"
                placeholder="HH:mm"
                value={arrivalTo}
                onChange={(e) => setArrivalTo(e.target.value)}
                onBlur={(e) => handleBlur(e, "arrivalTo")}
                className="w-full p-2 text-gray-900 bg-white border rounded-md dark:bg-gray-800 dark:text-white"
                required
              />
              {errors.arrivalTo && <p className="mt-1 text-sm text-red-500">{errors.arrivalTo}</p>}
            </FormItem>

            <FormItem label={`${t.CheckoutFrom}`} isRequired={true}>
              {/* <Input 
              placeholder="00:00" 
              value={departureFrom}
              onChange={(e) => setDepartureFrom(e.target.value)} 
              type="time"
              required
            /> */}
              <ReactInputMask
                mask="99:99"
                placeholder="HH:mm"
                value={departureFrom}
                onChange={(e) => setDepartureFrom(e.target.value)}
                onBlur={(e) => handleBlur(e, "departureFrom")}
                className="w-full p-2 text-gray-900 bg-white border rounded-md dark:bg-gray-800 dark:text-white"
                required
              />
              {errors.departureFrom && <p className="mt-1 text-sm text-red-500">{errors.departureFrom}</p>}
            </FormItem>

            <FormItem label={`${t.CheckoutTo}`} isRequired={true}>
              {/* <Input
              placeholder="00:00" 
              value={departureTo}
              onChange={(e) => setDepartureTo(e.target.value)} 
              type="time"
              required
            /> */}
              <ReactInputMask
                mask="99:99"
                placeholder="HH:mm"
                value={departureTo}
                onChange={(e) => setDepartureTo(e.target.value)}
                onBlur={(e) => handleBlur(e, "departureTo")}
                className="w-full p-2 text-gray-900 bg-white border rounded-md dark:bg-gray-800 dark:text-white"
                required
              />
              {errors.departureTo && <p className="mt-1 text-sm text-red-500">{errors.departureTo}</p>}
            </FormItem>
            <div>
              <h2 className="text-2xl font-semibold">{t.SpecialNote}</h2>
              {/* <span className="block mt-2 text-neutral-500">
              {t.SpecialNotedesc}
            </span> */}
            </div>
            {/* <div className="border-b w-14 border-neutral-200"></div> */}
            <FormItem>
              <Textarea
                placeholder={`${t.specialNotedesc}`}
                rows={4}
                value={specialNote}
                onChange={(e) => setSpecialNote(e.target.value)}
              />
            </FormItem>
            <div>
              <h2 className="text-2xl font-semibold">{t.CancellationPolicy}</h2>
              {/* <span className="block mt-2 text-neutral-500">
              {t.CancellationPolicydesc}
            </span> */}
            </div>
            {/* <div className="border-b w-14 border-neutral-200"></div> */}
            {/*
              The binding policy. Before this field existed the host could only
              write free text, which nothing could act on — so every booking
              silently fell back to `standard` and a guest could be shown terms
              they were not actually agreeing to.
            */}
            <FormItem label={t.CancellationPolicyType || "Refund policy"}>
              <div className="grid gap-2 sm:grid-cols-2">
                {POLICY_CHOICES.map((choice) => (
                  <label
                    key={choice.value}
                    className={`flex cursor-pointer flex-col rounded-xl border p-3 transition ${
                      cancellationPolicyType === choice.value
                        ? "border-[#357965] bg-[#357965]/5"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="cancellationPolicyType"
                        value={choice.value}
                        checked={cancellationPolicyType === choice.value}
                        onChange={() => setCancellationPolicyType(choice.value)}
                      />
                      <span className="font-medium">{t[choice.labelKey] || choice.fallback}</span>
                    </span>
                    <span className="mt-1 pl-6 text-sm text-neutral-500">
                      {t[choice.descKey] || choice.descFallback}
                    </span>
                  </label>
                ))}
              </div>
            </FormItem>

            {cancellationPolicyType === "custom" && (
              <FormItem
                label={t.CustomPolicyTiers || "Custom refund tiers"}
                desc={
                  t.CustomPolicyTiersDesc ||
                  "Up to three tiers. The last one must be 0 hours / 0% so a no-show never earns a refund."
                }
              >
                <div className="space-y-2">
                  {customPolicyTiers.map((tier, index) => {
                    const isLast = index === customPolicyTiers.length - 1;
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          className="w-28 rounded-lg border border-neutral-200 p-2"
                          value={tier.hoursBefore}
                          disabled={isLast}
                          onChange={(e) => updateTier(index, "hoursBefore", e.target.value)}
                        />
                        <span className="text-sm text-neutral-500">
                          {t.HoursBeforeCheckIn || "hours before check-in"} →
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="w-24 rounded-lg border border-neutral-200 p-2"
                          value={tier.refundPercent}
                          disabled={isLast}
                          onChange={(e) => updateTier(index, "refundPercent", e.target.value)}
                        />
                        <span className="text-sm text-neutral-500">% {t.Refund || "refund"}</span>
                        {isLast && (
                          <span className="text-xs text-neutral-400">
                            {t.RequiredFinalTier || "(required final tier)"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {customPolicyTiers.length < 3 && (
                  <button
                    type="button"
                    className="mt-2 text-sm font-medium text-[#357965]"
                    onClick={addTier}
                  >
                    + {t.AddTier || "Add a tier"}
                  </button>
                )}

                {policyErrors.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-red-600">
                    {policyErrors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                )}
              </FormItem>
            )}

            <FormItem
              label={t.CancellationPolicyNote || "Note for guests (optional)"}
              desc={
                t.CancellationPolicyNoteDesc ||
                "Shown alongside the refund tiers above. Descriptive only — the tiers decide the refund."
              }
            >
              <Textarea
                placeholder={`${t.Cancellationpolicydesc}`}
                rows={4}
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
              />
            </FormItem>

            {/*  */}
            <div>
              <h2 className="text-2xl font-semibold">{t.Setyouravailability}</h2>
              <span className="block mt-2 text-neutral-500">
                {t.Setyouravailabilitydesc}.
              </span>
            </div>

            <div className="addListingDatePickerExclude">
              <Calendar
                onChange={handleDateChange}
                selectRange={true} // Enables bulk date selection
                tileClassName={({ date }) => {
                  const isExcluded = excludedDates.includes(date.toDateString());
                  const isPastDate = date < new Date();
                  return isExcluded || isPastDate ? "crossed-out" : "";
                }}
                showDoubleView={window.innerWidth > 1023} // Single month on mobile, double month on larger screens
                next2Label={null}
                prev2Label={null}
                inline
                className="w-full p-6 bg-white border-2 border-gray-300 rounded-lg shadow-lg md:p-8 lg:p-10" // Full width with responsive padding
                calendarClassName="rounded-lg bg-white overflow-hidden border border-gray-200 shadow-md grid grid-cols-2 gap-0 w-full" // Full width
              />
              <style>{`
              .crossed-out {
                text-decoration: line-through !important;
                color: gray !important;
                background-color: lightgray !important;
              }
              .react-calendar__tile--active {
                background-color: #357965 !important;
                color: white !important;
              }
              .react-calendar__month-view__days__day--weekend {
                color: black;
              }
              .react-calendar {
                width: 100% !important;
              }
            `}</style>
            </div>

            {/* Calendar synchronization — optional.
                It sits under the availability calendar because that is where
                the host is already thinking about which dates are free, and it
                saves them a second trip to the sidebar. Nothing here blocks
                Submit: a listing saves with no calendars, a half-typed URL, or
                a link that turns out to be dead. */}
            <div>
              <h2 className="flex flex-wrap items-center gap-3 text-2xl font-semibold">
                {t.CalenderSynchronization}
                <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-100 border border-neutral-200 rounded-lg">
                  {t.OptionalLabel}
                </span>
              </h2>
              <span className="block mt-2 text-neutral-500">
                {t.ConnectOneOrMoreCalendars}
              </span>
            </div>

            <CalendarSyncRows
              t={t}
              rows={calendarFeedRows}
              errors={calendarFeedErrors}
              results={calendarFeedResults}
              onChange={updateCalendarRow}
              onAdd={addCalendarRow}
              onRemove={removeCalendarRow}
              disabled={isSubmitting}
            />

            {/* The export link needs an id, so it only exists once the listing
                has been saved at least once. Without pasting it into Airbnb the
                sync is one-directional and double bookings follow. */}
            {isEditMode && (
              <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
                <p className="flex items-center gap-2 mb-1 text-sm font-bold text-[#1E3E2B]">
                  <Link2 className="w-4 h-4 text-[#319A81] shrink-0" />
                  {t.ExportURL}
                </p>
                <p className="mb-3 text-sm text-neutral-500">
                  {t.CopyThisLinkIntoYourListingPlatform}
                </p>
                <div className="flex flex-col gap-3 md:flex-row">
                  <input
                    type="text"
                    readOnly
                    value={`${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/${accommodationId}/calendar.ics`}
                    className="w-full p-3 text-sm font-medium bg-white border border-neutral-200 rounded-lg text-[#1E3E2B] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/${accommodationId}/calendar.ics`
                      );
                      toast.success(t.URLCopiedToClipboard);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-[#319A81] hover:bg-[#257562] rounded-lg transition-all duration-200 active:scale-95 shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                    {t.Copy}
                  </button>
                </div>
              </div>
            )}

            {/* Výplaty / Stripe — the last section before Save.
                Placed here on purpose: it is the one thing that decides whether
                the listing can go live, so it should be the last thing the host
                sees before saving. It still never blocks the save. */}
            <PayoutAccountSection
              t={t}
              hostId={hostId}
              selectedAccountId={payoutAccountId}
              onSelect={(id) => { markTouched(); setPayoutAccountId(id); }}
              // Stripe onboarding leaves the site. The draft is autosaved, so
              // this only has to bring the host back to the right page —
              // restoring the form is the draft's job.
              returnTo="/Profile?tab=Accommodation"
              disabled={isSubmitting}
            />

          </div>
        </div>
      </>

      <div className='flex justify-center px-6 py-3 mx-auto border nc-PageAddListing1 lg:py-2'>
        <button type='submit' disabled={isSubmitting} className='bg-[#357965] px-8 py-4 text-white rounded-full'>
          {t.Submit}
        </button>
      </div>

    </form>
  );
};

export default AddAccommodation;