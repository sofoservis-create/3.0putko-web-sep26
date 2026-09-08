"use client"
// FormContext.js
import React, { createContext, useEffect, useState } from 'react';
import { loadCanonicalCities, resolveCanonicalCity } from "./utils/searchNormalization";

export const FormContext = createContext();

export const FormProvider = ({ children }) => {
  const [formData, setFormData] = useState({});

  // State to hold the selected data
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selected, setSelected] = useState(false);
  const [selectedWeb, setSelectedWeb] = useState('');
  const [note, setNote] = useState('');
  const [images , setImage] = useState([]);
  const [company, setCompany] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [planName, setPlanName] = useState('');
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
  
  const [websiteInformation, setWebsiteInformation] = useState('');
  const [noteOnFilling, setNoteOnFilling] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [city, setCity] = useState('');
  const [sortOption, setsortOption] = useState('');
  const [sort, setsort] = useState('');
  const [Beds, setBeds] = useState('');
  const [Bathrooms, setBathrooms] = useState('');
  const [Bedss, setBedss] = useState('');
  const [Bathroomss, setBathroomss] = useState('');
  const [amenity ,  setamenity] = useState([]);
 //
  const [ services ,  setservices] = useState([]);

// Bathroom Amenities
const [BathroomAmenities, setBathroomAmenities] = useState([]);

// Kitchen and Dining Amenities
const [KitchenDiningAmenities, setKitchenDiningAmenities] = useState([]);

// Heating and Cooling Amenities
const [HeatingCoolingAmenities, setHeatingCoolingAmenities] = useState([]);

// Home Safety Amenities
const [SafetyAmenities, setSafetyAmenities] = useState([]);

// Wellness & Spa Amenities
const [WellnessAmenities, setWellnessAmenities] = useState([]);

// Outdoor Amenities
const [OutdoorAmenities, setOutdoorAmenities] = useState([]);

// Parking and Facilities
const [ParkingFacilities, setParkingFacilities] = useState([]);

// Check-In Options
const [CheckInOptions, setCheckInOptions] = useState([]);

// Meals Options
const [Meals, setMeals] = useState([]);

// Pets Options
const [Pets, setPets] = useState([]);
// smoking
const [smoking, setsmoking] = useState([]);

// Party Organizing Options
const [PartyOrganizing, setPartyOrganizing] = useState([]);

 //
  const [Equipment ,  setEquipment] = useState([]);
  const [Amenities ,  setAmenities] = useState([]);
  const [Facilities ,  setselectedFacilities] = useState([]);
  const [booking ,  setbooking] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [adults, setAdults] = useState(0);
  const [childrens, setChildren] = useState(0);
  const [Rating, setRating] = useState(0)
  const [overallRating, setoverallRating] = useState(0)
  const [commentleght, setcommentleght] = useState(0)
  const [hostoverallRating, sethostoverallRating] = useState(0)
  const [hostcommentleght, sethostcommentleght] = useState(0)
  const [acclen, setacclen] = useState(0)
  

  
  const [infants, setInfants] = useState(0); 
  const [travelingWithPet, setTravelingWithPet] = useState([]);
  const [accdata, setAdata] = useState({});
    
  const [selectedpage, setSelectedpage] = useState('');
  
  const [zipcode, setZipcode] = useState('');
  
  const [lang, setlang] = useState('');
  const [startdate, setStartDate] = useState('');
  const [enddate, setEndDate] = useState('');
  const [country, setCountry] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [date , setDate] = useState('');
  const [ida, setId] = useState('');
  const [tin, setTin] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [user, setUser] = useState('');
  const [person, setperson] = useState('');
  const [pricemin , setPricemin] = useState('');
  const [pricemax , setPricemax] = useState('');
  const [pricemins , setPricemins] = useState('');
  const [pricemaxs , setPricemaxs] = useState('');

  const [state, setstate] = useState(false);

  const [startdatein , setstartdatein] = useState('');
  
  const [enddatein , setenddatein] = useState('');
  // const [startdatein , setstartdatein] = useState('');
  const [stateout, setstateout] = useState(false);

  const [pricenight ,setPricenight] = useState('')
  const [location, setLocation] = useState('');
  const [notification, setNotification] = useState(0);
  const [drop, setdrop] = useState([]);
  const [rentalform, Setrentalform] = useState("")
  const [accommodationName, setAccommodationName] = useState("");
  const updateAccommodationName = (value) => setAccommodationName(value);

  useEffect(() => {
    if (localStorage.getItem("token")?.startsWith("test_session_")) {
      return;
    }
    const baseUrl = import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api";
    loadCanonicalCities(baseUrl).then(() => {
      setCity((currentCity) => resolveCanonicalCity(currentCity));
      const storedCity = localStorage.getItem("selectedCity");
      if (storedCity) {
        localStorage.setItem("selectedCity", resolveCanonicalCity(storedCity));
      }
    });
  }, []);

  
  // const [user, setUser] = useState('');
  // Function to update selected plan
  const updateacclen = (value) => setacclen(value)
  const updateselected = (value) => setSelected(value)
  const updatelang = (value) => setlang(value);
  //
  const updateservices = (value) =>setservices(value)
  const updateBathroomAmenities = (value) => setBathroomAmenities(value);
const updateKitchenDiningAmenities = (value) => setKitchenDiningAmenities(value);
const updateHeatingCoolingAmenities = (value) => setHeatingCoolingAmenities(value);
const updateSafetyAmenities = (value) => setSafetyAmenities(value);
const updateWellnessAmenities = (value) => setWellnessAmenities(value);
const updateOutdoorAmenities = (value) => setOutdoorAmenities(value);
const updateParkingFacilities = (value) => setParkingFacilities(value);
const updateCheckInOptions = (value) => setCheckInOptions(value);
const updateMeals = (value) => setMeals(value);
const updatePets = (value) => setPets(value);
const updateSmoking = (value) => setsmoking(value);
const updatePartyOrganizing = (value) => setPartyOrganizing(value);


  //
  const updatestate = (value) => setstate(value);
  const updatestartdatein = (value) => setstartdatein(value);
  const updateenddatein = (value) => setenddatein(value);
  
  const updatestateout = (value) => setstateout(value)
  const updatepricemin = (value) => setPricemin(value)
  const updatepricemaxs = (value) => setPricemaxs(value)
  const updatepricenight = (value) => setPricenight(value)
  const updaterental = (value) => Setrentalform(value)

  const updateEquipment = (value) => setEquipment(value)
  const updateAmenities = (value) => setAmenities(value)
  const updateFacilities = (value) => setselectedFacilities(value)
  const updatesort =  (value) => setsortOption(value)
  const updatesorting = (value) => setsort(value)
  const updatepricemax = (value) => setPricemax(value)
  const updatepricemins = (value) => setPricemins(value)

  const updateBeds = (value) => setBeds(value)
  const updateBathrooms = (value) => setBathrooms(value)
  const updateBedss = (value) => setBedss(value)
  const updateBathroomss = (value) => setBathroomss(value)

  const updateamenity = (value) => setamenity(value)
  const updatebooking = (value) => setbooking(value)
  const updateSelectedpage = (page) => setSelectedpage(page);
  const updatestartdate = (value) => setStartDate(value)
  const updatendate = (value) => setEndDate(value)
  //
  const updateAdults = (value) => setAdults(value);
  const updateChildren = (value) => setChildren(value);
  const updateInfants = (value) => setInfants(value);
  // const updateBedrooms = (value) => setBedrooms(value);
  // const updateBathrooms = (value) => setBathrooms(value);
  const updateTravelingWithPet = (value) => setTravelingWithPet(value);
  const updateDatas = (value) => setAdata(value);
  // const updatePricemin = (value) => setPricemin(value);
  // const updatePricemax = (value) => setPricemax(value);
//
  const updateSelectedPlan = (plan) => setSelectedPlan(plan);
  const updateNote = (value) => setNote(value);
  const updateimages = (value) => setImage(value);
  const updateSelectedWeb = (value) => setSelectedWeb(value);
  const updateLocation = (value) => setLocation(value);
  const updateNotification = (value) => setNotification(value);
  const updateRating = (value) => setRating(value);
  const updateoverallRating = (value) => setoverallRating(value);
  const updatehostoverallRating =  (value) => sethostoverallRating(value);
  const updatehostcommentleght = (value) => sethostcommentleght(value); 
  const updatecommetlenght = (value) => setcommentleght(value);
  
const updatedrop = (value) => setdrop(value);
  // Functions to update other state variables
  const updateUser = (value) => setUser(value);
  const updatePhoneNumber = (value) => setPhoneNumber(value);
  const updatePlanName = (value) => setPlanName(value);
  const updateWebsiteInformation = (value) => setWebsiteInformation(value);
  const updateNoteOnFilling = (value) => setNoteOnFilling(value);
  const updateCompanyName = (value) => setCompanyName(value);
  const updateStreetNumber = (value) => setStreetNumber(value);
  const updateCity = (value) => setCity(resolveCanonicalCity(value));
  const updateZipcode = (value) => setZipcode(value);
  const updateCountry = (value) => setCountry(value);
  const updateIdNumber = (value) => setIdNumber(value);
  const updateid = (value) => setId(value);
  const updatedate = (value) => setDate(value);
  const updateTin = (value) => setTin(value);
  const updateVatNumber = (value) => setVatNumber(value);
  const updateperson = (value) => setperson(value);
  
  // FormData update function
  const updateFormData = (name, value) => {
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  return (
    <FormContext.Provider
      value={{
        selectedPlan,
        updateSelectedPlan,
        selectedWeb,
        loadingProperties,
        selectedpage,
        updatelang,
        lang,
        //
        updateservices,
        services,
        updateBathroomAmenities,
        BathroomAmenities,
        updateKitchenDiningAmenities ,
        KitchenDiningAmenities,
     updateHeatingCoolingAmenities ,
     HeatingCoolingAmenities,
         updateSafetyAmenities ,
         SafetyAmenities,
     updateWellnessAmenities ,
     WellnessAmenities,
     updateOutdoorAmenities ,
     OutdoorAmenities,
     updateParkingFacilities ,
     ParkingFacilities,
       updateCheckInOptions ,
       CheckInOptions,
      updateMeals,
      Meals,
       updatePets,
       Pets,
       updateSmoking,
       smoking,
       updatePartyOrganizing ,
       PartyOrganizing,
       
       accommodationName,
    updateAccommodationName,

      //
        updatepricenight,
        updatedate,
        updatestate,
        updatestartdatein,
        updateenddatein,
        startdatein,
        enddatein,
        state,
        updatestateout,
        stateout,
        date,
        pricenight,
        updateNotification,
        notification,
        updatehostcommentleght,
        updatehostoverallRating,
        hostoverallRating,
        hostcommentleght,

        updateDatas,
        updatestartdate,
        updatecommetlenght,
        updateoverallRating,
        commentleght,
        overallRating,

        accdata,
        updateFacilities,
        Facilities,
        updateAmenities, 
        Amenities,
        updateacclen,
        acclen,

        updateimages,
        updaterental,
        rentalform,
        updateid,
        ida,
        images,
        updateSelectedpage,
         setLoadingProperties,
        updateEquipment,
        Equipment,
        updatesorting,
        sort,
        updatepricemin,
        updatepricemins,
        updatepricemaxs,
        updateBedss,
        updateBathroomss
        ,
        Bedss,
        Bathroomss,
        selected,
        updateselected,
        pricemaxs,
        pricemins, 

        pricemin,
        updatebooking,
        booking,
        updatepricemax,
        updatendate ,
        enddate,
        startdate,
        updateTravelingWithPet,
        travelingWithPet,
        updateAdults,
        adults,
        updateChildren,
        childrens,
        updateInfants,
        infants,

        pricemax,
        updatesort,
        updateBeds,
        updateBathrooms,
        updateamenity,
        amenity,
        Beds,
        Bathrooms,
        sortOption,
        updateSelectedWeb,
        note,
        updateNote,
        phoneNumber,
        updateRating,
        Rating,
        updatePhoneNumber,
        location,
        updateLocation,
        planName,
        updatePlanName,
        person,
        updateperson,
        user,
        drop,
        updatedrop,

        updateUser,
        websiteInformation,
        updateWebsiteInformation,
        noteOnFilling,
        updateNoteOnFilling,
        companyName,
        updateCompanyName,
        streetNumber,
        updateStreetNumber,
        city,
        updateCity,
        zipcode,
        updateZipcode,
        country,
        updateCountry,
        idNumber,
        updateIdNumber,
        tin,
        updateTin,
        vatNumber,
        updateVatNumber,
        company,
        setCompany,
        formData,
        updateFormData,
        isFullscreenModalOpen,
        setIsFullscreenModalOpen,
      }}
    >
      {children}
    </FormContext.Provider>
  );
};