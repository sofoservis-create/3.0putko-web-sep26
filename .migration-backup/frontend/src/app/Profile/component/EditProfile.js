"use client";
import { AuthContext } from '../../context/AuthContext';
import { FormContext } from '../../FormContext';
import React, { useContext, useEffect, useState } from 'react';
import uploadImageToCloudinary from '../../utlis/uploadCloudinary';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Label from '../../Shared/Label';
import Input from '../../Shared/Input';
import Select from '../../Shared/Select';
import Textarea from '../../Shared/Textarea';
import ButtonPrimary from '../../Shared/ButtonPrimary';
import "react-phone-input-2/lib/style.css";
import PhoneInput from 'react-phone-input-2';
import en from '../../locales/en';
import sk from '../../locales/sk';
import Header from '@/app/components/Header/Header';
import useFetchData from '@/app/hooks/useFetchData';
import { User, Mail, Phone, Calendar, MapPin, Globe2, FileText, Camera, ShieldCheck, Settings, Building2, Landmark } from 'lucide-react';

const EditProfile = () => {
  const { user } = useContext(AuthContext);
  const { data: hostData } = useFetchData(`${process.env.NEXT_PUBLIC_BASE_URL}/hosts/${user?._id}`);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [photo, setPhoto] = useState(null);
  const [gender, setGender] = useState("Male");
  const [username, setUsername] = useState(user?.username || "");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [aboutYou, setAboutYou] = useState("");
  const [languag, setLanguag] = useState("");
  const [selectedFile, setSelectFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // --- Billing identity ---
  // What Putko needs to raise the monthly invoice for its platform fee, and what
  // the annual DAC7 filing reports. Optional here: an existing host must still be
  // able to save their profile without being forced through these, but a value
  // that IS supplied has to be well formed.
  const [billing, setBilling] = useState({
    subjectType: "business",
    companyName: "",
    ico: "",
    dic: "",
    icDph: "",
    streetNumber: "",
    city: "",
    zipcode: "",
    countryCode: "SK",
    vatPayer: false,
    vatinParagraph: "",
  });

  // The IBAN is stored `select: false`, so it never comes back from the API and
  // cannot be prefilled. The masked form is shown instead as proof of what is on
  // file, and the input stays empty unless the host is changing it — which is
  // also the right handling for a bank account number.
  const [iban, setIban] = useState("");
  const [maskedIban, setMaskedIban] = useState("");
  const [icoLookup, setIcoLookup] = useState({ status: "idle", message: "", isBranch: false });

  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language] || en;

  useEffect(() => {
    if (hostData) {
      setName(hostData?.name || '');
      setEmail(hostData?.email || '');
      setPhoneNumber(hostData?.phoneNumber || '');
      setPhoto(hostData?.photo || null);
      setGender(hostData?.gender || "Male");
      const formattedDateOfBirth = hostData?.dateOfBirth ? new Date(hostData?.dateOfBirth).toISOString().split('T')[0] : '';
      setDateOfBirth(formattedDateOfBirth);
      setAddress(hostData?.address || "");
      setAboutYou(hostData?.aboutYou || "");
      setLanguag(hostData?.languag || "");
      setSelectFile(hostData?.photo || null);

      // Fall back to the legacy free-text columns, the same way
      // Host.missingBillingFields() does, so a host who filled those in years
      // ago is not asked for the same data twice.
      setBilling({
        subjectType: hostData?.billingSubjectType || "business",
        companyName: hostData?.companyName || "",
        ico: hostData?.ico || hostData?.idNumber || "",
        dic: hostData?.dic || hostData?.tin || "",
        icDph: hostData?.icDph || hostData?.vatNumber || "",
        streetNumber: hostData?.streetNumber || "",
        city: hostData?.city || "",
        zipcode: hostData?.zipcode || "",
        countryCode: hostData?.countryCode || hostData?.country || "SK",
        vatPayer: Boolean(hostData?.isVatPayer),
        vatinParagraph: hostData?.vatinParagraph || "",
      });
      setMaskedIban(hostData?.payoutIban || "");
    }
  }, [hostData]);

  const handleBillingChange = (field) => (e) => {
    const { value } = e.target;
    setBilling((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Debounced IČO lookup — same as BillingDetailsModal.
  // Sends Bearer token so router.get("/ico/:ico", getCompanyByIco) can stay gated.
  useEffect(() => {
    if (billing.subjectType !== "business") {
      setIcoLookup({ status: "idle", message: "", isBranch: false });
      return undefined;
    }
    const ico = billing.ico.replace(/\D/g, "");
    if (ico.length < 6 || ico.length > 8) {
      setIcoLookup({ status: "idle", message: "", isBranch: false });
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIcoLookup({
        status: "loading",
        message: t.BillingIcoLookingUp || "Looking up the business register…",
        isBranch: false,
      });
      try {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/ico/${ico}`,
          {
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "LOOKUP_UNAVAILABLE");
        if (!data.found) throw new Error("NOT_FOUND");
        setBilling((current) => ({
          ...current,
          companyName: data.name || current.companyName,
          ico: data.ico || ico,
          dic: data.dic || "",
          icDph: data.icDph || "",
          streetNumber: data.street || current.streetNumber,
          city: data.city || current.city,
          zipcode: data.zip || current.zipcode,
          countryCode: data.countryCode || "SK",
          vatPayer: Boolean(data.vatPayer),
          vatinParagraph: data.vatinParagraph || "",
        }));
        setIcoLookup({
          status: "success",
          message: t.BillingIcoFilled || "Filled from the business register.",
          isBranch: Boolean(data.isBranch),
        });
      } catch (error) {
        if (error.name === "AbortError") return;
        setIcoLookup({
          status: "manual",
          message:
            t.BillingIcoManual ||
            "Business-register lookup is unavailable. You can enter the details manually.",
          isBranch: false,
        });
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [billing.ico, billing.subjectType, t.BillingIcoLookingUp, t.BillingIcoFilled, t.BillingIcoManual]);

  const languags = [
    "Afrikaans", "Albanian", "Arabic", "Armenian", "Azerbaijani", "Basque", "Belarusian",
    "Bengali", "Bosnian", "Bulgarian", "Catalan", "Chinese", "Croatian", "Czech", "Danish",
    "Dutch", "English", "Estonian", "Finnish", "French", "Georgian", "German", "Greek",
    "Hebrew", "Hindi", "Hungarian", "Icelandic", "Indonesian", "Irish", "Italian", "Japanese",
    "Kazakh", "Korean", "Latvian", "Lithuanian", "Macedonian", "Malay", "Maltese", "Mongolian",
    "Norwegian", "Persian", "Polish", "Portuguese", "Romanian", "Russian", "Serbian", "Slovak",
    "Slovenian", "Spanish", "Swahili", "Swedish", "Thai", "Turkish", "Ukrainian", "Urdu", "Vietnamese"
  ];

  const uploadFile = async (file) => {
    if (!file) return;
    setLoading(true);
    try {
      const data = await uploadImageToCloudinary(file, t);
      if (data?.secure_url) {
        setSelectFile(data.secure_url);
        toast.success(t.ImageUploadedSuccessfully || "Image updated successfully");
      } else {
        toast.error(t.FailedtouploadtheimagePleasetryagain);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(t.NetworkerrorPleasetryagain);
    } finally {
      setLoading(false);
    }
  };

  const handleFileInputChange = (event) => {
    uploadFile(event.target.files[0]);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    uploadFile(event.dataTransfer.files[0]);
  };

  const validateFields = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = `${t.Nameisrequired}`;
    } else if (name.length > 50) {
      newErrors.name = `${t.Namecannotexceedcharacters}`;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = `${t.Emailisrequired}`;
    } else if (!emailRegex.test(email)) {
      newErrors.email = `${t.Pleaseenteravalidemailaddress}`;
    }

    if (!phoneNumber.trim()) {
      newErrors.phone = `${t.Phonenumberisrequired}`;
    }

    if (!dateOfBirth.trim()) {
      newErrors.dateOfBirth = `${t.Dateofbirthisrequired}`;
    }

    if (!address.trim()) {
      newErrors.address = `${t.Addressisrequired}`;
    }

    if (!languag.trim()) {
      newErrors.language = `${t.Pleaseselectalanguage}`;
    }

    if (!aboutYou.trim()) {
      newErrors.aboutYou = `${t.Pleaseprovidesomeinformationaboutyourself}`;
    }

    // Billing fields are optional in the sense that an existing host can still
    // save profile, but anything entered must be well formed — and when present
    // the same rules as the payout modal apply.
    const digits = (v) => v.replace(/\D/g, "");
    const isSlovak = billing.countryCode.trim().toUpperCase() === "SK";

    if (!billing.companyName.trim()) {
      newErrors.companyName =
        t.BillingNameRequired || "Billing name is required";
    }
    if (!billing.streetNumber.trim()) {
      newErrors.streetNumber =
        t.BillingErrStreetRequired || "Billing street is required";
    }
    if (!billing.city.trim()) {
      newErrors.city = t.BillingErrCityRequired || "Billing city is required";
    }
    if (!billing.zipcode.trim()) {
      newErrors.zipcode =
        t.BillingErrZipRequired || "Billing ZIP code is required";
    }
    if (!billing.countryCode.trim()) {
      newErrors.countryCode =
        t.BillingErrCountryRequired || "Billing country is required";
    }
    if (billing.subjectType === "business" && !billing.ico.trim()) {
      newErrors.ico = t.IcoRequired || t.BillingErrIcoRequired || "IČO is required for a business";
    } else if (
      billing.subjectType === "business" &&
      billing.ico.trim() &&
      (digits(billing.ico).length < 6 || digits(billing.ico).length > 8)
    ) {
      newErrors.ico =
        t.IcoMustBe8Digits || "IČO must contain 6 to 8 digits";
    }
    if (billing.subjectType === "business" && !billing.dic.trim()) {
      newErrors.dic = t.DicRequired || t.BillingErrDicRequired || "DIČ is required for a business";
    } else if (
      billing.subjectType === "business" &&
      billing.dic.trim() &&
      isSlovak &&
      digits(billing.dic).length !== 10
    ) {
      newErrors.dic =
        t.DicMustBe10Digits || t.BillingErrDicFormat || "A Slovak DIČ is 10 digits";
    }
    if (
      billing.icDph.trim() &&
      !/^[A-Za-z]{2}\d{8,12}$/.test(billing.icDph.replace(/\s/g, ""))
    ) {
      newErrors.icDph =
        t.IcDphInvalid ||
        t.BillingErrIcDphFormat ||
        "IČ DPH looks like SK2020123456, or leave it empty";
    }
    if (
      billing.zipcode.trim() &&
      isSlovak &&
      digits(billing.zipcode).length !== 5
    ) {
      newErrors.zipcode =
        t.ZipMustBe5Digits || t.BillingErrZipFormat || "A Slovak ZIP is 5 digits";
    }

    // Only a light shape check here — the server runs the ISO 7064 mod-97
    // checksum (utils/iban.js) and is the authority on whether it is real.
    const typedIban = iban.replace(/[\s-]/g, "").toUpperCase();
    if (typedIban && !/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(typedIban)) {
      newErrors.iban = t.IbanInvalid || "That does not look like an IBAN";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateUser = async () => {
    if (!validateFields()) {
      toast.error(t.Pleasefillinallrequiredfieldscorrectly);
      return;
    }

    try {
      const payload = {
        name,
        email,
        phoneNumber,
        photo: selectedFile,
        dateOfBirth,
        username,
        address,
        aboutYou,
        languag,
        billingSubjectType: billing.subjectType,
        companyName: billing.companyName.trim(),
        ico: billing.ico.trim(),
        dic: billing.dic.trim(),
        streetNumber: billing.streetNumber.trim(),
        city: billing.city.trim(),
        zipcode: billing.zipcode.trim(),
        countryCode: billing.countryCode.trim().toUpperCase(),
        isVatPayer: billing.vatPayer,
        vatinParagraph: billing.vatinParagraph,
      };

      // Only sent when supplied. Writing an empty string would flip a
      // VAT-registered host to "no VAT ID" on their next invoice.
      const icDph = billing.icDph.replace(/\s/g, "").toUpperCase();
      if (icDph && billing.subjectType === "business") {
        payload.icDph = icDph;
        payload.isVatPayer = true;
      }

      // Likewise: the field cannot be prefilled, so an empty input means "leave
      // it as it is", never "delete the IBAN on file".
      const typedIban = iban.replace(/[\s-]/g, "").toUpperCase();
      if (typedIban) payload.payoutIbanFull = typedIban;

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/hosts/${user._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // The server rejects a bad IBAN with its own message (mod-97 checksum,
        // country length). Showing it beats a generic "update failed".
        const data = await response.json().catch(() => null);
        toast.error(data?.message || t.Profileupdatefailed);
        return;
      }

      const updatedUser = {
        ...JSON.parse(localStorage.getItem("user")),
        name,
        email,
        phoneNumber,
        photo: selectedFile,
        dateOfBirth,
        username,
        address,
        aboutYou,
        languag,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      toast.success(t.Profileupdatedsuccessfully);

      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(t.NetworkerrorPleasetryagain);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 bg-[#F8FAFC] min-h-screen font-sans">
      <Header
        title={`${t.PersonalProfile || "Profile Settings"}`}
        subtitle=""
        showAddButton={false}
      />

      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Side: Profile Card & Actions */}
        <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col items-center text-center">

            {/* Avatar Dropzone */}
            <div
              className={`relative rounded-full overflow-hidden w-28 h-28 mb-4 transition-all duration-200 shrink-0 group ${
                isDragging
                  ? 'ring-4 ring-[#319A81]'
                  : 'ring-4 ring-slate-100 hover:ring-slate-200'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <img
                src={selectedFile || photo || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                alt="Profile Picture"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
              />

              {loading && (
                <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                  <div className="w-5 h-5 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                </div>
              )}

              {!loading && (
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all duration-150 flex flex-col items-center justify-center text-white cursor-pointer">
                  <Camera className="w-5 h-5 text-white mb-1" />
                  <span className="text-[10px] font-medium tracking-wide">{t.EditProfile || "Change Photo"}</span>
                </div>
              )}

              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileInputChange}
                disabled={loading}
              />
            </div>

            {/* User Meta Identifiers */}
            <h2 className="text-base font-semibold text-slate-800 tracking-tight line-clamp-1">
              {name || t.EditProfile}
            </h2>
            <p className="text-slate-500 text-xs mb-4">
              {username ? `@${username}` : 'Account Settings'}
            </p>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[#319A81] text-xs font-medium mb-6">
              <ShieldCheck className="w-4 h-4" /> {t.verifiedProfile}
            </div>

            {/* Quick Action Trigger */}
            <div className="w-full pt-4 border-t border-slate-100 space-y-3">
              <ButtonPrimary
                onClick={handleUpdateUser}
                disabled={loading}
                className="w-full py-2.5 text-xs font-medium tracking-wide text-white bg-[#1E3E2B] hover:bg-[#152B1E] rounded-xl transition-colors duration-150 disabled:opacity-50 shadow-xs"
              >
                {loading ? `${t.Uploading}` : `${t.updateInfo}`}
              </ButtonPrimary>
              <p className="text-[11px] text-slate-400 text-center leading-normal">
                {t.changesSaved}
              </p>
            </div>

          </div>
        </div>

        {/* Right Side: Form Configuration Structure */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 shadow-xs space-y-8">

            {/* Section 1: Personal Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Settings className="w-4 h-4 text-[#319A81]" />
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{t.personalInformation}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name Input */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <User className="w-4 h-4 text-slate-400" /> {t.name || "Full Name"}
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 text-sm focus:border-[#319A81] focus:ring-2 focus:ring-[#319A81]/10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                  />
                  {errors.name && <p className="text-rose-500 text-xs font-medium mt-1"><span>•</span> {errors.name}</p>}
                </div>

                {/* Gender Dropdown Selection */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <User className="w-4 h-4 text-slate-400" /> {t.gender || "Gender"}
                  </Label>
                  <Select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full h-10 text-sm focus:border-[#319A81] focus:ring-2 focus:ring-[#319A81]/10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                  >
                    <option value="Male">{t.Male}</option>
                    <option value="Female">{t.Female}</option>
                    <option value="Other">{t.other}</option>
                  </Select>
                </div>

                {/* Date of Birth Picker */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" /> {t.dob || "Date of Birth"}
                  </Label>
                  <Input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full h-10 text-sm focus:border-[#319A81] focus:ring-2 focus:ring-[#319A81]/10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                  />
                  {errors.dateOfBirth && <p className="text-rose-500 text-xs font-medium mt-1"><span>•</span> {errors.dateOfBirth}</p>}
                </div>
              </div>
            </div>

            {/* Section 2: Contact Options */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Phone className="w-4 h-4 text-[#319A81]" />
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{t.contactDetails}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Telephone Number Component */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" /> {t.phoneNumber || "Phone Number"}
                  </Label>
                  <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:border-[#319A81] focus-within:ring-2 focus-within:ring-[#319A81]/10 transition-all bg-slate-50/50">
                    <PhoneInput
                      country={"sk"}
                      value={phoneNumber}
                      onChange={(value) => setPhoneNumber(value)}
                      containerClass="!border-0 w-full"
                      inputClass="w-full text-sm h-9 px-12 rounded-xl !border-0 focus:ring-0 text-slate-800 bg-transparent"
                      buttonClass="!bg-transparent !border-0 !rounded-l-xl pr-1"
                      dropdownClass="border border-slate-200 rounded-xl shadow-xl bg-white"
                    />
                  </div>
                  {errors.phone && <p className="text-rose-500 text-xs font-medium mt-1"><span>•</span> {errors.phone}</p>}
                </div>

                {/* Read-Only Account Email Platform Node */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <Mail className="w-4 h-4 text-slate-300" /> {t.email || "Email Address"} <span className="text-[10px] text-slate-400 font-normal">(Read Only)</span>
                  </Label>
                  <Input
                    value={email}
                    className="w-full h-10 text-sm bg-slate-100 border-slate-200/70 text-slate-400 rounded-xl cursor-not-allowed font-normal"
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Location and Language Preferences */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <MapPin className="w-4 h-4 text-[#319A81]" />
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{t.localizationPreferences}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Language Filter */}
                <div className="space-y-1.5 md:col-span-1">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <Globe2 className="w-4 h-4 text-slate-400" /> {t.Language || "Language"}
                  </Label>
                  <Select
                    value={languag}
                    onChange={(e) => setLanguag(e.target.value)}
                    className="w-full h-10 text-sm focus:border-[#319A81] focus:ring-2 focus:ring-[#319A81]/10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                  >
                    <option value="">{t.Selectalanguage || "Select language"}</option>
                    {languags.map((langItem, index) => (
                      <option key={index} value={langItem}>{langItem}</option>
                    ))}
                  </Select>
                  {errors.language && <p className="text-rose-500 text-xs font-medium mt-1"><span>•</span> {errors.language}</p>}
                </div>

                {/* Mailing/Physical Address Setup */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" /> {t.address || "Address"}
                  </Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full h-10 text-sm focus:border-[#319A81] focus:ring-2 focus:ring-[#319A81]/10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                  />
                  {errors.address && <p className="text-rose-500 text-xs font-medium mt-1"><span>•</span> {errors.address}</p>}
                </div>
              </div>
            </div>

            {/* Section 4: Public Description Profile Summary */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <FileText className="w-4 h-4 text-[#319A81]" />
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{t.aboutProfile}</h3>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <FileText className="w-4 h-4 text-slate-400" /> {t.aboutYou || "Description"}
                </Label>
                <Textarea
                  value={aboutYou}
                  onChange={(e) => setAboutYou(e.target.value)}
                  className="w-full min-h-[120px] p-3 text-sm focus:border-[#319A81] focus:ring-2 focus:ring-[#319A81]/10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white resize-none leading-relaxed transition-all"
                />
                {errors.aboutYou && <p className="text-rose-500 text-xs font-medium mt-1"><span>•</span> {errors.aboutYou}</p>}
              </div>
            </div>

            {/* Section 5: Billing Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Building2 className="w-4 h-4 text-[#319A81]" />
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {t.billingDetails || "Billing details"}
                </h3>
              </div>

              <p className="text-[11px] text-slate-400 leading-normal -mt-1">
                {t.billingDetailsHint ||
                  "Used on the monthly invoice Putko issues you for the platform fee, and for annual tax reporting. Not shown to guests."}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
                <span className="font-medium">{t.BillingAs || "Billing as"}</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="subjectType"
                    checked={billing.subjectType === "business"}
                    onChange={() => setBilling((prev) => ({ ...prev, subjectType: "business" }))}
                  />
                  {t.BillingAsBusiness || "Business (has IČO)"}
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="subjectType"
                    checked={billing.subjectType === "individual"}
                    onChange={() => setBilling((prev) => ({ ...prev, subjectType: "individual" }))}
                  />
                  {t.BillingAsIndividual || "Individual (no IČO)"}
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company name / full legal name */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <Building2 className="w-4 h-4 text-slate-400" />{" "}
                    {billing.subjectType === "individual"
                      ? (t.BillingFullLegalName || "Full legal name")
                      : (t.companyName || "Company name")}
                  </Label>
                  <Input
                    value={billing.companyName}
                    onChange={handleBillingChange("companyName")}
                    placeholder={
                      billing.subjectType === "individual"
                        ? (t.BillingModalNamePlaceholderIndividual || "Your full legal name")
                        : (t.BillingModalNamePlaceholder || "Putko s.r.o.")
                    }
                    disabled={icoLookup.status === "loading"}
                    className="w-full h-10 text-sm focus:border-[#319A81] focus:ring-2 focus:ring-[#319A81]/10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                  />
                  {errors.companyName && (
                    <p className="text-rose-500 text-xs font-medium mt-1">
                      <span>•</span> {errors.companyName}
                    </p>
                  )}
                </div>

                {billing.subjectType === "business" && (
                  <>
                    {/* IČO */}
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <FileText className="w-4 h-4 text-slate-400" /> {t.ico || "IČO"}
                      </Label>
                      <Input
                        value={billing.ico}
                        onChange={handleBillingChange("ico")}
                        placeholder="12345678"
                        className="w-full h-10 text-sm focus:border-[#319A81] focus:ring-2 focus:ring-[#319A81]/10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                      />
                      {errors.ico && (
                        <p className="text-rose-500 text-xs font-medium mt-1">
                          <span>•</span> {errors.ico}
                        </p>
                      )}
                      {icoLookup.status !== "idle" && (
                        <p
                          className={`text-[11px] ${
                            icoLookup.status === "success"
                              ? "text-emerald-600"
                              : "text-slate-500"
                          }`}
                        >
                          {icoLookup.message}
                        </p>
                      )}
                    </div>

                    {/* DIČ */}
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <FileText className="w-4 h-4 text-slate-400" /> {t.dic || "DIČ"}
                      </Label>
                      <Input
                        value={billing.dic}
                        onChange={handleBillingChange("dic")}
                        placeholder="1234567890"
                        disabled={icoLookup.status === "loading"}
                        className="w-full h-10 text-sm focus:border-[#319A81] focus:ring-2 focus:ring-[#319A81]/10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                      />
                      {errors.dic && (
                        <p className="text-rose-500 text-xs font-medium mt-1">
                          <span>•</span> {errors.dic}
                        </p>
                      )}
                    </div>

                    {icoLookup.isBranch && (
                      <p className="md:col-span-2 text-xs text-amber-700">
                        {t.BillingIcoIsBranch ||
                          "This is a branch. Invoice the parent company instead?"}
                      </p>
                    )}

                    {/* IČ DPH */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <FileText className="w-4 h-4 text-slate-400" />{" "}
                        {t.icDph || t.BillingFieldIcDph || "IČ DPH (VAT ID)"}
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({t.optional || t.BillingModalOptional || "optional"})
                        </span>
                      </Label>
                      <Input
                        value={billing.icDph}
                        onChange={handleBillingChange("icDph")}
                        placeholder="SK1234567890"
                        disabled={icoLookup.status === "loading"}
                        className="w-full h-10 text-sm focus:border-[#319A81] focus:ring-2 focus:ring-[#319A81]/10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                      />
                      {errors.icDph && (
                        <p className="text-rose-500 text-xs font-medium mt-1">
                          <span>•</span> {errors.icDph}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Billing street */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />{" "}
                    {t.BillingFieldStreet || "Street and number"}
                  </Label>
                  <Input
                    value={billing.streetNumber}
                    onChange={handleBillingChange("streetNumber")}
                    placeholder="Hlavná 12"
                    disabled={icoLookup.status === "loading"}
                    className="w-full h-10 text-sm focus:border-[#319A81] focus:ring-2 focus:ring-[#319A81]/10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                  />
                  {errors.streetNumber && (
                    <p className="text-rose-500 text-xs font-medium mt-1">
                      <span>•</span> {errors.streetNumber}
                    </p>
                  )}
                </div>

                {/* City */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" /> {t.BillingFieldCity || "City"}
                  </Label>
                  <Input
                    value={billing.city}
                    onChange={handleBillingChange("city")}
                    placeholder="Bratislava"
                    disabled={icoLookup.status === "loading"}
                    className="w-full h-10 text-sm focus:border-[#319A81] focus:ring-2 focus:ring-[#319A81]/10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                  />
                  {errors.city && (
                    <p className="text-rose-500 text-xs font-medium mt-1">
                      <span>•</span> {errors.city}
                    </p>
                  )}
                </div>

                {/* ZIP */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" /> {t.BillingFieldZip || "ZIP code"}
                  </Label>
                  <Input
                    value={billing.zipcode}
                    onChange={handleBillingChange("zipcode")}
                    placeholder="811 01"
                    disabled={icoLookup.status === "loading"}
                    className="w-full h-10 text-sm focus:border-[#319A81] focus:ring-2 focus:ring-[#319A81]/10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                  />
                  {errors.zipcode && (
                    <p className="text-rose-500 text-xs font-medium mt-1">
                      <span>•</span> {errors.zipcode}
                    </p>
                  )}
                </div>

                {/* Country code */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <Globe2 className="w-4 h-4 text-slate-400" />{" "}
                    {t.countryCode || t.BillingModalCountryCode || "Country code"}
                  </Label>
                  <Input
                    value={billing.countryCode}
                    onChange={handleBillingChange("countryCode")}
                    placeholder="SK"
                    maxLength={2}
                    disabled={icoLookup.status === "loading"}
                    className="w-full h-10 text-sm uppercase focus:border-[#319A81] focus:ring-2 focus:ring-[#319A81]/10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                  />
                  {errors.countryCode && (
                    <p className="text-rose-500 text-xs font-medium mt-1">
                      <span>•</span> {errors.countryCode}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 6: Payout Account */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Landmark className="w-4 h-4 text-[#319A81]" />
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {t.YourPayoutAccounts || "Payout account"}
                </h3>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <Landmark className="w-4 h-4 text-slate-400" /> {t.iban || "IBAN"}
                </Label>

                {/* The number on file, as proof there is one, without ever
                    putting the full account number back on the wire. */}
                {maskedIban && (
                  <p className="text-[11px] text-slate-500">
                    {t.ibanOnFile || "Currently on file"}:{" "}
                    <span className="font-mono font-medium text-slate-700">{maskedIban}</span>
                  </p>
                )}

                <Input
                  value={iban}
                  onChange={(e) => {
                    setIban(e.target.value);
                    setErrors((prev) => ({ ...prev, iban: undefined }));
                  }}
                  placeholder={
                    maskedIban
                      ? t.ibanReplace || "Enter a new IBAN to replace it"
                      : "SK89 0200 0000 0000 0123 4567"
                  }
                  className="w-full h-10 text-sm font-mono uppercase focus:border-[#319A81] focus:ring-2 focus:ring-[#319A81]/10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                />
                {errors.iban && (
                  <p className="text-rose-500 text-xs font-medium mt-1">
                    <span>•</span> {errors.iban}
                  </p>
                )}

                <p className="text-[11px] text-slate-400 leading-normal">
                  {t.ibanHint ||
                    "Required for annual tax reporting. Your payouts are sent by Stripe to the account you set up during onboarding — changing this does not change where your money goes."}
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default EditProfile;
