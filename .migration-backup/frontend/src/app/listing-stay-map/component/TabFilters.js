"use client";

import React, { Fragment, useContext, useState, useRef, useEffect } from "react";
import { Dialog, Transition, Popover } from "@headlessui/react";
import NcInputNumber from "../../Shared/NcInputNumber";
import ButtonPrimary from "../../Shared/ButtonPrimary";
import ButtonThird from "../../Shared/Button/ButtonThird";
import ButtonClose from "../../Shared/ButtonClose";
import Checkbox from "../../Shared/Checkbox";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import convertNumbThousand from "../../utlis/convertNumThousand";
import { FormContext } from "../../FormContext";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";
import { ArrowUpDown, ChevronDown } from "lucide-react";

const TabFilters = () => {
  const [isOpenMoreFilter, setisOpenMoreFilter] = useState(false);
  const [isOpenMoreFilterMobile, setisOpenMoreFilterMobile] = useState(false);
  /* Removed rangePrices init from here */
  const menuRef = useRef(null);
  const translations = { en, sk };
  const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
  const [language, setLanguage] = useState(lang || "sk");

  // Update language state when `lang` changes in FormContext
  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  const typeOfPaces = {
    en: [
      {
        name: "Entire place",
        description: "Have a place to yourself",
        key: "Entire place"
      },
      {
        name: "Private room",
        description: "Have your own room and share some common spaces",
        key: "Private room"
      },
      {
        name: "Hotel room",
        description: "Have a private or shared room in a boutique hotel, hostel, and more",
        key: "Hotel room"
      },
      {
        name: "Shared room",
        description: "Stay in a shared space, like a common room",
        key: "Share room"
      }
    ],
    sk: [
      {
        name: "Celé ubytovanie",
        description: "Majte miesto len pre seba",
        key: "Entire place"
      },
      {
        name: "Súkromná izba",
        description: "Majte vlastnú izbu a zdieľajte spoločné priestory",
        key: "Private room"
      },
      {
        name: "Hotelová izba",
        description: "Majte súkromnú alebo zdieľanú izbu v butikovom hoteli, hosteli a ďalších",
        key: "Hotel room"
      },
      {
        name: "Zdieľaná izba",
        description: "Zostaňte v spoločnom priestore, napríklad v spoločenskej miestnosti",
        key: "Share room"
      }
    ]
  };



  const moreFilter1 = {
    en: [
      { name: "Wifi", key: "Wifi" },
      { name: "TV", key: "TV" },
      { name: "PC Desk(workspace)", key: "PC Desk(workspace)" }
    ],
    sk: [
      { name: "Wi-Fi", key: "Wifi" },
      { name: "Televízia", key: "TV" },
      { name: "PC stôl (pracovný priestor)", key: "PC Desk(workspace)" }
    ]
  };

  const moreFilter2 = {
    en: [
      { name: "Bathtub", key: "Bathtub" },
      { name: "Shower", key: "Shower" },
      { name: "Washing Machine", key: "Washing Machine" },
      { name: "Dryer", key: "Dryer" },
      { name: "Ironing", key: "Ironing" }
    ],
    sk: [
      { name: "Vaňa", key: "Bathtub" },
      { name: "Sprcha", key: "Shower" },
      { name: "Práčka", key: "Washing Machine" },
      { name: "Sušička", key: "Dryer" },
      { name: "Žehlenie", key: "Ironing" }
    ]
  };

  const moreFilter5 = {
    en: [
      { name: "Stovetop", key: "Stovetop" },
      { name: "Oven", key: "Oven" },
      { name: "Dishwasher", key: "Dishwasher" },
      { name: "Refrigerator", key: "Refrigerator" },
      { name: "Freezer", key: "Freezer" },
      { name: "Dining Table", key: "Dining Table" },
      { name: "Coffee Maker", key: "Coffee Maker" }
    ],
    sk: [
      { name: "Sporák", key: "Stovetop" },
      { name: "Rúra", key: "Oven" },
      { name: "Umývačka riadu", key: "Dishwasher" },
      { name: "Chladnička", key: "Refrigerator" },
      { name: "Mraznička", key: "Freezer" },
      { name: "Jedálenský stôl", key: "Dining Table" },
      { name: "Kávovar", key: "Coffee Maker" }
    ]
  };

  const moreFilter6 = {
    en: [
      { name: "Indoor Fireplace", key: "Indoor Fireplace" },
      { name: "Air Conditioning", key: "Air Conditioning" },
      { name: "Central Heating", key: "Central Heating" }
    ],
    sk: [
      { name: "Vnútorný krb", key: "Indoor Fireplace" },
      { name: "Klimatizácia", key: "Air Conditioning" },
      { name: "Ústredné kúrenie", key: "Central Heating" }
    ]
  };

  const moreFilter7 = {
    en: [
      { name: "Fire Extinguisher", key: "Fire Extinguisher" },
      { name: "First Aid Kit", key: "First Aid Kit" }
    ],
    sk: [
      { name: "Hasiaci prístroj", key: "Fire Extinguisher" },
      { name: "Lekárnička", key: "First Aid Kit" }
    ]
  };

  const moreFilter8 = {
    en: [
      { name: "Sauna", key: "Sauna" },
      { name: "Hot Tub", key: "Hot Tub" },
      { name: "Indoor pool", key: "Indoor Pool" },
      { name: "Outdoor pool", key: "Outdoor Pool" }
    ],
    sk: [
      { name: "Sauna", key: "Sauna" },
      { name: "Vírivka", key: "Hot Tub" },
      { name: "Vnútorný bazén", key: "Indoor Pool" },
      { name: "Vonkajší bazén", key: "Outdoor Pool" }
    ]
  };

  const moreFilter9 = {
    en: [
      { name: "Firepit", key: "Firepit" },
      { name: "Balcony", key: "Balcony" },
      { name: "Terrace", key: "Terrace" },
      { name: "Outdoor dining area", key: "Outdoor dining area" },
      { name: "Grill", key: "Grill" }
    ],
    sk: [
      { name: "Ohnisko", key: "Firepit" },
      { name: "Balkón", key: "Balcony" },
      { name: "Terasa", key: "Terrace" },
      { name: "Vonkajšia jedálenská zóna", key: "Outdoor dining area" },
      { name: "Gril", key: "Grill" }
    ]
  };

  const moreFilter10 = {
    en: [
      { name: "Free Parking on-site", key: "Free Parking on-site" },
      { name: "Paid Parking on-site", key: "Paid Parking on-site" },
      { name: "Public Parking", key: "Public Parking" }
    ],
    sk: [
      { name: "Bezplatné parkovanie na mieste", key: "Free Parking on-site" },
      { name: "Platené parkovanie na mieste", key: "Paid Parking on-site" },
      { name: "Verejné parkovanie", key: "Public Parking" }
    ]
  };


  const moreFilter11 = {
    en: [
      { name: "Self Check-in", key: "Self Check-in" },
      { name: "Reception", key: "Reception" },
      { name: "Host Greeting", key: "Host Greeting" }
    ],
    sk: [
      { name: "Samoobslužné ubytovanie", key: "Self Check-in" },
      { name: "Recepcia", key: "Reception" },
      { name: "Privítanie hostiteľa", key: "Host Greeting" }
    ]
  };

  const moreFilter12 = {
    en: [
      { name: "No Meals", key: "No Meals" },
      { name: "Breakfast", key: "Breakfast" },
      { name: "Full Board", key: "Full Board" },
      { name: "All-Inclusive", key: "All-Inclusive" }
    ],
    sk: [
      { name: "Bez stravy", key: "No Meals" },
      { name: "Raňajky", key: "Breakfast" },
      { name: "Plná penzia", key: "Full Board" },
      { name: "All-Inclusive", key: "All-Inclusive" }
    ]
  };

  const moreFilter3 = {
    en: [
      { name: "Nature House", key: "Nature House" },
      { name: "Wooden House", key: "Wooden House" },
      { name: "Houseboats", key: "Houseboats" },
      { name: "Farm House", key: "Farm House" },
      { name: "Dome House", key: "Dome House" },
      { name: "Wooden Dome", key: "Wooden Dome" },
      { name: "Apartment", key: "Apartment" },
      { name: "Glamping", key: "Glamping" },
      { name: "Cottages", key: "Cottages" },
      { name: "Motels/Hostel", key: "Motels/Hostel" },
      { name: "Wooden Houses", key: "Wooden Houses" },
      { name: "Guest Houses", key: "Guest Houses" },
      { name: "Secluded Accommodation", key: "Secluded Accommodation" },
      { name: "Hotels", key: "Hotels" },
      { name: "Dormitories", key: "Dormitories" },
      { name: "Campsites", key: "Campsites" },
      { name: "Treehouses", key: "Treehouses" },
      { name: "Rooms", key: "Rooms" },
      { name: "Entire Homes", key: "Entire Homes" },
      { name: "Luxury Accommodation", key: "Luxury Accommodation" }
    ],
    sk: [
      { name: "Prírodný dom", key: "Nature House" },
      { name: "Drevený dom", key: "Wooden House" },
      { name: "Hausbóty", key: "Houseboats" },
      { name: "Farma", key: "Farm House" },
      { name: "Kupolovitý dom", key: "Dome House" },
      { name: "Drevená kupola", key: "Wooden Dome" },
      { name: "Apartmán", key: "Apartment" },
      { name: "Glamping", key: "Glamping" },
      { name: "Chatky", key: "Cottages" },
      { name: "Motel/Hostel", key: "Motels/Hostel" },
      { name: "Drevené domy", key: "Wooden Houses" },
      { name: "Penzióny", key: "Guest Houses" },
      { name: "Odľahlé ubytovanie", key: "Secluded Accommodation" },
      { name: "Hotely", key: "Hotels" },
      { name: "Internáty", key: "Dormitories" },
      { name: "Kempingy", key: "Campsites" },
      { name: "Domy na strome", key: "Treehouses" },
      { name: "Izby", key: "Rooms" },
      { name: "Celé domy", key: "Entire Homes" },
      { name: "Luxusné ubytovanie", key: "Luxury Accommodation" }
    ]
  };

  const moreFilter4 = {
    en: [
      { name: "Allowed indoors", key: "Allowed indoors" },
      { name: "Allowed in designated areas", key: "Allowed in designated areas" },
      { name: "Not allowed", key: "Not allowed" }
    ],
    sk: [
      { name: "Povolené v interiéri", key: "Allowed indoors" },
      { name: "Povolené v určených oblastiach", key: "Allowed in designated areas" },
      { name: "Nie je povolené", key: "Not allowed" }
    ]
  };
  const moreFilter13 = {
    en: [
      { name: "Allowed at no extra charge", key: "Allowed at no extra charge" },
      { name: "Allowed with an additional fee", key: "Allowed with an additional fee" },
      { name: "Not Allowed", key: "Not Allowed" }
    ],
    sk: [
      { name: "Povolené bez dodatočných poplatkov", key: "Allowed at no extra charge" },
      { name: "Povolené s dodatočným poplatkom", key: "Allowed with an additional fee" },
      { name: "Nie je povolené", key: "Not Allowed" }
    ]
  };
  const moreFilter14 = {
    en: [
      { name: "Allowed", key: "Allowed" },
      { name: "Not Allowed", key: "Not Allowed" }
    ],
    sk: [
      { name: "Povolené", key: "Allowed" },
      { name: "Nie je povolené", key: "Not Allowed" }
    ]
  };

  const {
    location,
    person,
    city,
    updateCity,
    country,
    drop,
    pricemins,
    updatedrop,
    pricemaxs,
    updatepricemins,
    Bathroomss,
    updatepricemaxs,
    Bedss,
    Beds,
    updateBeds,
    updateBedss,
    updateBathroomss,
    updaterental,
    updateFacilities,
    Facilities,
    updateAmenities,
    Amenities,
    updateservices,
    updateBathroomAmenities,
    updateKitchenDiningAmenities,
    updateHeatingCoolingAmenities,
    updateSafetyAmenities,
    updateWellnessAmenities,
    updateOutdoorAmenities,
    updateParkingFacilities,
    updateCheckInOptions,
    updateMeals,
    updatePets,
    smoking,
    updateSmoking,

    updatePartyOrganizing,



    Equipment,
    enddate,
    startdate,
  } = useContext(FormContext);

  const [rangePrices, setRangePrices] = useState([
    Number(pricemins) || 0,
    Number(pricemaxs) || 2000
  ]);

  useEffect(() => {
    setRangePrices([
      Number(pricemins) || 0,
      Number(pricemaxs) || 2000
    ]);
  }, [pricemins, pricemaxs]);
  const { sortOption, updatesort } = useContext(FormContext);
  const [showSortingOptions, setShowSortingOptions] = useState(false);

  const handleSortingClick = () => {
    setShowSortingOptions(!showSortingOptions);  // Toggle the visibility of the sorting options
  };

  useEffect(() => {
    console.log("Sort option updated in UI:", sortOption);
  }, [sortOption]);
  const handleSortOption = (option) => {
    console.log("Clicked option:", option); // Debugging log
    if (option === "highToLow") {
      console.log("Updating sort to: High to Low");
      updatesort("highToLow");
    }
    if (option === "lowToHigh") {
      console.log("Updating sort to: Low to High");
      updatesort("lowToHigh");
    }


    setShowSortingOptions(false);
  };


  // Hide menu on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (showSortingOptions) setShowSortingOptions(false);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [showSortingOptions]);

  // Hide menu on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowSortingOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  //
  const closeModalMoreFilter = () => setisOpenMoreFilter(false);
  const openModalMoreFilter = () => setisOpenMoreFilter(true);
  //
  const closeModalMoreFilterMobile = () => setisOpenMoreFilterMobile(false);
  const openModalMoreFilterMobile = () => setisOpenMoreFilterMobile(true);
  /* console.log("TabFilters Render - Context Values:", { Beds, Bedss, Bathroomss }); */
  const [beds, setBeds] = useState(Number(Beds) || 0);
  const [bedrooms, setBedrooms] = useState(Number(Bedss) || 0);
  const [bathrooms, setBathrooms] = useState(Number(Bathroomss) || 0);

  useEffect(() => {
    setBeds(Number(Beds) || 0);
    setBedrooms(Number(Bedss) || 0);
    setBathrooms(Number(Bathroomss) || 0);
  }, [Beds, Bedss, Bathroomss]);
  const [selectedTypes, setSelectedTypes] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // Only one selected type

  // Update services when language changes
  useEffect(() => {
    setServices(
      moreFilter1[language].map((filter) => ({
        ...filter,
        isSelected: false
      }))
    );
    setBathroomAmenities(
      moreFilter2[language].map((filter) => ({
        ...filter,
        isSelected: false
      }))
    );
    setKitchenDiningAmenities(
      moreFilter5[language].map((filter) => ({
        ...filter,
        isSelected: false
      }))
    );

    setHeatingCoolingAmenities(
      moreFilter6[language].map((filter) => ({
        ...filter,
        isSelected: false
      }))
    );
    setPartyOrganizing(
      moreFilter14[language].map((filter) => ({
        ...filter,
        isSelected: false
      }))
    );
    setPets(
      moreFilter13[language].map((filter) => ({
        ...filter,
        isSelected: false
      }))
    );
    setPropertyType(
      moreFilter3[language].map((filter) => ({
        ...filter,
        isSelected: false
      }))
    );
    setMeals(
      moreFilter12[language].map((filter) => ({
        ...filter,
        isSelected: false
      }))
    );
    setCheckIn(
      moreFilter11[language].map((filter) => ({
        ...filter,
        isSelected: false
      }))
    );
    setParkingFacilities(
      moreFilter10[language].map((filter) => ({
        ...filter,
        isSelected: false
      }))
    );
    setOutdoorAmenities(
      moreFilter9[language].map((filter) => ({
        ...filter,
        isSelected: false
      }))
    );
    setWellnessAmenities(
      moreFilter8[language].map((filter) => ({
        ...filter,
        isSelected: false
      }))
    );
    setSafetyAmenities(
      moreFilter7[language].map((filter) => ({
        ...filter,
        isSelected: false
      }))
    );
    setHouseRules(
      moreFilter4[language].map((filter) => ({
        ...filter,
        isSelected: false
      }))
    );
  }, [language]);
  const [services, setServices] = useState(
    moreFilter1[language].map((filter) => ({
      ...filter,
      isSelected: filter.defaultChecked || false,
    }))
  );
  const [bathroomAmenities, setBathroomAmenities] = useState(
    moreFilter2[language].map((filter) => ({
      ...filter,
      isSelected: filter.defaultChecked || false,
    }))
  );
  const [kitchenDiningAmenities, setKitchenDiningAmenities] = useState(
    moreFilter5[language].map((filter) => ({
      ...filter,
      isSelected: filter.defaultChecked || false,
    }))
  );
  const [safetyAmenities, setSafetyAmenities] = useState(
    moreFilter7[language].map((filter) => ({
      ...filter,
      isSelected: filter.defaultChecked || false,
    }))
  );
  const [wellnessAmenities, setWellnessAmenities] = useState(
    moreFilter8[language].map((filter) => ({
      ...filter,
      isSelected: filter.defaultChecked || false,
    }))
  );
  const [outdoorAmenities, setOutdoorAmenities] = useState(
    moreFilter9[language].map((filter) => ({
      ...filter,
      isSelected: filter.defaultChecked || false,
    }))
  );

  const [parkingFacilities, setParkingFacilities] = useState(
    moreFilter10[language].map((filter) => ({
      ...filter,
      isSelected: filter.defaultChecked || false,
    }))
  );

  const [heatingCoolingAmenities, setHeatingCoolingAmenities] = useState(
    moreFilter6[language].map((filter) => ({
      ...filter,
      isSelected: filter.defaultChecked || false,
    }))
  );
  const [checkIn, setCheckIn] = useState(
    moreFilter11[language].map((filter) => ({
      ...filter,
      isSelected: filter.defaultChecked || false,
    }))
  );
  const [meals, setMeals] = useState(
    moreFilter12[language].map((filter) => ({
      ...filter,
      isSelected: filter.defaultChecked || false,
    }))
  );
  const [propertyType, setPropertyType] = useState(
    moreFilter3[language].map((filter) => ({
      ...filter,
      isSelected: filter.defaultChecked || false,
    }))
  );
  const [pets, setPets] = useState(
    moreFilter13[language].map((filter) => ({
      ...filter,
      isSelected: filter.defaultChecked || false,
    }))
  );
  const [partyOrganizing, setPartyOrganizing] = useState(
    moreFilter14[language].map((filter) => ({
      ...filter,
      isSelected: filter.defaultChecked || false,
    }))
  );
  const [houseRules, setHouseRules] = useState(
    moreFilter4[language].map((filter) => ({
      ...filter,
      isSelected: filter.defaultChecked || false,
    }))
  );

  const handleCheckboxChange = (category, filterName) => {
    const updateState = (state, setState) => {
      const updatedState = state.map((filter) =>
        filter.name === filterName
          ? { ...filter, isSelected: !filter.isSelected }
          : filter
      );
      setState(updatedState);
    };

    if (category === "services") updateState(services, setServices);
    else if (category === "bathroomAmenities") updateState(bathroomAmenities, setBathroomAmenities);
    else if (category === "kitchenDiningAmenities") updateState(kitchenDiningAmenities, setKitchenDiningAmenities);
    else if (category === "heatingCoolingAmenities") updateState(heatingCoolingAmenities, setHeatingCoolingAmenities);
    else if (category === "safetyAmenities") updateState(safetyAmenities, setSafetyAmenities);
    else if (category === "wellnessAmenities") updateState(wellnessAmenities, setWellnessAmenities);
    else if (category === "outdoorAmenities") updateState(outdoorAmenities, setOutdoorAmenities);
    else if (category === "parkingFacilities") updateState(parkingFacilities, setParkingFacilities);
    else if (category === "checkIn") updateState(checkIn, setCheckIn);
    else if (category === "meals") updateState(meals, setMeals);
    else if (category === "pets") updateState(pets, setPets);
    else if (category === "partyOrganizing") updateState(partyOrganizing, setPartyOrganizing);
    else if (category === "propertyType") updateState(propertyType, setPropertyType);
    else if (category === "houseRules") updateState(houseRules, setHouseRules);

  };

  const handleApply = () => {
    const selectedServices = services
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    const selectedBathroomAmenities = bathroomAmenities
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    const selectedKitchenDiningAmenities = kitchenDiningAmenities
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    const selectedHeatingCoolingAmenities = heatingCoolingAmenities
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    const selectedSafetyAmenities = safetyAmenities
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    const selectedWellnessAmenities = wellnessAmenities
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    const selectedOutdoorAmenities = outdoorAmenities
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    const selectedParkingFacilities = parkingFacilities
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    const selectedCheckInOptions = checkIn
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    const selectedMeals = meals
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);
    const selectedPropertyTypes = propertyType
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);
    const selectedPets = pets
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);
    const selectedPartyOrganizing = partyOrganizing
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);
    const selectedHouseRules = houseRules
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    console.log("Selected Filters:");
    console.log("services:", selectedServices);
    updateservices(selectedServices)
    console.log("bathroom:", selectedBathroomAmenities);
    console.log("Kitchen and Dining:", selectedKitchenDiningAmenities);
    console.log("Heating and Cooling:", selectedHeatingCoolingAmenities);
    console.log("Home Safety:", selectedSafetyAmenities);
    console.log("Wellness & Spa:", selectedWellnessAmenities);
    console.log("Outdoor:", selectedOutdoorAmenities);
    console.log("Parking and Facilities:", selectedParkingFacilities);
    console.log("Checkin:", selectedCheckInOptions);
    console.log("meal:", selectedMeals);
    console.log("pets:", selectedPets);
    console.log("party Organizing:", selectedPartyOrganizing);

    updateBathroomAmenities(selectedBathroomAmenities);
    updateKitchenDiningAmenities(selectedKitchenDiningAmenities);
    updateHeatingCoolingAmenities(selectedHeatingCoolingAmenities);
    updateSafetyAmenities(selectedSafetyAmenities);
    updateWellnessAmenities(selectedWellnessAmenities);
    updateOutdoorAmenities(selectedOutdoorAmenities);
    updateParkingFacilities(selectedParkingFacilities);
    updateCheckInOptions(selectedCheckInOptions);
    updateMeals(selectedMeals);
    updatePets(selectedPets);
    updatePartyOrganizing(selectedPartyOrganizing);
    updateSmoking(selectedHouseRules);


    updateAmenities(selectedServices)
    updateAmenities(selectedBathroomAmenities)
    updateAmenities(selectedKitchenDiningAmenities)
    updateAmenities(selectedHeatingCoolingAmenities)
    updateAmenities(selectedSafetyAmenities)
    updateAmenities(selectedWellnessAmenities)
    updateAmenities(selectedOutdoorAmenities)
    updateAmenities(selectedParkingFacilities)
    updateAmenities(selectedCheckInOptions)
    updateAmenities(selectedMeals)
    updateAmenities(selectedPets)
    updateAmenities(selectedPartyOrganizing)
    console.log("Property Types:", selectedPropertyTypes);
    updatedrop(selectedPropertyTypes)
    console.log("House Rules:", selectedHouseRules);
    updateBeds(beds);
    updateBedss(bedrooms);
    updateBathroomss(bathrooms);

    closeModalMoreFilter();
  };
  const handleApplyMobile = () => {
    const selectedServices = services
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    const selectedBathroomAmenities = bathroomAmenities
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    const selectedKitchenDiningAmenities = kitchenDiningAmenities
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    const selectedHeatingCoolingAmenities = heatingCoolingAmenities
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    const selectedSafetyAmenities = safetyAmenities
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    const selectedWellnessAmenities = wellnessAmenities
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    const selectedOutdoorAmenities = outdoorAmenities
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    const selectedParkingFacilities = parkingFacilities
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    const selectedCheckInOptions = checkIn
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    const selectedMeals = meals
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);
    const selectedPets = pets
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);
    const selectedPartyOrganizing = partyOrganizing
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);
    const selectedPropertyTypes = propertyType
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);
    const selectedHouseRules = houseRules
      .filter((filter) => filter.isSelected)
      .map((filter) => filter.key);

    // Log or update context
    console.log("Selected Filters (Mobile):");
    console.log("Selected Filters:");
    console.log("services:", selectedServices);
    console.log("bathroom:", selectedBathroomAmenities);
    console.log("Kitchen and Dining:", selectedKitchenDiningAmenities);
    console.log("Heating and Cooling:", selectedHeatingCoolingAmenities);
    console.log("Home Safety:", selectedSafetyAmenities);
    console.log("Wellness & Spa:", selectedWellnessAmenities);
    console.log("Outdoor:", selectedOutdoorAmenities);
    console.log("Parking and Facilities:", selectedParkingFacilities);
    console.log("Checkin:", selectedCheckInOptions);
    console.log("meal:", selectedMeals);
    console.log("pets:", selectedPets);
    console.log("party Organizing:", selectedPartyOrganizing);
    console.log("Property Types:", selectedPropertyTypes);
    console.log("House Rules:", selectedHouseRules);
    console.log("Type of Place:", selectedType);
    console.log("Price Range:", rangePrices);
    console.log("Rooms and Beds - Beds:", beds, "Bedrooms:", bedrooms, "Bathrooms:", bathrooms);
    console.log("pets:", selectedPets);
    console.log("party Organizing:", selectedPartyOrganizing);

    updateservices(selectedServices)
    updateBathroomAmenities(selectedBathroomAmenities);
    updateKitchenDiningAmenities(selectedKitchenDiningAmenities);
    updateHeatingCoolingAmenities(selectedHeatingCoolingAmenities);
    updateSafetyAmenities(selectedSafetyAmenities);
    updateWellnessAmenities(selectedWellnessAmenities);
    updateOutdoorAmenities(selectedOutdoorAmenities);
    updateParkingFacilities(selectedParkingFacilities);
    updateCheckInOptions(selectedCheckInOptions);
    updateMeals(selectedMeals);
    updatePets(selectedPets);
    updatePartyOrganizing(selectedPartyOrganizing);
    updateSmoking(selectedHouseRules);
    // Update context or state as necessary
    updateAmenities(selectedServices)
    updateAmenities(selectedBathroomAmenities)
    updateAmenities(selectedKitchenDiningAmenities)
    updateAmenities(selectedHeatingCoolingAmenities)
    updateAmenities(selectedSafetyAmenities)
    updateAmenities(selectedWellnessAmenities)
    updateAmenities(selectedOutdoorAmenities)
    updateAmenities(selectedParkingFacilities)
    updateAmenities(selectedCheckInOptions)
    updateAmenities(selectedMeals)
    updateAmenities(selectedPets)
    updateAmenities(selectedPartyOrganizing)
    updatedrop(selectedPropertyTypes);
    // Check if defaults
    if (rangePrices[0] === 0 && rangePrices[1] === 2000) {
      updatepricemins("");
      updatepricemaxs("");
    } else {
      updatepricemins(rangePrices[0]);
      updatepricemaxs(rangePrices[1]);
    }

    updateBedss(bedrooms);
    updateBathroomss(bathrooms);
    updateBeds(beds);
    updaterental(selectedType);

    // Close the mobile modal
    closeModalMoreFilterMobile();
  };


  const renderXClear = () => {
    return (
      <span className="flex items-center justify-center w-4 h-4 ml-3 text-white rounded-full cursor-pointer bg-primary-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-3 h-3"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    );
  };

  const renderTabsTypeOfPlace = () => {

    const handleCheckboxChange = (selectedKey) => {
      setSelectedType((prev) => (prev === selectedKey ? null : selectedKey));
    };

    const handleApply = (close) => {
      console.log("Selected Type:", selectedType);
      updaterental(selectedType); // Update rental with the selected type
      close();
    };

    return (
      <Popover className="relative">
        {({ open, close }) => (
          <>
            <Popover.Button
              className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border focus:outline-none transition-colors ${(open || selectedType) ? "border-[#2C8360] bg-[#2C8360]/5 text-[#2C8360]" : "border-neutral-200 text-neutral-700 hover:border-[#2C8360] hover:text-[#2C8360]"
                }`}
            >
              <span>{t.Typeofplace}</span>
              <ChevronDown size={20} className="ml-2" />
            </Popover.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute left-0 z-50 w-screen max-w-sm px-4 mt-3 sm:px-0 lg:max-w-md">
                <div className="overflow-hidden bg-white border shadow-xl rounded-2xl border-neutral-200">
                  <div className="relative flex flex-col px-5 py-6 space-y-5">
                    {typeOfPaces[language].map((item) => (
                      <div key={item.name} className="">
                        <Checkbox
                          name={item.name}
                          label={item.name}
                          subLabel={item.description}
                          checked={selectedType === item.key} // Match using the English key
                          onChange={() => handleCheckboxChange(item.key)} // Use key for storage
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between p-5 bg-neutral-50">
                    <ButtonThird
                      onClick={() => setSelectedType(null)} // Clear the selection
                      sizeClass="px-4 py-2 sm:px-5"
                    >
                      {t.Clear}
                    </ButtonThird>
                    <ButtonPrimary
                      onClick={() => handleApply(close)}
                      sizeClass="px-4 py-2 sm:px-5"
                    >
                      {t.Apply}
                    </ButtonPrimary>
                  </div>
                </div>
              </Popover.Panel>
            </Transition>
          </>
        )}
      </Popover>
    );
  };


  const renderTabsRoomAndBeds = () => {
    // State to track user input

    const handleApply = () => {
      // Log the values to console
      console.log("Selected Values:");
      console.log(`Beds: ${beds}`);
      console.log(`Bedrooms: ${bedrooms}`);
      console.log(`Bathrooms: ${bathrooms}`);
      updateBeds(beds)
      updateBedss(bedrooms)
      updateBathroomss(bathrooms)
    };

    return (
      <Popover className="relative">
        {({ open, close }) => (
          <>
            <Popover.Button
              className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border focus:outline-none transition-colors ${(open || beds > 0 || bedrooms > 0 || bathrooms > 0) ? "border-[#2C8360] bg-[#2C8360]/5 text-[#2C8360]" : "border-neutral-200 text-neutral-700 hover:border-[#2C8360] hover:text-[#2C8360]"
                }`}
            >
              <span>{t.RoomsofBeds}</span>
              <ChevronDown size={20} className="ml-2" />
            </Popover.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute left-0 z-50 w-screen max-w-sm px-4 mt-3 sm:px-0 lg:max-w-md">
                <div className="overflow-hidden bg-white border shadow-xl rounded-2xl border-neutral-200">
                  <div className="relative flex flex-col px-5 py-6 space-y-5">
                    <NcInputNumber
                      label={`${t.Beds}`}
                      max={100}
                      defaultValue={beds}
                      onChange={(value) => setBeds(value)}
                    />
                    <NcInputNumber
                      label={`${t.Bedrooms}`}
                      max={100}
                      defaultValue={bedrooms}
                      onChange={(value) => setBedrooms(value)}
                    />
                    <NcInputNumber
                      label={`${t.Bathrooms}`}
                      max={100}
                      defaultValue={bathrooms}
                      onChange={(value) => setBathrooms(value)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-5 bg-neutral-50">
                    <ButtonThird onClick={() => {
                      setBeds(0);
                      setBedrooms(0);
                      setBathrooms(0);
                    }} sizeClass="px-4 py-2 sm:px-5">
                      {t.Clear}
                    </ButtonThird>
                    <ButtonPrimary
                      onClick={() => {
                        handleApply();
                        close();
                      }}
                      sizeClass="px-4 py-2 sm:px-5"
                    >
                      {t.Apply}
                    </ButtonPrimary>
                  </div>
                </div>
              </Popover.Panel>
            </Transition>
          </>
        )}
      </Popover>
    );
  };


  const renderTabsPriceRange = ({
    rangePrices = [0, 1000], // Default price range
    setRangePrices = () => { }, // Default function
    convertNumbThousand = (num) => num, // Default number formatter
    renderXClear = () => null, // Default render function
  } = {}) => {
    return (
      <Popover className="relative">
        {({ open, close }) => (
          <>
            <Popover.Button
              className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-primary-500 bg-primary-50 text-primary-700 focus:outline-none`}
            >
              <span>
                {`€${convertNumbThousand(
                  rangePrices[0]
                )} - €${convertNumbThousand(rangePrices[1])}`}{" "}
              </span>
              {renderXClear()}
            </Popover.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute left-0 z-50 w-screen max-w-sm px-4 mt-3 sm:px-0">
                <div className="overflow-hidden bg-white border shadow-xl rounded-2xl border-neutral-200">
                  <div className="relative flex flex-col px-5 py-6 space-y-8">
                    <div className="space-y-5">
                      <span className="font-medium">{t.Priceperday}</span>
                      <Slider
                        range
                        className="text-red-400"
                        min={0}
                        max={2000}
                        defaultValue={[rangePrices[0], rangePrices[1]]}
                        allowCross={false}
                        onChange={(e) => setRangePrices(e)}
                      />
                    </div>

                    <div className="flex justify-between space-x-5">
                      <div>
                        <label
                          htmlFor="minPrice"
                          className="block text-sm font-medium text-neutral-700"
                        >
                          {t.Minprice}
                        </label>
                        <div className="relative mt-1 rounded-md">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <span className="text-neutral-500 sm:text-sm">€</span>
                          </div>
                          <input
                            type="text"
                            name="minPrice"
                            disabled
                            id="minPrice"
                            className="block w-full pr-3 rounded-full focus:ring-indigo-500 focus:border-indigo-500 pl-7 sm:text-sm border-neutral-200 text-neutral-900"
                            value={rangePrices[0]}
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="maxPrice"
                          className="block text-sm font-medium text-neutral-700"
                        >
                          {t.Maxprice}
                        </label>
                        <div className="relative mt-1 rounded-md">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <span className="text-neutral-500 sm:text-sm">€</span>
                          </div>
                          <input
                            type="text"
                            disabled
                            name="maxPrice"
                            id="maxPrice"
                            className="block w-full pr-3 rounded-full focus:ring-indigo-500 focus:border-indigo-500 pl-7 sm:text-sm border-neutral-200 text-neutral-900"
                            value={rangePrices[1]}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-5 bg-neutral-50">
                    <button
                      onClick={close}
                      className="px-4 py-2 bg-gray-300 rounded-md sm:px-5"
                    >
                      {t.Clear}
                    </button>
                    <button
                      onClick={() => {
                        // Update the min and max price in the FormContext
                        updatepricemins(rangePrices[0]);
                        updatepricemaxs(rangePrices[1]);

                        // Close the popover
                        close();
                      }}
                      className="px-4 py-2 text-white bg-blue-500 rounded-md sm:px-5"
                    >
                      {t.Apply}
                    </button>
                  </div>
                </div>
              </Popover.Panel>
            </Transition>
          </>
        )}
      </Popover>
    );
  };





  const renderMoreFilterItem = (filters, handleCheckboxChange) => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {filters.map((filter) => (
        <div key={filter.name} className="flex items-center">
          <input
            type="checkbox"
            checked={filter.isSelected || false}
            onChange={() => handleCheckboxChange(filter.name)}
            className="w-4 h-4 mr-2 border-gray-300 rounded text-primary-500 focus:ring-primary-500"
          />
          <label>{filter.name}</label>
        </div>
      ))}
    </div>
  );

  const renderTabMoreFilter = () => {

    return (
      <div>
        <div
          className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-[#2C8360] bg-[#2C8360]/5 text-[#2C8360] focus:outline-none cursor-pointer hover:bg-[#2C8360]/10 transition-colors`}
          onClick={openModalMoreFilter}
        >
          <span>{t.Morefilters} (3)</span>
          {renderXClear()}
        </div>


        <Transition appear show={isOpenMoreFilter} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 z-50 overflow-y-auto"
            onClose={closeModalMoreFilter}
          >
            <div className="min-h-screen text-center">
              <span className="inline-block h-screen align-middle" aria-hidden="true">
                &#8203;
              </span>
              <div className="inline-flex flex-col w-full h-full max-w-4xl overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                <div className="relative flex-shrink-0 px-6 py-4 text-center border-b border-neutral-200 ">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {t.Morefilters}
                  </Dialog.Title>
                  <span className="absolute left-3 top-3">
                    <ButtonClose onClick={closeModalMoreFilter} />
                  </span>
                </div>

                <div className="flex-grow overflow-y-auto">
                  <div className="px-10 divide-y divide-neutral-200">
                    <div className="py-7">
                      <h3 className="text-xl font-medium">{t.Services}</h3>
                      <div className="relative mt-6">
                        {renderMoreFilterItem(
                          services,
                          (filterName) => handleCheckboxChange("services", filterName)
                        )}
                      </div>
                    </div>
                    <div className="py-7">
                      <h3 className="text-xl font-medium">{t.Bathroom}</h3>
                      <div className="relative mt-6">
                        {renderMoreFilterItem(
                          bathroomAmenities,
                          (filterName) => handleCheckboxChange("bathroomAmenities", filterName)
                        )}
                      </div>
                    </div>
                    <div className="py-7">
                      <h3 className="text-xl font-medium">{t.KitchenandDining}</h3>
                      <div className="relative mt-6">
                        {renderMoreFilterItem(
                          kitchenDiningAmenities,
                          (filterName) => handleCheckboxChange("kitchenDiningAmenities", filterName)
                        )}
                      </div>
                    </div>
                    <div className="py-7">
                      <h3 className="text-xl font-medium">{t.HeatingandCooling}</h3>
                      <div className="relative mt-6">
                        {renderMoreFilterItem(
                          heatingCoolingAmenities,
                          (filterName) => handleCheckboxChange("heatingCoolingAmenities", filterName)
                        )}
                      </div>
                    </div>
                    <div className="py-7">
                      <h3 className="text-xl font-medium">{t.HomeSafety}</h3>
                      <div className="relative mt-6">
                        {renderMoreFilterItem(
                          safetyAmenities,
                          (filterName) => handleCheckboxChange("safetyAmenities", filterName)
                        )}
                      </div>
                    </div>
                    <div className="py-7">
                      <h3 className="text-xl font-medium">{t.WellnessSpa}</h3>
                      <div className="relative mt-6">
                        {renderMoreFilterItem(
                          wellnessAmenities,
                          (filterName) => handleCheckboxChange("wellnessAmenities", filterName)
                        )}
                      </div>
                    </div>
                    <div className="py-7">
                      <h3 className="text-xl font-medium">{t.Outdoor}</h3>
                      <div className="relative mt-6">
                        {renderMoreFilterItem(
                          outdoorAmenities,
                          (filterName) => handleCheckboxChange("outdoorAmenities", filterName)
                        )}
                      </div>
                    </div>
                    <div className="py-7">
                      <h3 className="text-xl font-medium">{t.ParkingandFacilities}</h3>
                      <div className="relative mt-6">
                        {renderMoreFilterItem(
                          parkingFacilities,
                          (filterName) => handleCheckboxChange("parkingFacilities", filterName)
                        )}
                      </div>
                    </div>
                    <div className="py-7">
                      <h3 className="text-xl font-medium">{t.Checkin}</h3>
                      <div className="relative mt-6">
                        {renderMoreFilterItem(
                          checkIn,
                          (filterName) => handleCheckboxChange("checkIn", filterName)
                        )}
                      </div>
                    </div>
                    <div className="py-7">
                      <h3 className="text-xl font-medium">{t.Meals}</h3>
                      <div className="relative mt-6">
                        {renderMoreFilterItem(
                          meals,
                          (filterName) => handleCheckboxChange("meals", filterName)
                        )}
                      </div>
                    </div>
                    <div className="py-7">
                      <h3 className="text-xl font-medium">{t.Propertytype}</h3>
                      <div className="relative mt-6">
                        {renderMoreFilterItem(
                          propertyType,
                          (filterName) => handleCheckboxChange("propertyType", filterName)
                        )}
                      </div>
                    </div>
                    <div className="py-7">
                      <h3 className="text-xl font-medium">{t.Pets}</h3>
                      <div className="relative mt-6">
                        {renderMoreFilterItem(
                          pets,
                          (filterName) => handleCheckboxChange("pets", filterName)
                        )}
                      </div>
                    </div>
                    <div className="py-7">
                      <h3 className="text-xl font-medium">{t.PartyOrganizing}</h3>
                      <div className="relative mt-6">
                        {renderMoreFilterItem(
                          partyOrganizing,
                          (filterName) => handleCheckboxChange("partyOrganizing", filterName)
                        )}
                      </div>
                    </div>
                    <div className="py-7">
                      <h3 className="text-xl font-medium">{t.Smoking}</h3>
                      <div className="relative mt-6">
                        {renderMoreFilterItem(
                          houseRules,
                          (filterName) => handleCheckboxChange("houseRules", filterName)
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between flex-shrink-0 p-6 bg-neutral-50">
                  <ButtonThird
                    onClick={() => {
                      setServices(
                        services.map((filter) => ({
                          ...filter,
                          isSelected: filter.defaultChecked || false,
                        }))
                      );
                      setBathroomAmenities(
                        bathroomAmenities.map((filter) => ({
                          ...filter,
                          isSelected: filter.defaultChecked || false,
                        }))
                      );
                      setKitchenDiningAmenities(
                        kitchenDiningAmenities.map((filter) => ({
                          ...filter,
                          isSelected: filter.defaultChecked || false,
                        }))
                      );
                      setHeatingCoolingAmenities(
                        heatingCoolingAmenities.map((filter) => ({
                          ...filter,
                          isSelected: filter.defaultChecked || false,
                        }))
                      );
                      setSafetyAmenities(
                        safetyAmenities.map((filter) => ({
                          ...filter,
                          isSelected: filter.defaultChecked || false,
                        }))
                      );
                      setWellnessAmenities(
                        wellnessAmenities.map((filter) => ({
                          ...filter,
                          isSelected: filter.defaultChecked || false,
                        }))
                      );
                      setOutdoorAmenities(
                        outdoorAmenities.map((filter) => ({
                          ...filter,
                          isSelected: filter.defaultChecked || false,
                        }))
                      );
                      setParkingFacilities(
                        parkingFacilities.map((filter) => ({
                          ...filter,
                          isSelected: filter.defaultChecked || false,
                        }))
                      );
                      setCheckIn(
                        checkIn.map((filter) => ({
                          ...filter,
                          isSelected: filter.defaultChecked || false,
                        }))
                      );
                      setMeals(
                        meals.map((filter) => ({
                          ...filter,
                          isSelected: filter.defaultChecked || false,
                        }))
                      );
                      setPropertyType(
                        propertyType.map((filter) => ({
                          ...filter,
                          isSelected: filter.defaultChecked || false,
                        }))
                      );
                      setPets(
                        pets.map((filter) => ({
                          ...filter,
                          isSelected: filter.defaultChecked || false,
                        }))
                      );
                      setPartyOrganizing(
                        partyOrganizing.map((filter) => ({
                          ...filter,
                          isSelected: filter.defaultChecked || false,
                        }))
                      );
                      setHouseRules(
                        houseRules.map((filter) => ({
                          ...filter,
                          isSelected: filter.defaultChecked || false,
                        }))
                      );
                    }}
                    sizeClass="px-4 py-2 sm:px-5"
                  >
                    {t.Clear}
                  </ButtonThird>

                  <ButtonPrimary onClick={handleApply} sizeClass="px-4 py-2 sm:px-5">
                    {t.Apply}
                  </ButtonPrimary>
                </div>
              </div>
            </div>
          </Dialog>
        </Transition>
      </div>
    );
  };

  const renderTabMoreFilterMobile = () => {

    return (
      <div>
        {/* Container for More Filters and Sort Buttons */}
        <div className="flex items-center justify-between px-1 py-1 space-x-4 lg:hidden">
          {/* More Filters Button */}
          <div
            className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-[#2C8360] bg-[#2C8360]/5 text-[#2C8360] focus:outline-none cursor-pointer hover:bg-[#2C8360]/10 transition-colors`}
            onClick={openModalMoreFilterMobile}
          >
            <span>{t.Morefilters} (3)</span>
            {renderXClear()}
          </div>

          {/* Sort Button */}
          <div className="relative">
            <button
              className={`flex items-center justify-center px-4 py-2 text-sm border rounded-full focus:outline-none transition-colors ${showSortingOptions ? "border-[#2C8360] bg-[#2C8360]/5 text-[#2C8360]" : "border-neutral-200 text-neutral-700 hover:border-[#2C8360] hover:text-[#2C8360]"}`}
              onClick={handleSortingClick}
            >
              <ArrowUpDown size={20} className="mr-2" />
              {t.Sort}
            </button>


            {/* Sorting Options Menu */}
            {showSortingOptions && (
              <div className="absolute z-50 w-40 mt-2 bg-white rounded-2xl shadow-lg top-full border border-neutral-100">
                <ul className="py-2">
                  <li
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortOption("lowToHigh")}
                  >
                    {t.LowtoHigh}
                  </li>
                  <li
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortOption("highToLow")}
                  >
                    {t.HightoLow}
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>


        {/* Mobile quick property-type chip row */}
        {(() => {
          const chips = language === "sk"
            ? [
                { label: "Všetky", key: [] },
                { label: "Apartmán", key: ["Apartment"] },
                { label: "Dom",
                  key: [
                    "Entire Homes",
                    "Nature House",
                    "Wooden House",
                    "Dome House",
                    "Wooden Houses"
                  ],
                },
                { label: "Chata", key: ["Cottages"] },
              ]
            : [
                { label: "All", key: [] },
                { label: "Apartment", key: ["Apartment"] },
                {
                  label: "House",
                  key: [
                    "Entire Homes",
                    "Nature House",
                    "Wooden House",
                    "Dome House",
                    "Wooden Houses"
                  ],
                },
                { label: "Cottage", key: ["Cottages"] },
              ];
          return (
            <div className="flex overflow-x-auto gap-2 px-0.5 pt-2 pb-1 no-scrollbar lg:hidden">
              {chips.map(({ label, key }) => {
                const dropIsEmpty = !drop || drop === "" || (Array.isArray(drop) && drop.length === 0);
                const isActive = key === "" ? dropIsEmpty : drop === key;
                return (
                  <button
                    key={key || "all"}
                    onClick={() => updatedrop(key || [])}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold font-inter border transition-colors whitespace-nowrap focus:outline-none ${
                      isActive
                        ? "bg-[#2C8360] text-white border-[#2C8360]"
                        : "bg-white text-neutral-600 border-neutral-200 hover:border-[#2C8360] hover:text-[#2C8360]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          );
        })()}

        <Transition appear show={isOpenMoreFilterMobile} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 z-50 overflow-y-auto"
            onClose={closeModalMoreFilterMobile}
          >
            <div className="min-h-screen text-center">
              <span
                className="inline-block h-screen align-middle"
                aria-hidden="true"
              >
                &#8203;
              </span>
              <Transition.Child
                className="inline-block w-full h-screen max-w-4xl px-2 py-8"
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <div className="inline-flex flex-col w-full h-full max-w-4xl overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                  <div className="relative flex-shrink-0 px-6 py-4 text-center border-b border-neutral-200">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      {t.Morefilters}
                    </Dialog.Title>
                    <span className="absolute left-3 top-3">
                      <ButtonClose onClick={closeModalMoreFilterMobile} />
                    </span>
                  </div>

                  <div className="flex-grow overflow-y-auto">
                    <div className="px-4 divide-y sm:px-6 divide-neutral-200">
                      {/* Type of Place */}
                      <div className="py-7">
                        <h3 className="text-xl font-medium">{t.Typeofplace}</h3>
                        <div className="relative mt-6">
                          {typeOfPaces[language].map((item) => (
                            <Checkbox
                              key={item.key}
                              name={item.name}
                              label={item.name}
                              subLabel={item.description}
                              checked={selectedType === item.name}
                              onChange={() =>
                                setSelectedType((prev) =>
                                  prev === item.name ? null : item.name
                                )
                              }
                            />
                          ))}
                        </div>
                      </div>

                      {/* Range Prices */}
                      <div className="py-7">
                        <h3 className="text-xl font-medium">{t.RangePrices}</h3>
                        <div className="relative mt-6">
                          <div className="relative flex flex-col space-y-8">
                            <div className="space-y-5">
                              <Slider
                                range
                                className="text-red-400"
                                min={0}
                                max={2000}
                                defaultValue={rangePrices}
                                allowCross={false}
                                onChange={(e) => setRangePrices(e)}
                              />
                            </div>

                            <div className="flex justify-between space-x-5">
                              <div>
                                <label
                                  htmlFor="minPrice"
                                  className="block text-sm font-medium text-neutral-700"
                                >
                                  {t.Minprice}
                                </label>
                                <div className="relative mt-1 rounded-md">
                                  <input
                                    type="text"
                                    name="minPrice"
                                    disabled
                                    className="block w-full pr-3 rounded-full pl-7 sm:text-sm border-neutral-200 text-neutral-900"
                                    value={rangePrices[0]}
                                  />
                                </div>
                              </div>
                              <div>
                                <label
                                  htmlFor="maxPrice"
                                  className="block text-sm font-medium text-neutral-700"
                                >
                                  {t.Maxprice}
                                </label>
                                <div className="relative mt-1 rounded-md">
                                  <input
                                    type="text"
                                    name="maxPrice"
                                    disabled
                                    className="block w-full pr-3 rounded-full pl-7 sm:text-sm border-neutral-200 text-neutral-900"
                                    value={rangePrices[1]}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Rooms and Beds */}
                      <div className="py-7">
                        <h3 className="text-xl font-medium">{t.Roomsandbeds}</h3>
                        <div className="relative flex flex-col mt-6 space-y-5">
                          <NcInputNumber
                            key="beds-mobile"
                            label={`${t.Beds}`}
                            max={100}
                            defaultValue={beds}
                            onChange={(value) => setBeds(value)}
                          />
                          <NcInputNumber
                            key="bedrooms-mobile"
                            label={`${t.Bedrooms}`}
                            max={100}
                            defaultValue={bedrooms}
                            onChange={(value) => setBedrooms(value)}
                          />
                          <NcInputNumber
                            key="bathrooms-mobile"
                            label={`${t.Bathrooms}`}
                            max={100}
                            defaultValue={bathrooms}
                            onChange={(value) => setBathrooms(value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex-grow ">
                      <div className="px-4 divide-y sm:px-6 divide-neutral-200">
                        {/* Filter Sections */}
                        <div className="py-7">
                          <h3 className="text-xl font-medium">{t.Services}</h3>
                          <div className="relative mt-6">
                            {renderMoreFilterItem(
                              services,
                              (filterName) => handleCheckboxChange("services", filterName)
                            )}
                          </div>
                        </div>
                        <div className="py-7">
                          <h3 className="text-xl font-medium">{t.Bathroom}</h3>
                          <div className="relative mt-6">
                            {renderMoreFilterItem(
                              bathroomAmenities,
                              (filterName) => handleCheckboxChange("bathroomAmenities", filterName)
                            )}
                          </div>
                        </div>
                        <div className="py-7">
                          <h3 className="text-xl font-medium">{t.KitchenandDining}</h3>
                          <div className="relative mt-6">
                            {renderMoreFilterItem(
                              kitchenDiningAmenities,
                              (filterName) => handleCheckboxChange("kitchenDiningAmenities", filterName)
                            )}
                          </div>
                        </div>
                        <div className="py-7">
                          <h3 className="text-xl font-medium">{t.HeatingandCooling}</h3>
                          <div className="relative mt-6">
                            {renderMoreFilterItem(
                              heatingCoolingAmenities,
                              (filterName) => handleCheckboxChange("heatingCoolingAmenities", filterName)
                            )}
                          </div>
                        </div>
                        <div className="py-7">
                          <h3 className="text-xl font-medium">{t.HomeSafety}</h3>
                          <div className="relative mt-6">
                            {renderMoreFilterItem(
                              safetyAmenities,
                              (filterName) => handleCheckboxChange("safetyAmenities", filterName)
                            )}
                          </div>
                        </div>
                        <div className="py-7">
                          <h3 className="text-xl font-medium">{t.WellnessSpa}</h3>
                          <div className="relative mt-6">
                            {renderMoreFilterItem(
                              wellnessAmenities,
                              (filterName) => handleCheckboxChange("wellnessAmenities", filterName)
                            )}
                          </div>
                        </div>
                        <div className="py-7">
                          <h3 className="text-xl font-medium">{t.Outdoor}</h3>
                          <div className="relative mt-6">
                            {renderMoreFilterItem(
                              outdoorAmenities,
                              (filterName) => handleCheckboxChange("outdoorAmenities", filterName)
                            )}
                          </div>
                        </div>
                        <div className="py-7">
                          <h3 className="text-xl font-medium">{t.ParkingandFacilities}</h3>
                          <div className="relative mt-6">
                            {renderMoreFilterItem(
                              parkingFacilities,
                              (filterName) => handleCheckboxChange("parkingFacilities", filterName)
                            )}
                          </div>
                        </div>
                        <div className="py-7">
                          <h3 className="text-xl font-medium">{t.Checkin}</h3>
                          <div className="relative mt-6">
                            {renderMoreFilterItem(
                              checkIn,
                              (filterName) => handleCheckboxChange("checkIn", filterName)
                            )}
                          </div>
                        </div>
                        <div className="py-7">
                          <h3 className="text-xl font-medium">{t.Meals}</h3>
                          <div className="relative mt-6">
                            {renderMoreFilterItem(
                              meals,
                              (filterName) => handleCheckboxChange("meals", filterName)
                            )}
                          </div>
                        </div>
                        <div className="py-7">
                          <h3 className="text-xl font-medium">{t.Propertytype}</h3>
                          <div className="relative mt-6">
                            {renderMoreFilterItem(
                              propertyType,
                              (filterName) =>
                                handleCheckboxChange("propertyType", filterName)
                            )}
                          </div>
                        </div>
                        <div className="py-7">
                          <h3 className="text-xl font-medium">{t.Pets}</h3>
                          <div className="relative mt-6">
                            {renderMoreFilterItem(
                              pets,
                              (filterName) => handleCheckboxChange("pets", filterName)
                            )}
                          </div>
                        </div>
                        <div className="py-7">
                          <h3 className="text-xl font-medium">{t.Partyorganizing}</h3>
                          <div className="relative mt-6">
                            {renderMoreFilterItem(
                              partyOrganizing,
                              (filterName) => handleCheckboxChange("partyOrganizing", filterName)
                            )}
                          </div>
                        </div>
                        <div className="py-7">
                          <h3 className="text-xl font-medium">{t.Smoking}</h3>
                          <div className="relative mt-6">
                            {renderMoreFilterItem(
                              houseRules,
                              (filterName) =>
                                handleCheckboxChange("houseRules", filterName)
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>


                  <div className="flex items-center justify-between flex-shrink-0 p-4 sm:p-6 bg-neutral-50">
                    <ButtonThird
                      onClick={() => {
                        // Reset all filters
                        // setAmenities(
                        //   moreFilter1.map((filter) => ({
                        //     ...filter,
                        //     isSelected: false,
                        //   }))
                        // );
                        // setFacilities(
                        //   moreFilter2.map((filter) => ({
                        //     ...filter,
                        //     isSelected: false,
                        //   }))
                        // );
                        // setPropertyType(
                        //   moreFilter3.map((filter) => ({
                        //     ...filter,
                        //     isSelected: false,
                        //   }))
                        // );
                        setServices(
                          services.map((filter) => ({
                            ...filter,
                            isSelected: filter.defaultChecked || false,
                          }))
                        );
                        setBathroomAmenities(
                          bathroomAmenities.map((filter) => ({
                            ...filter,
                            isSelected: filter.defaultChecked || false,
                          }))
                        );
                        setKitchenDiningAmenities(
                          kitchenDiningAmenities.map((filter) => ({
                            ...filter,
                            isSelected: filter.defaultChecked || false,
                          }))
                        );
                        setHeatingCoolingAmenities(
                          heatingCoolingAmenities.map((filter) => ({
                            ...filter,
                            isSelected: filter.defaultChecked || false,
                          }))
                        );
                        setSafetyAmenities(
                          safetyAmenities.map((filter) => ({
                            ...filter,
                            isSelected: filter.defaultChecked || false,
                          }))
                        );
                        setWellnessAmenities(
                          wellnessAmenities.map((filter) => ({
                            ...filter,
                            isSelected: filter.defaultChecked || false,
                          }))
                        );
                        setOutdoorAmenities(
                          outdoorAmenities.map((filter) => ({
                            ...filter,
                            isSelected: filter.defaultChecked || false,
                          }))
                        );
                        setParkingFacilities(
                          parkingFacilities.map((filter) => ({
                            ...filter,
                            isSelected: filter.defaultChecked || false,
                          }))
                        );
                        setCheckIn(
                          checkIn.map((filter) => ({
                            ...filter,
                            isSelected: filter.defaultChecked || false,
                          }))
                        );
                        setMeals(
                          meals.map((filter) => ({
                            ...filter,
                            isSelected: filter.defaultChecked || false,
                          }))
                        );
                        setPropertyType(
                          propertyType.map((filter) => ({
                            ...filter,
                            isSelected: filter.defaultChecked || false,
                          }))
                        );
                        setPets(
                          pets.map((filter) => ({
                            ...filter,
                            isSelected: filter.defaultChecked || false,
                          }))
                        );
                        setPartyOrganizing(
                          partyOrganizing.map((filter) => ({
                            ...filter,
                            isSelected: filter.defaultChecked || false,
                          }))
                        );
                        setHouseRules(
                          houseRules.map((filter) => ({
                            ...filter,
                            isSelected: filter.defaultChecked || false,
                          }))
                        );
                        setRangePrices([0, 2000]);
                        setBeds(0);
                        setBedrooms(0);
                        setBathrooms(0);
                        setSelectedType(null);
                        // Reset context state
                        updateBeds(0);
                        updateBedss(0);
                        updateBathroomss(0);
                        updaterental(null);
                        updatepricemins("");
                        updatepricemaxs("");
                      }}

                      sizeClass="px-4 py-2 sm:px-5"
                    >
                      {t.Clear}
                    </ButtonThird>
                    <ButtonPrimary
                      onClick={handleApplyMobile}
                      sizeClass="px-4 py-2 sm:px-5"
                    >
                      {t.Apply}
                    </ButtonPrimary>
                  </div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </div>
    );
  };

  return (
    <div className="relative flex lg:space-x-4">
      <div className="hidden space-x-4 lg:flex">
        {renderTabsTypeOfPlace()}
        {/* {renderTabsPriceRange({
      rangePrices,
      setRangePrices,
      convertNumbThousand: (num) => num.toLocaleString(),
      renderXClear: () => <button onClick={() => setRangePrices([0, 2000])}>{t.Clear}</button>,
    })} */}
        {renderTabsRoomAndBeds()}
        {renderTabMoreFilter()}
        {/* Sort Button */}
        <div className="relative">
          <button
            className={`flex items-center justify-center px-4 py-2 text-sm border rounded-full focus:outline-none transition-colors ${showSortingOptions ? "border-[#2C8360] bg-[#2C8360]/5 text-[#2C8360]" : "border-neutral-200 text-neutral-700 hover:border-[#2C8360] hover:text-[#2C8360]"}`}
            onClick={handleSortingClick}
          >
            <ArrowUpDown size={20} className="mr-2" />
            {t.Sort}
          </button>

          {/* Sorting Options Menu */}
          {showSortingOptions && (
            <div className="absolute z-50 w-40 mt-2 bg-white rounded-2xl shadow-lg top-full border border-neutral-100">
              <ul className="py-2">
                <li

                  className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSortOption("lowToHigh")}
                >
                  {t.LowtoHigh}
                </li>
                <li
                  className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSortOption("highToLow")}
                >
                  {t.HightoLow}
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
      {renderTabMoreFilterMobile()}
    </div>

  );
};

export default TabFilters;