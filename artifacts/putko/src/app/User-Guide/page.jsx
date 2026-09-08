"use client";
import React, { useContext, useEffect, useState } from "react";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";
import HeroSearchForm2Mobile from "../components/HeroSearchForm2Mobile";
import MenuBar from "../Shared/MenuBar";
import Header from "../components/Header";
import Footer from "../components/Footer/Footer";
import FooterNav from "../Shared/FooterNav";

const Section = ({ id, title, intro, children, img, imgCaption }) => (
  <section id={id} className="pt-8 scroll-mt-20">
    <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2">{title}</h2>
    {intro && <p className="mt-3 text-gray-700">{intro}</p>}
    {children}
    {img && (
      <div className="my-6">
        <img src={img} alt={imgCaption || title} className="w-full rounded-xl shadow-lg border" />
        {imgCaption && <p className="text-sm text-gray-500 mt-2 text-center">{imgCaption}</p>}
      </div>
    )}
  </section>
);

const Callout = ({ type = "note", children }) => {
  const style =
    type === "tip"
      ? "border-l-4 border-green-500 bg-green-50"
      : type === "warning"
      ? "border-l-4 border-yellow-500 bg-yellow-50"
      : "border-l-4 border-gray-300 bg-gray-50";

  const title =
    type === "tip" ? "Tip" : type === "warning" ? "Warning" : "Note";

  return (
    <div className={`${style} p-4 rounded mt-4`}>
      <strong className="block text-sm">{title}</strong>
      <div className="mt-1 text-sm text-gray-700">{children}</div>
    </div>
  );
};

const TOCLink = ({ href, children }) => (
  <a href={href} className="block py-1 text-gray-600 hover:text-gray-900">
    {children}
  </a>
);

const Page = () => {
  const translations = { en, sk };
  const { lang } = useContext(FormContext || {});
  const [language, setLanguage] = useState(lang || "en");

  useEffect(() => {
    setLanguage(lang || "en");
  }, [lang]);

  const t = translations[language] || en;

  // helper getters with fallback
  const G = (path, fallback = "") => {
    // path like "userGuide.title"
    return path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), t) ?? fallback;
  };

  // Table of contents items (id must match Section id)
  const toc = [
    { id: "reservation-requests", label: G("userGuide.reservation.title", "Reservation Requests") },
    { id: "add-accommodation", label: G("userGuide.addAccommodation.title", "Add Accommodation") },
    { id: "booking-calendar", label: G("userGuide.bookingCalendar.title", "Booking Calendar") },
    { id: "calendar-sync", label: G("userGuide.sync.title", "Calendar Synchronization") },
    { id: "manage-accommodation", label: G("userGuide.manage.title", "Manage Accommodation") },
    { id: "edit-profile", label: G("userGuide.editProfile.title", "Edit Profile") },
    { id: "change-password", label: G("userGuide.changePassword.title", "Change Password") },
  ];

  // action buttons for Manage section (keeps JSX safe)
  const manageActions = [
    {
      key: "edit",
      title: G("userGuides.manage.editTitle", "Edit"),
      desc: G("userGuides.manage.editDesc", "Edit details, photos or price from the Edit screen."),
      btnLabel: G("userGuides.manage.editBtn", "Edit"),
      btnClass: "bg-blue-600",
    },
    {
      key: "delete",
      title: G("userGuides.manage.deleteTitle", "Delete"),
      desc: G("userGuides.manage.deleteDesc", "Remove the accommodation permanently. This cannot be undone."),
      btnLabel: G("userGuides.manage.deleteBtn", "Delete"),
      btnClass: "bg-red-600",
    },
  ];

  return (
    <>
      {/* Top mobile sticky bar */}
      <div
        className="sticky top-0 z-50 flex items-center justify-between px-3 py-3 bg-white/60 backdrop-blur-md md:hidden"
        style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }}
      >
        <div className="flex-1">
          <HeroSearchForm2Mobile />
        </div>
        <button aria-label="menu" className="ml-3">
          <MenuBar />
        </button>
      </div>

      {/* Desktop header */}
      <div className="hidden md:block">
        <Header />
      </div>

      <main className="py-24 px-4 lg:px-12 max-w-5xl mx-auto">
        {/* Page header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{G("userGuide.title", "Host Guide")}</h1>
          <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
            {G(
              "userGuide.subtitle",
              "Step-by-step instructions to manage reservations, add listings, and update your profile."
            )}
          </p>
        </header>

        {/* Two-column layout: TOC (left on desktop) + content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* TOC */}
          <aside className="lg:col-span-1 order-2 lg:order-1">
            <div className="sticky top-20 space-y-4">
              <div className="px-4 py-3 bg-white rounded-lg shadow-sm border">
                <h3 className="font-semibold text-gray-800">Contents</h3>
                <nav className="mt-3 text-sm">
                  {toc.map((item) => (
                    <TOCLink key={item.id} href={`#${item.id}`}>
                      {item.label}
                    </TOCLink>
                  ))}
                </nav>
              </div>

              <Callout type="tip">
                {G(
                  "userGuide.quickTip",
                  "Use the table of contents to jump to any section. Screenshots show example workflows."
                )}
              </Callout>
            </div>
          </aside>

          {/* Content */}
          <div className="lg:col-span-3 order-1 lg:order-2 space-y-8">
            {/* Reservation Requests */}
            <Section
                id="reservation-requests"
                title={G("userGuide.reservation.title", "Reservation Requests")}
                intro={G(
                    "userGuide.reservation.subtitle",
                    "Manage incoming booking requests, filter by status, and approve or reject efficiently."
                )}
                img="/reservation-request.avif"
                imgCaption={G("userGuide.reservation.overviewCaption", "Overview of Reservation Requests")}
            >
                <div className="mt-4 space-y-8">
                    {/* Section 1: Confirmed Reservations */}
                    <div>
                    <h3 className="text-xl font-semibold text-gray-800">
                        {t.userGuide?.reservation?.s1Title || "1. View Confirmed Reservations"}
                    </h3>
                    <p className="mt-2 text-gray-700">
                        {(t.userGuide?.reservation?.s1TextA || "On the Reservation Requests page, you can see all booking requests.") + " " +
                        (t.userGuide?.reservation?.s1TextB || "To display only confirmed reservations, click the red button. Click again to switch back to all reservations.")}
                    </p>
                    <figure className="mt-4">
                        <img
                        src="/confirmed.avif"
                        alt="Confirmed Bookings Example"
                        className="w-full rounded-lg shadow-md border"
                        />
                        <figcaption className="text-sm text-gray-500 mt-2 text-center">
                        {t.userGuide?.reservation?.s1Caption || "Example of confirmed reservations."}
                        </figcaption>
                    </figure>
                    </div>

                    {/* Section 2: Add Your Own Booking */}
                    <div>
                    <h3 className="text-xl font-semibold text-gray-800">
                        {G("userGuide.reservation.s2Title", "Add Your Own Booking")}
                    </h3>
                    <p className="mt-2 text-gray-700">
                        {G(
                        "userGuide.reservation.s2Text",
                        "To manually add a reservation, click the red button in the top-right corner."
                        )}
                    </p>
                    <figure className="mt-4">
                        <img
                        src="/Own.avif"
                        alt={G("userGuide.reservation.s2Title", "Add Your Own Booking")}
                        className="w-full rounded-lg shadow-md border"
                        />
                        <figcaption className="text-sm text-gray-500 mt-2 text-center">
                        {G("userGuide.reservation.s2Caption", "Adding a custom booking date.")}
                        </figcaption>
                    </figure>
                    </div>

                    {/* Section 3: Approve / Reject Request */}
                    <div>
                    <h3 className="text-xl font-semibold text-gray-800">
                        {t.userGuide?.reservation?.s3Title || "3. Approve or Reject a Request"}
                    </h3>
                    <p className="mt-2 text-gray-700">
                        {t.userGuide?.reservation?.s3Intro || "Each request includes a Process button. Choose an option:"}
                    </p>
                    <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
                        <li>{t.userGuide?.reservation?.s3Approve || "Approve → confirm the booking."}</li>
                        <li>{t.userGuide?.reservation?.s3Cancel || "Cancel → reject the request."}</li>
                    </ul>
                    <figure className="mt-4">
                        <img
                        src="/Button.avif"
                        alt="Approve or Cancel Example"
                        className="w-full rounded-lg shadow-md border"
                        />
                        <figcaption className="text-sm text-gray-500 mt-2 text-center">
                        {t.userGuide?.reservation?.s3Caption || "Approving or rejecting a reservation."}
                        </figcaption>
                    </figure>
                    </div>
                </div>
            </Section>



            {/* Add Accommodation */}
            <Section
                id="add-accommodation"
                title={G("userGuide.addAccommodation.title", "Add Accommodation")}
                intro={G("userGuide.addAccommodation.intro", "Create and publish your listing in a few simple steps.")}
            >
                <div className="mt-6 space-y-8">
                    {/* Step 1 */}
                    <div>
                    <h3 className="text-xl font-semibold text-gray-800">{G("userGuide.addAccommodation.s1Title", "1. Basic Information")}</h3>
                    <p className="mt-2 text-gray-700">{G("userGuide.addAccommodation.s1Text", "Enter name and choose a property type.")}</p>
                    <img src="/Info.avif" alt="Basic Info" className="rounded-lg shadow-md border mt-4" />
                    </div>

                    {/* Step 2 */}
                    <div>
                    <h3 className="text-xl font-semibold text-gray-800">{G("userGuide.addAccommodation.s2Title", "2. Property Location")}</h3>
                    <p className="mt-2 text-gray-700">{G("userGuide.addAccommodation.s2Text", "Provide full address details.")}</p>
                    <img src="/Location.avif" alt="Property Location" className="rounded-lg shadow-md border mt-4" />
                    </div>

                    {/* Step 3 */}
                    <div>
                    <h3 className="text-xl font-semibold text-gray-800">{G("userGuide.addAccommodation.s3Title", "3. Details of Accommodation")}</h3>
                    <p className="mt-2 text-gray-700">{G("userGuide.addAccommodation.s3Text", "Add bedrooms, bathrooms, and spaces.")}</p>
                    <img src="/Detail.avif" alt="Details of Accommodation" className="rounded-lg shadow-md border mt-4" />
                    </div>

                    {/* Step 4 */}
                    <div>
                    <h3 className="text-xl font-semibold text-gray-800">{G("userGuide.addAccommodation.s4Title", "4. Amenities")}</h3>
                    <p className="mt-2 text-gray-700">{G("userGuide.addAccommodation.s4Text", "Select all available amenities.")}</p>
                    <img src="/Amenities.avif" alt="Amenities" className="rounded-lg shadow-md border mt-4" />
                    </div>

                    {/* Step 5 */}
                    <div>
                    <h3 className="text-xl font-semibold text-gray-800">{G("userGuide.addAccommodation.s5Title", "5. House Rules")}</h3>
                    <p className="mt-2 text-gray-700">{G("userGuide.addAccommodation.s5Text", "Define smoking, pets, parties, or noise rules.")}</p>
                    <img src="/House.avif" alt="House Rules" className="rounded-lg shadow-md border mt-4" />
                    </div>

                    {/* Step 6 */}
                    <div>
                    <h3 className="text-xl font-semibold text-gray-800">{G("userGuide.addAccommodation.s6Title", "6. Description")}</h3>
                    <p className="mt-2 text-gray-700">{G("userGuide.addAccommodation.s6Text", "Write an engaging description highlighting unique features.")}</p>
                    <img src="/Description.avif" alt="Description" className="rounded-lg shadow-md border mt-4" />
                    </div>

                    {/* Step 7 */}
                    <div>
                    <h3 className="text-xl font-semibold text-gray-800">{G("userGuide.addAccommodation.s7Title", "7. Photos & Media")}</h3>
                    <p className="mt-2 text-gray-700">{G("userGuide.addAccommodation.s7Text", "Upload high-quality images of all areas.")}</p>
                    <img src="/Photos.avif" alt="Photos & Media" className="rounded-lg shadow-md border mt-4" />
                    </div>

                    {/* Step 8 */}
                    <div>
                    <h3 className="text-xl font-semibold text-gray-800">{G("userGuide.addAccommodation.s8Title", "8. Pricing & Availability")}</h3>
                    <p className="mt-2 text-gray-700">{G("userGuide.addAccommodation.s8Text", "Set nightly price, fees, discounts, and calendar.")}</p>
                    <img src="/Price.avif" alt="Pricing & Availability" className="rounded-lg shadow-md border mt-4" />
                    </div>

                    {/* Step 9 */}
                    <div>
                    <h3 className="text-xl font-semibold text-gray-800">{G("userGuide.addAccommodation.s9Title", "9. Check-in, Check-out & Notes")}</h3>
                    <p className="mt-2 text-gray-700">{G("userGuide.addAccommodation.s9Text", "Set check-in/out times and add important notes.")}</p>
                    <img src="/Check.avif" alt="Check-in & Notes" className="rounded-lg shadow-md border mt-4" />
                    </div>

                    {/* Step 10 */}
                    <div>
                    <h3 className="text-xl font-semibold text-green-700">{G("userGuide.addAccommodation.s10Title", "10. Submit & Publish")}</h3>
                    <p className="mt-2 text-gray-700">{G("userGuide.addAccommodation.s10Text", "Review details and submit to publish your accommodation.")}</p>
                    <p className="mt-4 text-green-600 font-medium">✅ {G("userGuide.addAccommodation.s10Congrats", "Congratulations! Your accommodation has been published successfully.")}</p>
                    </div>
                </div>
                </Section>


            {/* Booking Calendar */}
            <Section
              id="booking-calendar"
              title={G("userGuide.bookingCalendar.title", "Booking Calendar")}
              intro={G(
                "userGuide.bookingCalendar.intro",
                "Visual overview of booked and available dates for your properties."
              )}
              img="/Booking.avif"
              imgCaption={G("userGuide.bookingCalendar.caption", "Example of the Booking Calendar")}
            >
              <div className="mt-4">
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>{G("userGuide.bookingCalendar.bullet1", "View only – calendar displays confirmed bookings.")}</li>
                  <li>{G("userGuide.bookingCalendar.bullet2", "Booked dates are highlighted to avoid conflicts.")}</li>
                  <li>{G("userGuide.bookingCalendar.bullet3", "Manage multiple property calendars from the same page.")}</li>
                </ul>

                <Callout type="note">
                  {G("userGuide.bookingCalendar.note", "Regularly check the calendar to avoid double bookings.")}
                </Callout>
              </div>
            </Section>

            {/* Calendar Synchronization */}
            <Section
              id="calendar-sync"
              title={G("userGuide.sync.title", "Calendar Synchronization")}
              intro={G(
                "userGuide.sync.intro",
                "Connect your property calendar with external platforms using iCal links."
              )}
              img="/Synchronization.avif"
              imgCaption={G("userGuide.sync.caption", "Calendar synchronization example")}
            >
              <div className="mt-4">
                <h4 className="font-semibold text-gray-800">{G("userGuide.sync.howTitle", "How It Works")}</h4>
                <ul className="list-decimal list-inside text-gray-700 space-y-2 mt-2">
                  <li>{G("userGuide.sync.how1", "Select the accommodation to sync.")}</li>
                  <li>{G("userGuide.sync.how2", "Paste the iCal URL provided by the external platform.")}</li>
                  <li>{G("userGuide.sync.how3", "Import bookings — imported dates will be blocked.")}</li>
                  <li>{G("userGuide.sync.how4", "Use two-way sync when the platform supports exporting.")}</li>
                </ul>

                <Callout type="warning">
                  {G(
                    "userGuide.sync.warning",
                    "iCal imports may take a few minutes to update. Always re-check after setup."
                  )}
                </Callout>
              </div>
            </Section>

            {/* Manage Accommodation */}
            <Section
              id="manage-accommodation"
              title={G("userGuide.manage.title", "Manage Accommodation")}
              intro={G("userGuide.manage.intro", "Edit, update or remove your listed properties quickly.")}
              img="/Manage.avif"
              imgCaption={G("userGuides.manage.imageCaption", "Manage screen")}
            >
              <div className="mt-4">
                <h4 className="font-semibold text-gray-800">Main actions</h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {manageActions.map((a) => (
                    <div key={a.key} className="p-4 border rounded">
                      <div className="flex items-start justify-between">
                        <div>
                          <strong className="block text-gray-800">{a.title}</strong>
                          <p className="mt-1 text-sm text-gray-700">{a.desc}</p>
                        </div>
                        <button
                          className={`ml-4 px-3 py-1 text-sm text-white rounded ${a.btnClass}`}
                          aria-label={a.btnLabel}
                        >
                          {a.btnLabel}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <h5 className="mt-6 font-medium text-gray-800">{G("userGuides.manage.bestPracticesTitle", "Best practices")}</h5>
                <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1">
                  {(G("userGuides.manage.bestPracticesList", []) || []).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>

                <Callout type="tip">
                  {G(
                    "userGuides.manage.saveTip",
                    "Make small changes and preview before publishing to avoid mistakes."
                  )}
                </Callout>
              </div>
            </Section>

            {/* Edit Profile */}
            <Section
              id="edit-profile"
              title={G("userGuide.editProfile.title", "Edit Profile")}
              intro={G("userGuide.editProfile.intro", "Keep your public profile accurate to build guest trust.")}
              img="/Profile.avif"
              imgCaption={G("userGuide.editProfile.caption1", "Edit Profile example")}
            >
              <div className="mt-4">
                <h4 className="font-semibold text-gray-800">{G("userGuide.editProfile.infoTitle", "Information you can edit")}</h4>

                <ul className="list-disc list-inside mt-2 text-gray-700 space-y-2">
                  <li><strong>{G("ProfileGuide.ProfilePicture", "Profile picture")}:</strong> {G("ProfileGuide.ProfilePicturedesc", "Upload a clear photo or logo.")}</li>
                  <li><strong>{G("ProfileGuide.FullName", "Full name")}:</strong> {G("ProfileGuide.FullNamedesc", "Displayed on your profile and messages.")}</li>
                  <li><strong>{G("ProfileGuide.DateOfBirth", "Date of birth")}:</strong> {G("ProfileGuide.DateOfBirthdesc", "Optional.")}</li>
                  <li><strong>{G("ProfileGuide.PreferredLanguage", "Preferred language")}:</strong> {G("ProfileGuide.PreferredLanguagedesc", "Used for notifications and UI.")}</li>
                  <li><strong>{G("ProfileGuide.About", "About")}:</strong> {G("ProfileGuide.Aboutdesc", "Short bio to tell guests who you are.")}</li>
                  <li><strong>{G("ProfileGuide.Address", "Address")}:</strong> {G("ProfileGuide.Addressdesc", "Optional, helps local bookings.")}</li>
                  <li><strong>{G("ProfileGuide.PhoneNumber", "Phone")}:</strong> {G("ProfileGuide.PhoneNumberdesc", "Used for verification and contact.")}</li>
                </ul>

                <div className="mt-6">
                  <button className="px-4 py-2 bg-green-600 text-white rounded">{G("Save", "Save")}</button>
                  <p className="mt-3 text-sm text-gray-700 italic">{G("userGuide.editProfile.saveConfirm", "Profile updated successfully.")}</p>
                </div>
              </div>
            </Section>

            {/* Change Password */}
            <Section
              id="change-password"
              title={G("userGuide.changePassword.title", "Change Password")}
              intro={G("userGuide.changePassword.intro", "Update your password from account settings.")}
              img="/Password.avif"
              imgCaption={G("userGuide.changePassword.caption", "Change Password form")}
            >
              <div className="mt-4">
                <ol className="list-decimal list-inside text-gray-700 space-y-2">
                  <li>{G("userGuide.changePassword.step1", "Open Settings > Change Password.")}</li>
                  <li>{G("userGuide.changePassword.step2", "Enter your new password in the first field.")}</li>
                  <li>{G("userGuide.changePassword.step3", "Repeat the new password in confirm field.")}</li>
                  <li>{G("userGuide.changePassword.step4", "If both match, click Change Password.")}</li>
                </ol>

                <Callout type="tip">
                  {G("userGuide.changePassword.tip1", "Use at least 8 characters including letters, numbers and symbols.")}
                </Callout>
              </div>
            </Section>

            {/* Footer spacing */}
            <div className="h-6" />
          </div>
        </div>
      </main>

      <Footer />
      <div className="lg:hidden">
        <FooterNav />
      </div>
    </>
  );
};

export default Page;
