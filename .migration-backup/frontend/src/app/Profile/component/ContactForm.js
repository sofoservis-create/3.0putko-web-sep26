"use client";
import en from "../../locales/en";
import useFetchData from "../../hooks/useFetchData";
import React, { useContext, useEffect, useState } from "react"; 
import sk from "../../locales/sk";
import { FormContext } from "../../FormContext";

const ContactForm = ({ contactInfo }) => {
  const [billingData, setBillingData] = useState(false); // For showing popup
  const [showPopup, setShowPopup] = useState(false); // Popup state for billing
  const [isEnabled, setIsEnabled] = useState(false);
console.log("contact",contactInfo)
  const toggleSwitch = () => {
    setIsEnabled(!isEnabled);
  };
  const { data: userData, loading, error } = useFetchData(
    `${process.env.NEXT_PUBLIC_BASE_URL}/hosts/${contactInfo.accommodationProvider}`
  );

  const [formData, setFormData] = useState({
    streetNumber: "",
    city: "",
    zipcode: "",
    country: "",
    idNumber: "",
    tin: "",
    vatNumber: "",
    companyName: "",
    phonenumber: "",
    payoutIbanFull: "",
  });

  const translations = { en, sk }
            
  const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
  const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"
              
    // Update language state when `lang` changes in FormContext
    useEffect(() => {
      setLanguage(lang || "sk");
    }, [lang]);
              
  const t = translations[language];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmits = async (e) => {
    e.preventDefault(); 

    try {
      const userId = contactInfo.accommodationProvider; // User ID from props 
      console.log(userId);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/hosts/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update user information");
      }

      alert(t.Userinformationupdatedsuccessfully);
      setShowPopup(false);
    } catch (error) {
      console.error("Error updating user information:", error);
      alert(t.Failedtoupdateuserinformation);
    }
  };

  const togglePopup = () => setShowPopup(!showPopup);
 
  return (
    <>
      <div className="w-full max-w-4xl p-4 mx-auto space-y-8 overflow-x-hidden sm:p-6">
        {/* Contact Details Section */}
        <div className="w-full bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex flex-wrap items-center gap-3 px-4 py-4 border-b border-gray-100 sm:px-6 bg-gray-50 rounded-t-2xl">
            <span className="text-sm font-semibold text-gray-500">1/2</span>
            <h2 className="text-lg font-semibold text-gray-800">{t.Contactdetails}</h2>
          </div>

          <div className="p-4 space-y-4 sm:p-6">
            {[
              { label: t.name, value: contactInfo.name },
              { label: t.Lastname, value: contactInfo.surname },
              { label: t.email, value: contactInfo.email },
              {
                label: t.Telephone,
                value: `${contactInfo.countryCode || ""} +${contactInfo.phone || "-"}`,
              },
            ].map((item, index) => (
              <div
                key={index}
                className="flex flex-col w-full gap-1 break-words sm:flex-row sm:justify-between sm:items-center sm:gap-2"
              >
                <span className="text-sm font-medium text-gray-600">{item.label}:</span>
                <span className="text-sm font-medium text-right text-gray-900 break-words sm:text-base sm:text-left">
                  {item.value || "-"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Billing Section */}
        <div className="w-full bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex flex-wrap items-center justify-between px-4 py-4 border-b border-gray-100 sm:px-6 bg-gray-50 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-500">2/2</span>
              <h2 className="text-lg font-semibold text-gray-800">{t.Billinginformation}</h2>
            </div>

            <button
              onClick={toggleSwitch}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${
                isEnabled ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                  isEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              ></div>
            </button>
          </div>

          {isEnabled && (
            <div className="w-full p-4 space-y-5 sm:p-6">
              <form className="w-full space-y-5">
                {[
                  { label: t.StreetNumber, name: "streetNumber" },
                  { label: t.City, name: "city" },
                  { label: t.Zipcode, name: "zipcode" },
                  { label: t.Country, name: "country" },
                  { label: t.IDNumber, name: "idNumber" },
                  { label: t.TIN, name: "tin" },
                  { label: t.VATNumber, name: "vatNumber" },
                  { label: t.CompanyName, name: "companyName" },
                  { label: t.phoneNumber, name: "phoneNumber" },
                  // Required for the annual DAC7 filing. Stripe only exposes the
                  // last four digits of a connected account, which is not a
                  // financial account identifier, so the full number has to come
                  // from the host. Validated server-side before it is stored.
                  {
                    label: t.PayoutIban || "IBAN (for tax reporting)",
                    name: "payoutIbanFull",
                    placeholder: "SK31 1200 0000 1987 4263 7541",
                  },
                ].map((field) => (
                  <div
                    key={field.name}
                    className="flex flex-col w-full gap-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <label className="w-full text-sm font-medium text-gray-700 sm:w-1/3">
                      {field.label} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name={field.name}
                      placeholder={field.placeholder || field.label}
                      onChange={handleInputChange}
                      value={formData[field.name] || userData?.[field.name] || ""}
                      className="block w-full sm:w-2/3 p-2.5 border border-gray-300 rounded-lg shadow-sm text-gray-800 
                                focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                ))}
              </form>

              <div className="flex justify-center pt-6 border-t border-gray-100">
                <button
                  onClick={handleSubmits}
                  className="px-8 py-3 font-semibold text-white transition-all duration-200 bg-green-600 rounded-lg shadow-md hover:bg-green-700 focus:outline-none"
                >
                  {t.Save}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ContactForm;
