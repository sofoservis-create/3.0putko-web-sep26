"use client";

import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { FormContext } from "../FormContext";
import en from "../locales/en";
import sk from "../locales/sk";
import { User, Heart, CalendarClock, Shield, ArrowRight, Eye, EyeOff, KeyRound, Pencil, Trash2 } from "lucide-react";
import Link from "@/app/components/NextLink";
import HostActivationDialog from "../components/HostActivationDialog";
import Header from "../components/Header";
import MobileHeader from "../components/Header/MobileHeader";
import Footer from "../components/Footer/Footer";
import FooterNav from "../Shared/FooterNav";
import { toast } from "react-toastify";
import {
  announceFavoritesChanged,
  changeGuestPassword,
  getAccommodation,
  getGuestFavorites,
  removeGuestFavorite,
  updateGuestProfile,
} from "../utlis/guestAccountApi";

export default function GuestLayout() {
  const { user, dispatch, activateHost, switchMode, isDevelopmentAccount } = useContext(AuthContext);
  const { lang } = useContext(FormContext);
  const language = lang || "sk";
  const translations = { en, sk };
  const t = translations[language];

  const [activeTab, setActiveTab] = useState("profile");

  const TABS = [
    { id: "profile", label: language === "en" ? "Personal Details" : "Osobné údaje", icon: User },
    { id: "favorites", label: language === "en" ? "Saved Stays" : "Uložené", icon: Heart },
    { id: "stays", label: language === "en" ? "Trip History" : "Moje cesty", icon: CalendarClock },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#FFFEF9] flex flex-col font-inter">
      {/* Headers */}
      <div className="hidden lg:block bg-white border-b border-neutral-200">
        <Header />
      </div>
      <div className="relative z-20">
        <MobileHeader />
      </div>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 lg:mt-[72px]">
        
        <div className="mb-8 md:mb-10">
          <h1 className="font-fraunces text-3xl md:text-4xl font-semibold text-[#163C2E]">
            {language === 'en' ? 'Welcome back' : 'Vitajte späť'}, {user?.name?.split(' ')[0] || ''}
          </h1>
          <p className="mt-2 text-neutral-600">
            {language === 'en' ? 'Manage your account and upcoming trips.' : 'Spravujte svoj účet a nadchádzajúce cesty.'}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          {/* Sidebar / Mobile Tabs */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="grid grid-cols-3 lg:flex lg:flex-col gap-2 pb-2 lg:pb-0">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-w-0 flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1.5 lg:gap-3 px-2 lg:px-4 py-3 rounded-xl transition-all text-center lg:text-left text-xs sm:text-sm font-medium
                    ${activeTab === tab.id 
                      ? "bg-[#238869] text-white shadow-md shadow-[#238869]/20" 
                      : "bg-white text-neutral-600 hover:bg-neutral-50 hover:text-[#163C2E] border border-neutral-100"
                    }`}
                >
                  <tab.icon size={18} className={activeTab === tab.id ? "text-white" : "text-neutral-400"} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Become a Host Teaser */}
            <HostModeTeaser
              language={language}
              user={user}
              isDevelopmentAccount={isDevelopmentAccount}
              activateHost={activateHost}
              switchMode={switchMode}
            />
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 bg-white rounded-2xl md:rounded-[24px] border border-neutral-200 shadow-sm p-5 md:p-8">
            {activeTab === "profile" && <ProfileTab user={user} dispatch={dispatch} language={language} t={t} />}
            {activeTab === "favorites" && <FavoritesTab language={language} />}
            {activeTab === "stays" && <UnavailableState 
              icon={CalendarClock}
              title={language === 'en' ? 'Trip History' : 'Moje cesty'}
              message={language === 'en' 
                ? 'Your reservation history syncing is currently unavailable. This feature will be securely enabled in a future update.' 
                : 'Synchronizácia histórie rezervácií momentálne nie je k dispozícii. Táto funkcia bude bezpečne aktivovaná v budúcej aktualizácii.'}
            />}
          </div>

          {/* Mobile Become a Host Teaser */}
          <HostModeTeaser
            language={language}
            user={user}
            isDevelopmentAccount={isDevelopmentAccount}
            activateHost={activateHost}
            switchMode={switchMode}
            mobile={true}
          />
        </div>

      </main>
      
      <div className="pb-[60px] md:pb-0">
        <Footer />
        <FooterNav />
      </div>
    </div>
  );
}

const fieldClass =
  "min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#238869] focus:ring-2 focus:ring-[#238869]/15 disabled:bg-neutral-50 disabled:text-neutral-500";

function ProfileTab({ user, dispatch, language, t }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    lastName: user?.lastName || "",
    phoneNumber: user?.phoneNumber || user?.phone || "",
    gender: user?.gender || "other",
    language: user?.language || "Slovak",
  });

  useEffect(() => {
    setForm({
      name: user?.name || "",
      lastName: user?.lastName || "",
      phoneNumber: user?.phoneNumber || user?.phone || "",
      gender: user?.gender || "other",
      language: user?.language || "Slovak",
    });
  }, [user]);

  const update = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const saveProfile = async (event) => {
    event.preventDefault();
    const cleanPhone = form.phoneNumber.replace(/\s/g, "");
    if (!form.name.trim() || !form.lastName.trim()) {
      toast.error(language === "en" ? "Enter your first and last name." : "Zadajte meno a priezvisko.");
      return;
    }
    if (!/^\+[1-9][0-9]{7,14}$/.test(cleanPhone)) {
      toast.error(language === "en" ? "Enter a valid international phone number." : "Zadajte platné telefónne číslo v medzinárodnom formáte.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateGuestProfile({
        ...form,
        name: form.name.trim(),
        lastName: form.lastName.trim(),
        phoneNumber: cleanPhone,
      });
      dispatch({
        type: "LOGIN_SUCCESS",
        payload: {
          user: updated,
          token: localStorage.getItem("token"),
          role: "guest",
        },
      });
      setEditing(false);
      toast.success(language === "en" ? "Profile updated." : "Profil bol aktualizovaný.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-5">
        <div>
          <h2 className="text-xl font-semibold text-[#163C2E]">
            {language === 'en' ? 'Personal Details' : 'Osobné údaje'}
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            {language === 'en' ? 'Your identity and contact information.' : 'Vaša identita a kontaktné informácie.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#C5E1D8] px-4 py-2 text-sm font-semibold text-[#163C2E] hover:bg-[#E9F3F0]"
        >
          <Pencil size={16} />
          {editing ? (language === "en" ? "Cancel" : "Zrušiť") : (language === "en" ? "Edit" : "Upraviť")}
        </button>
      </div>

      <form onSubmit={saveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            {t.FirstName || (language === 'en' ? 'First Name' : 'Meno')}
          </label>
          <input className={fieldClass} value={form.name} onChange={update("name")} disabled={!editing} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            {t.LastName || (language === 'en' ? 'Last Name' : 'Priezvisko')}
          </label>
          <input className={fieldClass} value={form.lastName} onChange={update("lastName")} disabled={!editing} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide flex items-center gap-2">
            {t.email || (language === 'en' ? 'Email' : 'Email')}
            <Shield size={12} className="text-[#4FBE9F]" />
          </label>
          <input className={fieldClass} value={user?.email || ""} disabled />
        </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              {language === 'en' ? 'Phone' : 'Telefón'}
            </label>
            <input className={fieldClass} value={form.phoneNumber} onChange={update("phoneNumber")} disabled={!editing} placeholder="+421 000 000 000" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              {t.gender || (language === 'en' ? 'Gender' : 'Pohlavie')}
            </label>
            <select className={fieldClass} value={form.gender} onChange={update("gender")} disabled={!editing}>
              <option value="female">{language === "en" ? "Female" : "Žena"}</option>
              <option value="male">{language === "en" ? "Male" : "Muž"}</option>
              <option value="other">{language === "en" ? "Other" : "Iné"}</option>
            </select>
          </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            {language === "en" ? "Language" : "Jazyk"}
          </label>
          <select className={fieldClass} value={form.language} onChange={update("language")} disabled={!editing}>
            <option value="Slovak">Slovenčina</option>
            <option value="English">English</option>
          </select>
        </div>
        {editing && (
          <div className="md:col-span-2 flex justify-end">
            <button disabled={saving} className="min-h-11 w-full sm:w-auto rounded-xl bg-[#238869] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? (language === "en" ? "Saving…" : "Ukladám…") : (language === "en" ? "Save changes" : "Uložiť zmeny")}
            </button>
          </div>
        )}
      </form>

      <div className="border-t border-neutral-100 pt-6">
        <button
          type="button"
          onClick={() => setShowSecurity((value) => !value)}
          className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[#C5E1D8] px-4 py-2.5 text-sm font-semibold text-[#1A3A2E] hover:bg-[#E9F3F0]"
        >
          <KeyRound size={17} />
          {language === "en" ? "Password and security" : "Heslo a bezpečnosť"}
        </button>
        {showSecurity && <PasswordForm language={language} dispatch={dispatch} />}
      </div>
    </div>
  );
}

function PasswordForm({ language, dispatch }) {
  const [values, setValues] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [visible, setVisible] = useState({});
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (values.newPassword.length < 8) {
      toast.error(language === "en" ? "New password must have at least 8 characters." : "Nové heslo musí mať aspoň 8 znakov.");
      return;
    }
    if (values.newPassword !== values.confirmPassword) {
      toast.error(language === "en" ? "New passwords do not match." : "Nové heslá sa nezhodujú.");
      return;
    }
    setSaving(true);
    try {
      await changeGuestPassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        lang: language,
      });
      toast.success(language === "en" ? "Password changed. Please log in again." : "Heslo bolo zmenené. Prihláste sa znova.");
      dispatch({ type: "LOGOUT" });
      window.location.href = "/login";
    } catch (error) {
      toast.error(error.message);
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="mt-5 grid gap-4 rounded-2xl bg-neutral-50 p-4 sm:p-5">
      <input
        type="email"
        value={localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).email || "" : ""}
        autoComplete="username"
        readOnly
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      {[
        ["currentPassword", language === "en" ? "Current password" : "Aktuálne heslo"],
        ["newPassword", language === "en" ? "New password" : "Nové heslo"],
        ["confirmPassword", language === "en" ? "Confirm new password" : "Potvrďte nové heslo"],
      ].map(([field, label]) => (
        <label key={field} className="space-y-1.5 text-sm font-medium text-neutral-700">
          <span>{label}</span>
          <span className="relative block">
            <input
              type={visible[field] ? "text" : "password"}
              value={values[field]}
              onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}
              className={`${fieldClass} pr-12`}
              autoComplete={field === "currentPassword" ? "current-password" : "new-password"}
            />
            <button type="button" onClick={() => setVisible((current) => ({ ...current, [field]: !current[field] }))} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-neutral-500" aria-label={visible[field] ? "Hide password" : "Show password"}>
              {visible[field] ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
      ))}
      <button disabled={saving} className="min-h-11 rounded-xl bg-[#163C2E] px-5 text-sm font-semibold text-white disabled:opacity-60">
        {saving ? (language === "en" ? "Changing…" : "Mením…") : (language === "en" ? "Change password" : "Zmeniť heslo")}
      </button>
    </form>
  );
}

function FavoritesTab({ language }) {
  const [state, setState] = useState({ loading: true, ids: [], listings: [], unavailable: [], error: "" });

  const load = async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const { favorites } = await getGuestFavorites();
      const results = await Promise.allSettled(favorites.map(getAccommodation));
      setState({
        loading: false,
        ids: favorites,
        listings: results.filter((result) => result.status === "fulfilled").map((result) => result.value),
        unavailable: results.flatMap((result, index) => result.status === "rejected" ? [favorites[index]] : []),
        error: "",
      });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message }));
    }
  };

  useEffect(() => {
    void load();
    const sync = () => void load();
    window.addEventListener("putko:favorites-changed", sync);
    return () => window.removeEventListener("putko:favorites-changed", sync);
  }, []);

  const remove = async (id) => {
    try {
      const result = await removeGuestFavorite(id);
      announceFavoritesChanged(result.favorites);
      toast.success(language === "en" ? "Removed from saved stays." : "Odstránené z uložených.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (state.loading) return <div className="py-16 text-center text-neutral-500">{language === "en" ? "Loading saved stays…" : "Načítavam uložené ubytovania…"}</div>;
  if (state.error) return <UnavailableState icon={Heart} title={language === "en" ? "Saved stays unavailable" : "Uložené sa nepodarilo načítať"} message={state.error} />;
  if (!state.ids.length) return <UnavailableState icon={Heart} title={language === "en" ? "No saved stays yet" : "Zatiaľ nemáte nič uložené"} message={language === "en" ? "Tap the heart on a listing and it will appear here." : "Ťuknite na srdiečko pri ubytovaní a zobrazí sa tu."} />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-fraunces text-2xl font-semibold text-[#163C2E]">{language === "en" ? "Saved stays" : "Uložené ubytovania"}</h2>
        <p className="mt-1 text-sm text-neutral-500">{language === "en" ? "Your favorites are synchronized with listing hearts." : "Vaše uložené sú synchronizované so srdiečkami pri ponukách."}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {state.listings.map((listing) => (
          <article key={listing._id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <Link href={`/listings/${listing.slug}`} className="block">
              <img src={listing.images?.[0] || "/placeholder.png"} alt="" className="aspect-[16/10] w-full object-cover" />
              <div className="p-4">
                <h3 className="font-fraunces text-lg font-semibold text-[#163C2E]">{listing.name}</h3>
                <p className="mt-1 text-sm text-neutral-500">{listing.locationDetails?.city}</p>
              </div>
            </Link>
            <button type="button" onClick={() => remove(listing._id)} className="mx-4 mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-100 px-3 text-sm font-semibold text-red-700 hover:bg-red-50">
              <Trash2 size={16} /> {language === "en" ? "Remove" : "Odstrániť"}
            </button>
          </article>
        ))}
      </div>
      {state.unavailable.length > 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          {language === "en" ? "Some saved stays are no longer available." : "Niektoré uložené ubytovania už nie sú dostupné."}
        </p>
      )}
    </div>
  );
}

function UnavailableState({ icon: Icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 md:py-20 px-4">
      <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-neutral-100">
        <Icon size={32} className="text-neutral-400" />
      </div>
      <h2 className="font-fraunces text-2xl font-semibold text-[#163C2E] mb-3">
        {title}
      </h2>
      <p className="text-neutral-500 max-w-sm mx-auto leading-relaxed text-sm md:text-base">
        {message}
      </p>
    </div>
  );
}

function HostModeTeaser({ language, user, isDevelopmentAccount, activateHost, switchMode, mobile = false }) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const isHost = user?.capabilities?.includes("host");

  const handleAction = async () => {
    if (!isHost) {
      if (!isDevelopmentAccount) {
        toast.error(language === "en" ? "Host activation is currently in development." : "Aktivácia hostiteľa je momentálne vo vývoji.");
        return;
      }
      setConfirming(true);
      return;
    }
    await runAction();
  };

  const runAction = async () => {
    setLoading(true);
    try {
      if (isHost) {
        await switchMode("host");
        window.location.href = "/host";
      } else {
        await activateHost();
        setConfirming(false);
        toast.success(language === "en" ? "Host mode activated!" : "Hostiteľský režim bol aktivovaný!");
        localStorage.setItem("putko:start-host-onboarding", "true");
        window.location.href = "/host";
      }
    } catch (error) {
      toast.error(error.message || (language === "en" ? "Something went wrong" : "Niečo sa pokazilo"));
    } finally {
      setLoading(false);
    }
  };

  const confirmationDialog = (
    <HostActivationDialog
      open={confirming}
      language={language}
      loading={loading}
      onCancel={() => setConfirming(false)}
      onConfirm={runAction}
    />
  );

  if (mobile) {
    return (
      <>
      <div className="block lg:hidden w-full bg-gradient-to-br from-[#163C2E] to-[#214F3D] rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h3 className="font-fraunces text-lg font-semibold mb-1">
              {isHost ? (language === 'en' ? 'Switch to Host Mode' : 'Prepnúť do hostiteľského režimu') : (language === 'en' ? 'Earn with Putko' : 'Zarábajte s Putko')}
            </h3>
            <p className="text-sm text-white/80">
              {isHost ? (language === 'en' ? 'Manage your listings' : 'Spravujte svoje ponuky') : (language === 'en' ? 'Become a host' : 'Stať sa hostiteľom')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAction}
            disabled={loading || (!isDevelopmentAccount && !isHost)}
            aria-label={language === "en" ? "Activate or switch host mode" : "Aktivovať alebo prepnúť režim hostiteľa"}
            className={`p-3 rounded-full flex items-center justify-center transition-all ${
              loading || (!isDevelopmentAccount && !isHost)
                ? "bg-white/10 text-white/70 border border-white/20 cursor-not-allowed"
                : "bg-white text-[#163C2E] hover:bg-white/90"
            }`}
          >
            {loading ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <ArrowRight size={20} />}
          </button>
        </div>
      </div>
      {confirmationDialog}
      </>
    );
  }

  return (
    <>
    <div className="hidden lg:block mt-8 bg-gradient-to-br from-[#163C2E] to-[#214F3D] rounded-2xl p-6 text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      <h3 className="font-fraunces text-xl font-semibold mb-2 relative z-10">
        {isHost ? (language === 'en' ? 'Switch to Host' : 'Prepnúť na Hostiteľa') : (language === 'en' ? 'Earn with Putko' : 'Zarábajte s Putko')}
      </h3>
      <p className="text-sm text-white/80 mb-5 relative z-10">
        {isHost
          ? (language === 'en' ? 'Manage your properties and bookings.' : 'Spravujte svoje nehnuteľnosti a rezervácie.')
          : (language === 'en' ? 'Turn your unique property into extra income.' : 'Premeňte svoju unikátnu nehnuteľnosť na extra príjem.')}
      </p>
      <button
        type="button"
        onClick={handleAction}
        disabled={loading || (!isDevelopmentAccount && !isHost)}
        className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between transition-all relative z-10 ${
          loading || (!isDevelopmentAccount && !isHost)
            ? "bg-white/10 text-white/80 border border-white/20 cursor-not-allowed"
            : "bg-white text-[#163C2E] hover:bg-white/90"
        }`}
      >
        {loading ? (
          <div className="w-full flex justify-center py-0.5">
            <div className="w-4 h-4 border-2 border-[#163C2E] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {isHost
              ? (language === 'en' ? 'Switch Mode' : 'Prepnúť')
              : (!isDevelopmentAccount ? (language === 'en' ? 'Coming later' : 'Pripravujeme') : (language === 'en' ? 'Activate Host Mode' : 'Aktivovať'))}
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </div>
    {confirmationDialog}
    </>
  );
}