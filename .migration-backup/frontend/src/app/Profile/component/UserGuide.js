"use client";
import React, { useContext, useEffect, useState } from 'react';
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";

const UserGuide = () => {
  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");
  const [activeSection, setActiveSection] = useState("reservation");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  // Precise 1:1 mapping of strings for the interactive side navigation links
  const menuItems = [
    { id: "reservation", label: t.userGuide?.reservation?.title || "Reservation Requests" },
    { id: "add-accommodation", label: t.userGuide?.addAccommodation?.title || "Add Accommodation" },
    { id: "calendar", label: t.userGuide?.bookingCalendar?.title || "Booking Calendar" },
    { id: "sync", label: t.userGuide?.sync?.title || "Calendar Synchronization" },
    { id: "manage", label: t.userGuide?.manage?.title || "Manage Accommodation" },
    { id: "profile", label: t.userGuide?.editProfile?.title || "Edit Profile" },
    { id: "password", label: t.userGuide?.changePassword?.title || "Change Password" }
  ];

  const scrollToSection = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Page Title & Subtitle Banner */}
      <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          {t.userGuide?.title || "User Guide"}
        </h1>
        <p className="text-lg text-gray-500 font-medium leading-relaxed">
          {t.userGuide?.subtitle || "Learn how to manage reservations and update your profile step by step."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 items-start">
        {/* Sticky Sidebar Menu (Desktop Only) */}
        <aside className="hidden lg:block sticky top-8 bg-gray-50/80 backdrop-blur-md p-5 rounded-2xl border border-gray-200/60">
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`w-full text-left px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  activeSection === item.id
                    ? "bg-gray-900 text-white shadow-md shadow-gray-900/10"
                    : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Guide Content */}
        <main className="lg:col-span-3 space-y-16">
          
          {/* Reservation Requests Section */}
          <section id="reservation" className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-8 scroll-mt-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {t.userGuide?.reservation?.title || "Reservation Requests"}
              </h2>
            </div>

            {/* Overview Screenshot Layout */}
            <div className="group overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-2">
              <img
                src="/reservation-request.avif"
                alt="Reservation Requests Page"
                className="w-full h-auto rounded-lg shadow-sm"
              />
              <p className="text-xs text-gray-400 mt-2 text-center font-medium">
                {t.userGuide?.reservation?.overviewCaption || "Overview of the Reservation Requests page."}
              </p>
            </div>

            {/* Content Split Cards */}
            <div className="space-y-12">
              {/* Section 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-gray-900">
                    {t.userGuide?.reservation?.s1Title || "1. View Confirmed Reservations"}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {(t.userGuide?.reservation?.s1TextA || "On the Reservation Requests page, you can see all booking requests.") + " " + (t.userGuide?.reservation?.s1TextB || "To display only confirmed reservations, click the red button. Click again to switch back to all reservations.")}
                  </p>
                </div>
                
              </div>

              {/* Section 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="border border-gray-100 p-1.5 bg-gray-50 rounded-xl md:order-2">
                  <img src="/Own.avif" alt="Add Custom Booking Example" className="w-full h-auto rounded-lg shadow-sm" />
                  <p className="text-[11px] text-gray-400 mt-1.5 text-center font-medium">
                    {t.userGuide?.reservation?.s2Caption || "Adding a custom booking date."}
                  </p>
                </div>
                <div className="space-y-3 md:order-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {t.userGuide?.reservation?.s2Title || "2. Add Your Own Booking"}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {t.userGuide?.reservation?.s2Text || "To manually add a reservation, click the red button in the top-right corner."}
                  </p>
                </div>
              </div>

              {/* Section 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    {t.userGuide?.reservation?.s3Title || "3. Approve or Reject a Request"}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {t.userGuide?.reservation?.s3Intro || "Each request includes a Process button. Choose an option:"}
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600 font-medium">
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{t.userGuide?.reservation?.s3Approve || "Approve → confirm the booking."}</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      <span>{t.userGuide?.reservation?.s3Cancel || "Cancel → reject the request."}</span>
                    </li>
                  </ul>
                </div>
                <div className="border border-gray-100 p-1.5 bg-gray-50 rounded-xl">
                  <img src="/Button.avif" alt="Approve or Cancel Example" className="w-full h-auto rounded-lg shadow-sm" />
                  <p className="text-[11px] text-gray-400 mt-1.5 text-center font-medium">
                    {t.userGuide?.reservation?.s3Caption || "Approving or rejecting a reservation."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Add Accommodation Section */}
          <section id="add-accommodation" className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-8 scroll-mt-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {t.userGuide?.addAccommodation?.title || "Add Accommodation"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {t.userGuide?.addAccommodation?.intro || "Create and publish your listing in simple steps."}
              </p>
            </div>

            {/* Stepper Timeline UI Design */}
            <div className="space-y-10">
              {/* Step 1 */}
              <div className="flex flex-col md:flex-row gap-6 items-start border-l-2 border-gray-100 pl-6 relative">
                <span className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shadow-sm">1</span>
                <div className="space-y-1 md:w-1/3">
                  <h4 className="font-bold text-gray-900 text-base">{t.userGuide?.addAccommodation?.s1Title || "1. Basic Information"}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{t.userGuide?.addAccommodation?.s1Text || "Enter name and choose a property type."}</p>
                </div>
                <div className="md:w-2/3 border border-gray-100 bg-gray-50 p-1 rounded-xl w-full">
                  <img src="/Info.avif" alt="Add Accommodation - Basic Info" className="rounded-lg max-h-48 object-cover w-full shadow-sm" />
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col md:flex-row gap-6 items-start border-l-2 border-gray-100 pl-6 relative">
                <span className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shadow-sm">2</span>
                <div className="space-y-1 md:w-1/3">
                  <h4 className="font-bold text-gray-900 text-base">{t.userGuide?.addAccommodation?.s2Title || "2. Property Location"}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{t.userGuide?.addAccommodation?.s2Text || "Provide full address details."}</p>
                </div>
                <div className="md:w-2/3 border border-gray-100 bg-gray-50 p-1 rounded-xl w-full">
                  <img src="/Location.avif" alt="Add Accommodation - Location" className="rounded-lg max-h-48 object-cover w-full shadow-sm" />
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col md:flex-row gap-6 items-start border-l-2 border-gray-100 pl-6 relative">
                <span className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shadow-sm">3</span>
                <div className="space-y-1 md:w-1/3">
                  <h4 className="font-bold text-gray-900 text-base">{t.userGuide?.addAccommodation?.s3Title || "3. Details of Accommodation"}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{t.userGuide?.addAccommodation?.s3Text || "Add bedrooms, bathrooms, and spaces."}</p>
                </div>
                <div className="md:w-2/3 border border-gray-100 bg-gray-50 p-1 rounded-xl w-full">
                  <img src="/Detail.avif" alt="Add Accommodation - Details" className="rounded-lg max-h-48 object-cover w-full shadow-sm" />
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col md:flex-row gap-6 items-start border-l-2 border-gray-100 pl-6 relative">
                <span className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shadow-sm">4</span>
                <div className="space-y-1 md:w-1/3">
                  <h4 className="font-bold text-gray-900 text-base">{t.userGuide?.addAccommodation?.s4Title || "4. Amenities"}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{t.userGuide?.addAccommodation?.s4Text || "Select all available amenities."}</p>
                </div>
                <div className="md:w-2/3 border border-gray-100 bg-gray-50 p-1 rounded-xl w-full">
                  <img src="/Amenities.avif" alt="Add Accommodation - Amenities" className="rounded-lg max-h-48 object-cover w-full shadow-sm" />
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex flex-col md:flex-row gap-6 items-start border-l-2 border-gray-100 pl-6 relative">
                <span className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shadow-sm">5</span>
                <div className="space-y-1 md:w-1/3">
                  <h4 className="font-bold text-gray-900 text-base">{t.userGuide?.addAccommodation?.s5Title || "5. House Rules"}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{t.userGuide?.addAccommodation?.s5Text || "Define smoking, pets, parties, or noise rules."}</p>
                </div>
                <div className="md:w-2/3 border border-gray-100 bg-gray-50 p-1 rounded-xl w-full">
                  <img src="/House.avif" alt="Add Accommodation - House Rules" className="rounded-lg max-h-48 object-cover w-full shadow-sm" />
                </div>
              </div>

              {/* Step 6 */}
              <div className="flex flex-col md:flex-row gap-6 items-start border-l-2 border-gray-100 pl-6 relative">
                <span className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shadow-sm">6</span>
                <div className="space-y-1 md:w-1/3">
                  <h4 className="font-bold text-gray-900 text-base">{t.userGuide?.addAccommodation?.s6Title || "6. Description"}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{t.userGuide?.addAccommodation?.s6Text || "Write an engaging description highlighting unique features."}</p>
                </div>
                <div className="md:w-2/3 border border-gray-100 bg-gray-50 p-1 rounded-xl w-full">
                  <img src="/Description.avif" alt="Add Accommodation - Description" className="rounded-lg max-h-48 object-cover w-full shadow-sm" />
                </div>
              </div>

              {/* Step 7 */}
              <div className="flex flex-col md:flex-row gap-6 items-start border-l-2 border-gray-100 pl-6 relative">
                <span className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shadow-sm">7</span>
                <div className="space-y-1 md:w-1/3">
                  <h4 className="font-bold text-gray-900 text-base">{t.userGuide?.addAccommodation?.s7Title || "7. Photos & Media"}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{t.userGuide?.addAccommodation?.s7Text || "Upload high-quality images of all areas."}</p>
                </div>
                <div className="md:w-2/3 border border-gray-100 bg-gray-50 p-1 rounded-xl w-full">
                  <img src="/Photos.avif" alt="Add Accommodation - Photos" className="rounded-lg max-h-48 object-cover w-full shadow-sm" />
                </div>
              </div>

              {/* Step 8 */}
              <div className="flex flex-col md:flex-row gap-6 items-start border-l-2 border-gray-100 pl-6 relative">
                <span className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shadow-sm">8</span>
                <div className="space-y-1 md:w-1/3">
                  <h4 className="font-bold text-gray-900 text-base">{t.userGuide?.addAccommodation?.s8Title || "8. Pricing & Availability"}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{t.userGuide?.addAccommodation?.s8Text || "Set nightly price, fees, discounts, and calendar."}</p>
                </div>
                <div className="md:w-2/3 border border-gray-100 bg-gray-50 p-1 rounded-xl w-full">
                  <img src="/Price.avif" alt="Add Accommodation - Pricing" className="rounded-lg max-h-48 object-cover w-full shadow-sm" />
                </div>
              </div>

              {/* Step 9 */}
              <div className="flex flex-col md:flex-row gap-6 items-start border-l-2 border-gray-100 pl-6 relative">
                <span className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shadow-sm">9</span>
                <div className="space-y-1 md:w-1/3">
                  <h4 className="font-bold text-gray-900 text-base">{t.userGuide?.addAccommodation?.s9Title || "9. Check-in, Check-out & Notes"}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{t.userGuide?.addAccommodation?.s9Text || "Set check-in/out times and add important notes."}</p>
                </div>
                <div className="md:w-2/3 border border-gray-100 bg-gray-50 p-1 rounded-xl w-full">
                  <img src="/Check.avif" alt="Add Accommodation - Check-in & Notes" className="rounded-lg max-h-48 object-cover w-full shadow-sm" />
                </div>
              </div>

              {/* Step 10 Banner */}
              <div className="bg-emerald-50/60 border border-emerald-100 p-6 rounded-2xl space-y-3">
                <div className="flex items-center space-x-2 text-emerald-800">
                  <span className="text-lg">✨</span>
                  <h4 className="font-bold text-lg">
                    {t.userGuide?.addAccommodation?.s10Title || "10. Submit & Publish"}
                  </h4>
                </div>
                <p className="text-sm text-emerald-900/80 leading-relaxed">
                  {t.userGuide?.addAccommodation?.s10Text || "Review details and submit to publish your accommodation."}
                </p>
                <p className="text-sm font-semibold text-emerald-700 flex items-center pt-2">
                  <span>✅ {t.userGuide?.addAccommodation?.s10Congrats || "Congratulations! Your accommodation has been published successfully."}</span>
                </p>
              </div>
            </div>
          </section>

          {/* Booking Calendar Section */}
          <section id="calendar" className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 scroll-mt-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {t.userGuide?.bookingCalendar?.title || "Booking Calendar"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {t.userGuide?.bookingCalendar?.intro || "The Booking Calendar provides a clear overview of all booked dates."}
              </p>
            </div>

            <div className="border border-gray-100 p-2 bg-gray-50 rounded-xl">
              <img src="/Booking.avif" alt="Booking Calendar" className="w-full h-auto rounded-lg shadow-sm" />
              <p className="text-xs text-gray-400 mt-2 text-center font-medium">
                {t.userGuide?.bookingCalendar?.caption || "Example of the Booking Calendar view."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1">
                <h4 className="text-sm font-bold text-gray-900">Features</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {t.userGuide?.bookingCalendar?.bullet1 || "View Only – The calendar shows all confirmed bookings, but you cannot edit dates here."}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1">
                <h4 className="text-sm font-bold text-gray-900">Availability</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {t.userGuide?.bookingCalendar?.bullet2 || "Booked Dates Highlighted – Quickly see availability."}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-1">
                <h4 className="text-sm font-bold text-gray-900">Management</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {t.userGuide?.bookingCalendar?.bullet3 || "Multiple Properties – Switch between calendars if you manage several accommodations."}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 font-medium pt-2">
              {t.userGuide?.bookingCalendar?.note || "Use the calendar regularly to stay updated and avoid double bookings."}
            </p>
          </section>

          {/* Calendar Synchronization Section */}
          <section id="sync" className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 scroll-mt-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {t.userGuide?.sync?.title || "Calendar Synchronization"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {t.userGuide?.sync?.intro || "Connect with external platforms using iCal links to keep availability up-to-date."}
              </p>
            </div>

            <div className="border border-gray-100 p-2 bg-gray-50 rounded-xl">
              <img src="/Synchronization.avif" alt="Calendar Synchronization Example" className="w-full h-auto rounded-lg shadow-sm" />
              <p className="text-xs text-gray-400 mt-2 text-center font-medium">
                {t.userGuide?.sync?.caption || "Example of calendar synchronization setup."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <div className="space-y-3">
                <h3 className="text-md font-bold text-gray-900">
                  {t.userGuide?.sync?.howTitle || "How It Works"}
                </h3>
                <ul className="space-y-2.5 text-sm text-gray-600">
                  <li className="flex items-start"><span className="text-gray-400 mr-2">✓</span> {t.userGuide?.sync?.how1 || "Select Accommodation – Choose the property from your list."}</li>
                  <li className="flex items-start"><span className="text-gray-400 mr-2">✓</span> {t.userGuide?.sync?.how2 || "Add Synchronization URL – Paste the iCal link provided by the external platform."}</li>
                  <li className="flex items-start"><span className="text-gray-400 mr-2">✓</span> {t.userGuide?.sync?.how3 || "Automatic Updates – Bookings are imported and dates are blocked."}</li>
                  <li className="flex items-start"><span className="text-gray-400 mr-2">✓</span> {t.userGuide?.sync?.how4 || "Two-Way Sync – Export your calendar to external platforms (where supported)."}</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-md font-bold text-gray-900">
                  {t.userGuide?.sync?.whyTitle || "Why Use Synchronization?"}
                </h3>
                <p className="text-xs text-gray-400">
                  {t.userGuide?.sync?.whyIntro || "Essential if you list your property on multiple platforms. It helps you:"}
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-gray-900 mr-2"></span> {t.userGuide?.sync?.why1 || "Prevent overlapping bookings."}</li>
                  <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-gray-900 mr-2"></span> {t.userGuide?.sync?.why2 || "Save time by avoiding manual updates."}</li>
                  <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-gray-900 mr-2"></span> {t.userGuide?.sync?.why3 || "Keep your availability consistent everywhere."}</li>
                </ul>
              </div>
            </div>

            <p className="text-xs font-semibold text-gray-400 border-t border-gray-100 pt-4">
              {t.userGuide?.sync?.note || "Once saved, your calendar will stay updated automatically."}
            </p>
          </section>

          {/* Manage Accommodation Section */}
          <section id="manage" className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 scroll-mt-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {t.userGuide?.manage?.title || "Manage Accommodation"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {t.userGuide?.manage?.intro || "Update details or remove a property as needed."}
              </p>
            </div>

            <div className="border border-gray-100 p-2 bg-gray-50 rounded-xl">
              <img src="/Manage.avif" alt={t.userGuides?.manage?.imageAlt} className="w-full h-auto rounded-lg shadow-sm" />
              <p className="text-xs text-gray-400 mt-2 text-center font-medium">
                {t.userGuides?.manage?.imageCaption}
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-md font-bold text-gray-900">
                {t.userGuides?.manage?.actionsTitle}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Edit Button Item */}
                <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/30">
                  <span className="font-bold text-sm text-gray-900 block mb-2">
                    {t.userGuides?.manage?.editTitle}
                  </span>
                  <div className="text-xs text-gray-500 leading-relaxed">
                    {t.userGuides?.manage?.editDesc?.split("Edit").map((part, index, arr) => (
                      <React.Fragment key={index}>
                        {part}
                        {index < arr.length - 1 && (
                          <button className="px-2 py-1 bg-blue-600 text-white text-xs rounded mx-1 font-medium shadow-sm">
                            {t.userGuides?.manage?.editBtn}
                          </button>
                        )}
                      </React.Fragment>
                    )) || (
                      <span>
                        {t.userGuides?.manage?.editDesc?.replace(
                          "Edit",
                          <button className="px-2 py-1 bg-blue-600 text-white text-xs rounded font-medium shadow-sm">
                            {t.userGuides?.manage?.editBtn}
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete Button Item */}
                <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/30">
                  <span className="font-bold text-sm text-gray-900 block mb-2">
                    {t.userGuides?.manage?.deleteTitle}
                  </span>
                  <div className="text-xs text-gray-500 leading-relaxed">
                    {t.userGuides?.manage?.deleteDesc?.split("Delete").map((part, index, arr) => (
                      <React.Fragment key={index}>
                        {part}
                        {index < arr.length - 1 && (
                          <button className="px-2 py-1 bg-red-600 text-white text-xs rounded mx-1 font-medium shadow-sm">
                            {t.userGuides?.manage?.deleteBtn}
                          </button>
                        )}
                      </React.Fragment>
                    )) || (
                      <span>
                        {t.userGuides?.manage?.deleteDesc?.replace(
                          "Delete",
                          <button className="px-2 py-1 bg-red-600 text-white text-xs rounded font-medium shadow-sm">
                            {t.userGuides?.manage?.deleteBtn}
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-gray-900">
                {t.userGuides?.manage?.bestPracticesTitle}
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 list-disc list-inside">
                {t.userGuides?.manage?.bestPracticesList?.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>

            <p className="text-xs font-semibold text-gray-400 pt-2 border-t border-gray-100">
              {t.userGuides?.manage?.outro}
            </p>
          </section>

          {/* Edit Profile Section */}
          <section id="profile" className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 scroll-mt-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {t.userGuide?.editProfile?.title || "Edit Profile"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {t.userGuide?.editProfile?.intro || "Update your personal information and keep your account accurate."}
              </p>
            </div>

            {/* Media Screenshots Gallery Display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-gray-100 p-1.5 bg-gray-50 rounded-xl">
                <img src="/Profile.avif" alt="Edit Profile Page Example" className="w-full h-auto rounded-lg shadow-sm" />
                <p className="text-[11px] text-gray-400 mt-1.5 text-center font-medium">
                  {t.userGuide?.editProfile?.caption1 || "Example of the Edit Profile page."}
                </p>
              </div>
              <div className="border border-gray-100 p-1.5 bg-gray-50 rounded-xl">
                <img src="/Profile2.avif" alt="Edit Profile Details Example" className="w-full h-auto rounded-lg shadow-sm" />
                <p className="text-[11px] text-gray-400 mt-1.5 text-center font-medium">
                  {t.userGuide?.editProfile?.caption2 || "Profile fields where you can update your details."}
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="text-md font-bold text-gray-900">
                {t.userGuide?.editProfile?.infoTitle || "Information You Can Edit"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="p-3 border border-gray-50 rounded-xl bg-gray-50/40">
                  <strong className="text-gray-900 block font-semibold mb-0.5">{t.ProfileGuide?.ProfilePicture}</strong>
                  <span className="text-xs text-gray-500 leading-normal block">{t.ProfileGuide?.ProfilePicturedesc}</span>
                </div>
                <div className="p-3 border border-gray-50 rounded-xl bg-gray-50/40">
                  <strong className="text-gray-900 block font-semibold mb-0.5">{t.ProfileGuide?.FullName}</strong>
                  <span className="text-xs text-gray-500 leading-normal block">{t.ProfileGuide?.FullNamedesc}</span>
                </div>
                <div className="p-3 border border-gray-50 rounded-xl bg-gray-50/40">
                  <strong className="text-gray-900 block font-semibold mb-0.5">{t.dob}</strong>
                  <span className="text-xs text-gray-500 leading-normal block">{t.ProfileGuide?.DateOfBirth}</span>
                </div>
                <div className="p-3 border border-gray-50 rounded-xl bg-gray-50/40">
                  <strong className="text-gray-900 block font-semibold mb-0.5">{t.ProfileGuide?.PreferredLanguage}</strong>
                  <span className="text-xs text-gray-500 leading-normal block">{t.ProfileGuide?.PreferredLanguagedesc}</span>
                </div>
                <div className="p-3 border border-gray-50 rounded-xl bg-gray-50/40">
                  <strong className="text-gray-900 block font-semibold mb-0.5">{t.ProfileGuide?.About}</strong>
                  <span className="text-xs text-gray-500 leading-normal block">{t.ProfileGuide?.Aboutdesc}</span>
                </div>
                <div className="p-3 border border-gray-50 rounded-xl bg-gray-50/40">
                  <strong className="text-gray-900 block font-semibold mb-0.5">{t.address}</strong>
                  <span className="text-xs text-gray-500 leading-normal block">{t.ProfileGuide?.Address}</span>
                </div>
                <div className="p-3 border border-gray-50 rounded-xl bg-gray-50/40">
                  <strong className="text-gray-900 block font-semibold mb-0.5">{t.phoneNumber}</strong>
                  <span className="text-xs text-gray-500 leading-normal block">{t.ProfileGuide?.PhoneNumber}</span>
                </div>
                <div className="p-3 border border-gray-50 rounded-xl bg-gray-50/40">
                  <strong className="text-gray-900 block font-semibold mb-0.5">{t.gender}</strong>
                  <span className="text-xs text-gray-500 leading-normal block">{t.ProfileGuide?.Gender}</span>
                </div>
              </div>
            </div>

            {/* Save Profile Group Setup */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h3 className="text-md font-bold text-gray-900">
                {t.userGuide?.editProfile?.saveTitle || "Update Info"}
              </h3>
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl text-sm text-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  {(t.userGuide?.editProfile?.saveText || "Once you’ve updated your information, click the") + " "}
                  <button className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded mx-1 shadow-sm">
                    {t.Save || "Save"}
                  </button>
                  {" "}
                  <span className="italic font-medium text-emerald-800">“{t.userGuide?.editProfile?.saveConfirm || "Profile updated successfully."}”</span>
                </div>
              </div>
            </div>

            <p className="text-xs font-semibold text-gray-400 pt-2">
              {t.userGuide?.editProfile?.finalNote || "Keep your profile updated to help guests know more about you."}
            </p>
          </section>

          {/* Change Password Section */}
          <section id="password" className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 scroll-mt-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {t.userGuide?.changePassword?.title || "Change Password"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {t.userGuide?.changePassword?.intro || "Set a new password by entering it twice."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-1 border border-gray-100 p-1.5 bg-gray-50 rounded-xl">
                <img src="/Password.avif" alt="Change Password Example" className="w-full h-auto rounded-lg shadow-sm" />
                <p className="text-[10px] text-gray-400 mt-1.5 text-center font-medium">
                  {t.userGuide?.changePassword?.caption || "Example of the simplified Change Password form."}
                </p>
              </div>

              <div className="md:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-gray-900">
                  {t.userGuide?.changePassword?.stepsTitle || "Steps to Change Password"}
                </h3>
                <ol className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start"><span className="text-gray-400 font-bold mr-2.5">01.</span> {t.userGuide?.changePassword?.step1 || "Go to the Change Password section from your account settings."}</li>
                  <li className="flex items-start"><span className="text-gray-400 font-bold mr-2.5">02.</span> {t.userGuide?.changePassword?.step2 || "Enter your new password in the first field."}</li>
                  <li className="flex items-start"><span className="text-gray-400 font-bold mr-2.5">03.</span> {t.userGuide?.changePassword?.step3 || "Re-enter the new password in the confirm field."}</li>
                  <li className="flex items-start pt-1">
                    <span className="text-gray-400 font-bold mr-2.5">04.</span> 
                    <div>
                      {(t.userGuide?.changePassword?.step4 || "If both fields match, click the ") + " "}
                      <button className="px-3 py-1 bg-green-800 text-white text-xs font-semibold rounded shadow-sm ml-1">
                        {t.ChangePassword || "Change Password"}
                      </button>
                    </div>
                  </li>
                </ol>
              </div>
            </div>

            {/* Error & Info Feedback Panels */}
            <div className="space-y-2.5 pt-2 border-t border-gray-100">
              <p className="text-sm text-emerald-700 font-medium flex items-center bg-emerald-50/40 px-3 py-2 rounded-xl border border-emerald-100/60 w-fit">
                <span className="mr-2">✓</span> {t.userGuide?.changePassword?.confirmSuccess || "Password changed successfully."}
              </p>
              <p className="text-sm text-rose-700 font-medium flex items-center bg-rose-50/40 px-3 py-2 rounded-xl border border-rose-100/60 w-fit">
                <span className="mr-2">⚠️</span> {t.userGuide?.changePassword?.errorMismatch || "Passwords do not match. Please try again."}
              </p>
            </div>

            {/* Password Tips Grid */}
            <div className="p-5 bg-gray-50 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                {t.userGuide?.changePassword?.tipsTitle || "Password Tips"}
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-gray-500 list-disc list-inside">
                <li className="leading-relaxed">{t.userGuide?.changePassword?.tip1 || "Use at least 8 characters with a mix of letters, numbers, and symbols."}</li>
                <li className="leading-relaxed">{t.userGuide?.changePassword?.tip2 || "Avoid using personal details (e.g., your name or date of birth)."}</li>
                <li className="leading-relaxed sm:col-span-2">{t.userGuide?.changePassword?.tip3 || "Change your password regularly to keep your account secure."}</li>
              </ul>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
};

export default UserGuide;