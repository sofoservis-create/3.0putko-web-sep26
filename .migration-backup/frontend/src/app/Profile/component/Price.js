"use client"
import React, { useContext, useEffect, useState } from "react";
import { format } from 'date-fns';
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
import { AuthContext } from "../../context/AuthContext";
import { CircleCheckBig, CircleX, Info, Mail, Phone, User } from "lucide-react";
import FeeBreakdown from "../../components/FeeBreakdown";
import { formatCalendarDate } from '../../utlis/calendarDate';

const Price = ({ priceDetails: initialPriceDetails }) => {
  const [priceDetails, setPriceDetails] = useState(initialPriceDetails);

  useEffect(() => {
    const fetchLatestDetails = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/reservation/${initialPriceDetails._id}`);
        if (response.ok) {
          const data = await response.json();
          setPriceDetails(data);
        }
      } catch (error) {
        console.error("Error fetching latest reservation details:", error);
      }
    };

    fetchLatestDetails();
  }, [initialPriceDetails._id]);

  const translations = { en, sk }

  const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
  const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"
  const { user } = useContext(AuthContext);
  const [show, setShow] = useState("");

  const hostName = user?.name;
  const hostEmail = user?.email;
  const hostNumber = priceDetails?.accommodationId?.phoneNumber

  console.log("hostName: ", hostName);
  console.log("hostEmail: ", hostEmail);
  console.log("hostNumber: ", hostNumber);

  // Update language state when `lang` changes in FormContext
  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  console.log("Price Details: ", priceDetails);
  const name = priceDetails.name;
  const emails = priceDetails.email;

  // const email = priceDetails.email; 
  const startDate = format(new Date(priceDetails.checkInDate), "yyyy-MM-dd");
  const endDate = format(new Date(priceDetails.checkOutDate), "yyyy-MM-dd");

  console.log("start date", startDate);
  console.log("end date", endDate);

  console.log("name", name, "email", emails);

  const [showModal, setShowModal] = useState(false);
  const [isDisabled, setIsDisabled] = useState(
    priceDetails.isApproved === "approved" || priceDetails.isApproved === "cancelled"
  );

  const [selectedOption, setSelectedOption] = useState(
    priceDetails.isApproved === "approved" ? t.Approve
      : priceDetails.isApproved === "cancelled" ? t.Cancel
        : t.Action
  );

  const handleOptionClick = (option) => {
    if (!isDisabled) {
      setSelectedOption(option);
      setIsDisabled(true); // Disable both buttons after selection
    }
  };
  console.log("selectedOption", selectedOption)

  const [email, setEmail] = useState(priceDetails.email); // Set email from priceDetails
  const [error, setError] = useState(null);

  // Email sending function
  const sendEmail = async (customMessage, subject) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, subject, message: customMessage }),
      });

      if (response.ok) {
        alert(t.Emailsentsuccessfully);
        setShowModal(false);
      } else {
        const data = await response.json();
        setError(data.error || t.Failedtosendemail);
      }
    } catch (err) {
      setError(t.Anerroroccurredwhilesendingemail);
    }
  };
  //
  const [isEditing, setIsEditing] = useState(false);
  const handleEditClick = () => {
    setIsEditing(true);
  };

  // ✅ Meal translations (English ↔ Slovak)
  const mealTranslations = {
    "No Meals": "Bez stravy",
    "Breakfast": "Raňajky",
    "Half Board": "Polpenzia",
    "Full Board": "Plná penzia",
    "All-Inclusive": "All-inclusive",
  };

  // ✅ Get translated meal option based on selected language
  const getTranslatedMeal = (meal) => {
    return language === "sk"
      ? mealTranslations[meal] || meal
      : Object.keys(mealTranslations).find((key) => mealTranslations[key] === meal) || meal;
  };

  const handleSave = async () => {
    if (show === "cancelled") {
      return; // Stop execution if status is 'cancelled'
    }
    const userr = localStorage.getItem('user')
    if (userr) {
      const users = JSON.parse(userr);
      const userId = users._id;


      // Convert check-in and check-out dates to 'YYYY-MM-DD' format
      const startDate = format(new Date(priceDetails.checkInDate), "yyyy-MM-dd");
      const endDate = format(new Date(priceDetails.checkOutDate), "yyyy-MM-dd");

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/${priceDetails.accommodationId._id}/occupancyCalendar`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: format(new Date(priceDetails.checkInDate), "yyyy-MM-dd"),
            endDate: format(new Date(priceDetails.checkOutDate), "yyyy-MM-dd"),
            guestName: priceDetails.name,
            status: 'booked', // Send the calendar entry
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to update occupancy calendar: ${errorData.message}`);
        }

        const result = await response.json();
        console.log('Successfully updated:', result);
        alert(t.Calendarupdatedsuccessfully);
      } catch (error) {
        console.error('Error updating accommodation:', error);
        alert(t.Failedtoupdateaccommodation);
      }
    } else {
      alert('User not found. Please log in.');
    }
  };

  // Function to update the reservation by name and send an email
  const updateReservationByName = async (name, status, emailMessage, subject) => {

    const stripeEnabled = priceDetails.accommodationId?.stripeEnabled;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/reservation/reservations/${priceDetails._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isApproved: status, // Pass the status (approved/cancelled)
            ...(stripeEnabled && { language }), // Pass the current language
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update reservation");
      }

      const result = await response.json();
      console.log("Updated reservation:", result);
     if (status === "cancelled") {
      console.log("Reservation was cancelled — skipping calendar update.");
    } else if (status === "approved") {
      if (!stripeEnabled) {
        // If stripeEnable is false/missing → update calendar + send email
        await handleSave();
        if (emailMessage && subject) sendEmail(emailMessage, subject);
      } else {
        // stripeEnable true → skip handleSave & email here
        console.log("Stripe enabled: skipping direct calendar/email handling");
      }
    }
    } catch (error) {
      console.error("Error updating reservation:", error);
    }
  };
 
  // When "Approve" is clicked
  const handleApproved = async () => {
    handleOptionClick(t.Approve);

    const locale = language === 'sk' ? 'sk-SK' : 'en-US';

    const checkInDateFormatted = formatCalendarDate(priceDetails.checkInDate, locale, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const checkOutDateFormatted = formatCalendarDate(priceDetails.checkOutDate, locale, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  
    const subject = `${t.ReservationRequestApproved}: ${priceDetails.accommodationId.name}`;
  
    // Image URL and Google Maps link
    const propertyImage = priceDetails.accommodationId.images[0];
    const location = priceDetails.accommodationId.locationDetails;
    const Address = location.streetAndNumber;
    
    const googleMapsLink = `https://www.google.com/maps?q=${encodeURIComponent(Address)}`;
  
    const congratsMessage = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto;">
        <h2 style="color: #FF5A5F; text-align: center;">${t.YourReservationisConfirmed}!</h2>
        <img 
          src="${propertyImage}" 
          alt="Property Image" 
          style="width: 100%; height: 300px; object-fit: cover; border-radius: 10px; margin-bottom: 20px;" 
        />
        <p>${t.Hi} <strong>${priceDetails.name}</strong>,</p>
        <p>
          ${t.CongratulationsYourreservationrequestfor} <strong>${priceDetails.accommodationId.name}</strong> 
          ${t.hasbeenapprovedWeareexcitedtohostyouandprovideanexceptionalexperience}
        </p>
        <p>
          ${t.Ifyouneedto} <strong>${t.cancelyourreservation},</strong> ${t.pleasefeelfreetocontactthehostdirectlyatyourearliestconvenienceWewillbehappytoassistyouwiththeprocess}
        </p>
        <p>
          <strong>Stay Details:</strong><br />
          ${t.Checki}: ${checkInDateFormatted}<br />
          ${t.Checko}: ${checkOutDateFormatted}<br />
          ${t.NumberofGuests}: ${priceDetails.numberOfPersons}<br />
        </p>
        <p>
          <strong>${t.Propertylocation}:</strong><br />
          <a href="${googleMapsLink}" style="color: #FF5A5F; text-decoration: none;"> ${t.ViewLocationonMap}</a>
        </p>
        <!-- Host Information -->
        <div style="margin-bottom: 24px; padding: 16px 0; border-top: 1px solid #f0f0f0;">
          <h2 style="font-size: 18px; color: #333; margin-bottom: 12px; font-weight: 600;">${t.HostDetails}</h2>
          <p style="margin: 10px 0; font-size: 16px; color: #555;"><strong>${t.name}:</strong> ${hostName || 'N/A'}</p>
          <p style="margin: 10px 0; font-size: 16px; color: #555;"><strong>${t.email}:</strong> ${hostEmail || 'N/A'}</p>
          <p style="margin: 10px 0; font-size: 16px; color: #555;"><strong>${t.Phone}#:</strong> ${hostNumber || 'N/A'}</p>
        </div>
        <p>
          ${t.Ifyouhaveanyquestionsorspecialrequests}
        </p>
        <p style="margin-top: 30px;">
          ${t.Bestregards},<br />
          <strong>${t.ThePutkoTeam}</strong>
        </p>
      </div>
    `.trim();
  
    // Call updateReservationByName with the subject and formatted message
    updateReservationByName(priceDetails.name, "approved", congratsMessage, subject);
      // Wait for 10 seconds AFTER the operation completes
      await new Promise((resolve) => setTimeout(resolve, 10000));
  };

  
  // When "Cancel" is clicked
  const handleCancel = () => {
    handleOptionClick(t.Cancel);
    // setIsOpen(false); // Close the dropdown

    const locale = language === 'sk' ? 'sk-SK' : 'en-US';

    const subject = `${t.YourReservationCancelled}: ${priceDetails.accommodationId.name}`;
    
    const checkInDateFormatted = formatCalendarDate(priceDetails.checkInDate, locale, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const checkOutDateFormatted = formatCalendarDate(priceDetails.checkOutDate, locale, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  
    const propertyImage = priceDetails.accommodationId.images[0];
    const location = priceDetails.accommodationId.locationDetails;
    const Address = location.streetAndNumber;
   
    
    const googleMapsLink = `https://www.google.com/maps?q=${encodeURIComponent(Address)}`;
    
    const sorryMessage = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto;">
        <h2 style="color: #FF5A5F; text-align: center;">${t.YourReservationCancelled}</h2>
         <img 
          src="${propertyImage}" 
          alt="Property Image" 
          style="width: 100%; height: 300px; object-fit: cover; border-radius: 10px; margin-bottom: 20px;" 
        />
        <p>${t.Hi} <strong>${priceDetails.name}</strong>,</p>
        <p>
          ${t.Weregrettoinformyouthatyourreservationfor} <strong>${priceDetails.accommodationId.name}</strong> 
          ${t.hasbeencancelledWeunderstandthismaybedisappointingandwesincerelyapologizeforanyinconveniencecaused}.
        </p>
        <p>
          <strong>Cancelled Stay Details:</strong><br />
          Check-in: ${checkInDateFormatted}<br />
          Check-out: ${checkOutDateFormatted}<br />
          ${t.NumberofGuests}: ${priceDetails.numberOfPersons}<br />
        </p>
        <p>
          <strong>${t.Propertylocation}:</strong><br />
          <a href="${googleMapsLink}" style="color: #FF5A5F; text-decoration: none;">${t.ViewLocationonMap}</a>
        </p>
        <p>
          ${t.Ifyouhaveanyquestionsorrequirefurtherassistancefeelfreetoreachouttous}
        </p>
        <p style="margin-top: 30px;">
          ${t.Bestregards},<br />
          <strong>${t.ThePutkoTeam}</strong>
        </p>
      </div>
    `.trim();
  
    // Call updateReservationByName with the subject and formatted message
    setShow("cancelled")
    console.log("show ",show)
    updateReservationByName(priceDetails.name, "cancelled", sorryMessage, subject);
      // Refresh the page after the action
  setTimeout(() => {
    window.location.reload(); 
  }, 1000);
  };  

  return ( 
    <div className="min-h-screen py-10 overflow-x-hidden bg-slate-50/50">
      <div className="w-full max-w-4xl p-6 mx-auto bg-white border border-[#1E3E2B]/10 shadow-sm sm:p-10 rounded-3xl">
        {/* Apartment Info */}
        <div className="flex flex-wrap items-center gap-6 mb-10">
          <img
            src={priceDetails.accommodationId.images[0]}
            alt="Apartment"
            className="object-cover w-24 h-24 border border-[#1E3E2B]/10 shadow-xs rounded-2xl"
          />
          <div className="flex-1 max-w-full min-w-0">
            <h2 className="text-3xl font-extrabold text-[#1E3E2B] tracking-tight break-words break-all sm:whitespace-normal">
              {priceDetails.accommodationId.name}
            </h2>
            <p className="text-sm font-semibold text-slate-500 mt-1.5 break-words break-all whitespace-normal">
              {priceDetails.accommodationId.locationDetails?.name}
            </p>
          </div>
        </div>

        {/* Action Section */}
        <div className="p-6 mb-8 border border-[#DFBA73]/30 bg-[#DFBA73]/5 rounded-2xl shadow-xs">
          <h4 className="flex items-center gap-2 mb-3 text-lg font-bold text-[#1E3E2B]">
            <Info className="text-[#DFBA73] w-5 h-5" /> {t.Action}
          </h4>

          {/* <div className="flex flex-wrap gap-3">
            <button
              onClick={handleApproved}
              disabled={isDisabled}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold shadow-xs transition-all duration-200 active:scale-95 ${
                isDisabled
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  : "bg-[#319A81] text-white hover:bg-[#257562] hover:shadow-md"
              }`}
            >
              <CircleCheckBig className="w-4 h-4" /> {t.Approve}
            </button>

            <button
              onClick={handleCancel}
              disabled={isDisabled}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold shadow-xs transition-all duration-200 active:scale-95 ${
                isDisabled
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  : "bg-rose-600 text-white hover:bg-rose-700 hover:shadow-md"
              }`}
            >
              <CircleX className="w-4 h-4" /> {t.Cancel}
            </button>
          </div> */}

          {/* Text message */}
          <div className="mt-3 text-sm leading-relaxed text-slate-700 font-medium">
            {isDisabled && selectedOption === t.Approve && (
              <p className="flex items-center gap-2 text-[#319A81] font-bold">
                <CircleCheckBig className="w-5 h-5" /> {t.Youhaveapprovedthereservationrequest}.
              </p>
            )}
            {isDisabled && selectedOption === t.Cancel && (
              <p className="flex items-center gap-2 text-rose-600 font-bold">
                <CircleX className="w-5 h-5" /> {t.Youhavecancelledtherequest}.
              </p>
            )}
            {!isDisabled && (
              <p>
                <span className="text-[#DFBA73] font-bold mr-1">ℹ️</span> {t.Bychangingthestatusto}{" "}
                <strong className="text-[#1E3E2B]">{t.Approved}</strong> {t.or}{" "}
                <strong className="text-[#1E3E2B]">{t.Canceled}</strong>,{" "}
                {t.theoccupancyautomaticallychangesandcanbeupdatedintheoccupancycalendarYoucanedittherequestasneededandsendittothecustomerbyemail}.
              </p>
            )}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {/* Payment Section - Only if totalPrice > 0 */}
          {priceDetails.totalPrice > 0 && (
            <div className="group relative flex flex-col overflow-hidden bg-white border border-[#1E3E2B]/10 rounded-2xl shadow-xs hover:shadow-xl transition-all duration-300">
              <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-[#1E3E2B]/[0.02] border-b border-[#1E3E2B]/5">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 text-sm font-bold text-[#319A81] bg-[#319A81]/10 rounded-lg">1/4</span>
                  <h3 className="text-lg font-bold text-[#1E3E2B]">{t.PaymentStatus}</h3>
                </div>
              </div>

              <div className="p-6 space-y-4 text-slate-700 text-sm font-medium">
                <div className="flex flex-wrap justify-between items-center">
                  <span className="text-slate-500">{t.PaymentStatus}</span>
                  <span className={`font-bold px-3 py-1 rounded-lg text-xs uppercase tracking-wider ${
                    priceDetails.paymentStatus === 'paid' ? 'bg-[#319A81]/10 text-[#257562] border border-[#319A81]/20' :
                    priceDetails.paymentStatus === 'refunded' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                    'bg-[#DFBA73]/15 text-[#9a7a3a] border border-[#DFBA73]/30'
                  }`}>
                    {priceDetails.paymentStatus === 'paid' ? t.Paid :
                      priceDetails.paymentStatus === 'refunded' ? t.Refunded : t.Unpaid}
                  </span>
                </div>
                <div className="h-px bg-[#1E3E2B]/5" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">{t.Totalprice}</span>
                  <span className="font-extrabold text-base text-[#1E3E2B]">
                    €{priceDetails.totalPrice}
                  </span>
                </div>

                {/* What the host is actually paid out. Uses the real Stripe fee
                    once the payment has settled, otherwise the server estimate. */}
                <FeeBreakdown
                  amountCents={
                    priceDetails.totalPriceCents ||
                    Math.round((Number(priceDetails.totalPrice) || 0) * 100)
                  }
                  stripeFeeCents={
                    priceDetails.paymentStatus === 'paid'
                      ? priceDetails.stripeFeeCents ?? null
                      : null
                  }
                  labels={t}
                  className="mt-2 border-[#1E3E2B]/10"
                />
              </div>
            </div>
          )}

          {/* Stay Section */}
          <div className="group relative flex flex-col overflow-hidden bg-white border border-[#1E3E2B]/10 rounded-2xl shadow-xs hover:shadow-xl transition-all duration-300">
            <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-[#1E3E2B]/[0.02] border-b border-[#1E3E2B]/5">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 text-sm font-bold text-[#319A81] bg-[#319A81]/10 rounded-lg">2/4</span>
                <h3 className="text-lg font-bold text-[#1E3E2B]">Stay</h3>
              </div>
            </div>

            <div className="p-6 space-y-4 text-slate-700 text-sm font-medium">
              <div className="flex flex-wrap justify-between items-center">
                <span className="text-slate-500">{t.Datefromto}</span>
                <span className="font-bold text-[#1E3E2B] text-right">
                  {formatCalendarDate(priceDetails.checkInDate)} —{" "}
                  {formatCalendarDate(priceDetails.checkOutDate)} (
                  {Math.ceil(
                    (new Date(priceDetails.checkOutDate) -
                      new Date(priceDetails.checkInDate)) /
                    (1000 * 60 * 60 * 24)
                  )}{" "}
                  {t.nights})
                </span>
              </div>
              <div className="h-px bg-[#1E3E2B]/5" />
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{t.Numberofpersons}</span>
                <span className="font-bold text-[#1E3E2B]">
                  {priceDetails.numberOfPersons} {t.adults}
                </span>
              </div>
              <div className="h-px bg-[#1E3E2B]/5" />
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{t.Meals}</span>
                <span className="font-bold text-[#1E3E2B]">
                  {getTranslatedMeal(priceDetails.accommodationId.meals[language]) ||
                    `${t.None}`}
                </span>
              </div>
            </div>
          </div>

          {/* Accommodation Section */}
          <div className="group relative flex flex-col overflow-hidden bg-white border border-[#1E3E2B]/10 rounded-2xl shadow-xs hover:shadow-xl transition-all duration-300">
            <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-[#1E3E2B]/[0.02] border-b border-[#1E3E2B]/5">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 text-sm font-bold text-[#319A81] bg-[#319A81]/10 rounded-lg">3/4</span>
                <h3 className="text-lg font-bold text-[#1E3E2B]">Accommodation</h3>
              </div>
            </div>

            <div className="flex flex-wrap items-start justify-between p-6 text-sm">
              <div className="font-extrabold text-base text-[#1E3E2B]">
                {priceDetails.accommodationId.name}
              </div>
              <div className="text-right text-slate-600 font-medium space-y-1">
                <p>{priceDetails.accommodationId.locationDetails?.name}</p>
                <p className="font-bold text-[#319A81]">
                  {priceDetails.numberOfPersons} {t.adults}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Contact Section */}
          <div className="group relative flex flex-col overflow-hidden bg-white border border-[#1E3E2B]/10 rounded-2xl shadow-xs hover:shadow-xl transition-all duration-300">
            <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-[#1E3E2B]/[0.02] border-b border-[#1E3E2B]/5">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 text-sm font-bold text-[#319A81] bg-[#319A81]/10 rounded-lg">4/4</span>
                <h3 className="text-lg font-bold text-[#1E3E2B]">{t.CustomerContact}</h3>
              </div>
            </div>

            <div className="p-6 space-y-4 text-slate-700 text-sm font-medium">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 border border-slate-200">
                  <User className="w-5 h-5 text-slate-500" />
                </div>
                <span className="font-bold text-base text-[#1E3E2B]">
                  {priceDetails.name} {priceDetails.surname}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#319A81]/10 border border-[#319A81]/20">
                  <Mail className="w-5 h-5 text-[#319A81]" />
                </div>
                <a
                  href={`mailto:${priceDetails.email}`}
                  className="font-bold text-[#319A81] break-all hover:text-[#257562] transition-colors"
                >
                  {priceDetails.email}
                </a>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 border border-slate-200">
                  <Phone className="w-5 h-5 text-slate-500" />
                </div>
                <a
                  href={`tel:${priceDetails.phone}`}
                  className="font-bold text-slate-700 hover:text-[#1E3E2B] transition-colors"
                >
                  +{priceDetails.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Price; 