import React, { useState } from "react";
import { CalendarIcon, Info, Landmark, Link2, Plus, Trash2 } from "lucide-react";
import { fieldElementId, isHttpUrl } from "../../../host/hostEditorValidation";
import {
  CheckCard,
  FieldError,
  NumberStepperField,
  SelectField,
  TextAreaField,
  TextField,
  controlClass,
} from "./EditorFields";

export const AMENITIES_LIST = [
  { id: "wifi", en: "WiFi", sk: "WiFi" },
  { id: "kitchen", en: "Kitchen", sk: "Kuchyňa" },
  { id: "parking", en: "Parking", sk: "Parkovanie" },
  { id: "pool", en: "Pool", sk: "Bazén" },
  { id: "tv", en: "TV", sk: "TV" },
  { id: "ac", en: "Air Conditioning", sk: "Klimatizácia" },
  { id: "heating", en: "Heating", sk: "Kúrenie" },
  { id: "washer", en: "Washer", sk: "Práčka" },
];

const PROPERTY_TYPES = [
  { value: "apartment", en: "Apartment", sk: "Apartmán" },
  { value: "house", en: "House", sk: "Dom" },
  { value: "cabin", en: "Cabin", sk: "Chata" },
  { value: "glamping", en: "Glamping", sk: "Glamping" },
];

const CANCELLATION_POLICIES = [
  { value: "flexible", en: "Flexible — full refund up to 1 day before check-in", sk: "Flexibilné — plná náhrada do 1 dňa pred príchodom" },
  { value: "moderate", en: "Moderate — full refund up to 5 days before check-in", sk: "Mierne — plná náhrada do 5 dní pred príchodom" },
  { value: "strict", en: "Strict — 50% refund up to 7 days before check-in", sk: "Prísne — 50 % náhrada do 7 dní pred príchodom" },
];

const SPACE_FIELDS = [
  { name: "guests", en: "Guests", sk: "Hostia", min: 1 },
  { name: "bedrooms", en: "Bedrooms", sk: "Spálne", min: 1 },
  { name: "beds", en: "Beds", sk: "Postele", min: 1 },
  { name: "bathrooms", en: "Bathrooms", sk: "Kúpeľne", min: 1 },
];

const t = (language, en, sk) => (language === "en" ? en : sk);

function StepIntro({ children }) {
  return <p className="text-[14px] font-medium leading-6 text-neutral-500">{children}</p>;
}

function Basics({ data, errors, language, onChange }) {
  return (
    <div className="space-y-6">
      <TextField
        name="name"
        label={t(language, "Property name", "Názov ubytovania")}
        value={data.name}
        onChange={onChange}
        error={errors.name}
        placeholder={t(language, "e.g. Cozy Cabin in the Woods", "napr. Útulná chata v lese")}
      />
      <SelectField
        name="propertyType"
        label={t(language, "Property type", "Typ ubytovania")}
        value={data.propertyType}
        onChange={onChange}
        error={errors.propertyType}
      >
        <option value="">{t(language, "Select type", "Vyberte typ")}</option>
        {PROPERTY_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type[language === "en" ? "en" : "sk"]}
          </option>
        ))}
      </SelectField>
      <TextAreaField
        name="description"
        label={t(language, "Description", "Popis")}
        value={data.description}
        onChange={onChange}
        error={errors.description}
        rows={6}
        placeholder={t(language, "Describe your place...", "Popíšte svoje miesto...")}
        hint={t(language, "What makes the place special, who it suits, and what is nearby.", "Čím je miesto výnimočné, pre koho sa hodí a čo je v okolí.")}
      />
    </div>
  );
}

function Location({ data, errors, language, onChange }) {
  return (
    <div className="space-y-6">
      <TextField
        name="street"
        label={t(language, "Street address", "Ulica a číslo")}
        value={data.street}
        onChange={onChange}
        error={errors.street}
        autoComplete="street-address"
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <TextField
          name="city"
          label={t(language, "City", "Mesto")}
          value={data.city}
          onChange={onChange}
          error={errors.city}
          autoComplete="address-level2"
        />
        <TextField
          name="country"
          label={t(language, "Country", "Krajina")}
          value={data.country}
          onChange={onChange}
          error={errors.country}
          autoComplete="country-name"
        />
      </div>
      <StepIntro>
        {t(language, "The exact address is shared with travellers only after a confirmed booking.", "Presná adresa sa cestovateľom zobrazí až po potvrdenej rezervácii.")}
      </StepIntro>
    </div>
  );
}

function Spaces({ data, errors, language, setField }) {
  return (
    <div className="space-y-6">
      <StepIntro>
        {t(language, "Count what guests can actually use. Each value must be at least 1.", "Počítajte len to, čo môžu hostia skutočne používať. Každá hodnota musí byť aspoň 1.")}
      </StepIntro>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {SPACE_FIELDS.map((field) => (
          <NumberStepperField
            key={field.name}
            name={field.name}
            label={field[language === "en" ? "en" : "sk"]}
            value={data[field.name]}
            onValueChange={setField}
            min={field.min}
            error={errors[field.name]}
            language={language}
          />
        ))}
      </div>
    </div>
  );
}

function Amenities({ data, errors, language, toggleAmenity }) {
  const selected = Array.isArray(data.amenities) ? data.amenities : [];
  const groupId = fieldElementId("amenities");
  const errorId = `${groupId}-error`;
  return (
    <fieldset aria-describedby={errors.amenities ? errorId : undefined}>
      <legend className="mb-3 text-sm font-bold text-[#1E3E2B]">
        {t(language, "Select everything guests can use", "Vyberte všetko, čo môžu hostia používať")}
      </legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {AMENITIES_LIST.map((amenity, index) => {
          const checked = selected.includes(amenity.id);
          const id = index === 0 ? groupId : `${groupId}-${amenity.id}`;
          return (
            <label
              key={amenity.id}
              htmlFor={id}
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-all ${
                checked ? "border-[#DFBA73] bg-[#DFBA73]/5" : errors.amenities ? "border-red-200 hover:border-red-300" : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={() => toggleAmenity(amenity.id)}
                aria-invalid={errors.amenities ? true : undefined}
                className="h-6 w-6 shrink-0 rounded border-neutral-300 text-[#DFBA73] focus:ring-[#DFBA73] scroll-mb-40"
              />
              <span className="text-[15px] font-bold text-[#1E3E2B]">{amenity[language === "en" ? "en" : "sk"]}</span>
            </label>
          );
        })}
      </div>
      <FieldError id={errorId} message={errors.amenities} />
    </fieldset>
  );
}

/**
 * Interim photo input. Object storage is not provisioned for this project
 * yet, so the step honestly asks for a link to an already-hosted photo and
 * validates it inline instead of presenting a browser prompt as the flow.
 * The payload stays `photoUrls: string[]`.
 */
function Photos({ data, errors, language, addPhoto, removePhoto }) {
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState(null);
  const [broken, setBroken] = useState(() => new Set());
  const photos = Array.isArray(data.photoUrls) ? data.photoUrls : [];
  const inputId = fieldElementId("photoUrls");
  const errorId = `${inputId}-error`;
  const error = draftError || errors.photoUrls;

  const submit = () => {
    const url = draft.trim();
    if (!isHttpUrl(url)) {
      setDraftError(t(language, "Enter a full link starting with https:// or http://.", "Zadajte úplný odkaz začínajúci https:// alebo http://."));
      return;
    }
    if (photos.some((photo) => (typeof photo === "string" ? photo : photo?.url) === url)) {
      setDraftError(t(language, "This photo is already added.", "Táto fotografia je už pridaná."));
      return;
    }
    addPhoto(url);
    setDraft("");
    setDraftError(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
        <Info size={18} className="mt-0.5 shrink-0" />
        <p className="text-[13px] font-medium leading-5">
          {t(
            language,
            "Uploading photos from your device is not available yet. For now, paste a link to a photo that is already online (for example from your website or a photo host). Uploads will replace this step later; the photos you add now stay on the listing.",
            "Nahrávanie fotografií zo zariadenia zatiaľ nie je k dispozícii. Zatiaľ vložte odkaz na fotografiu, ktorá je už online (napr. z vášho webu alebo fotoúložiska). Nahrávanie tento krok neskôr nahradí; pridané fotografie zostanú v ponuke.",
          )}
        </p>
      </div>

      <div>
        <label htmlFor={inputId} className="mb-2 block text-sm font-bold text-[#1E3E2B]">
          {t(language, "Photo link", "Odkaz na fotografiu")}
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id={inputId}
            type="url"
            inputMode="url"
            autoComplete="off"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (draftError) setDraftError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="https://…/photo.jpg"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={controlClass(error, "flex-1")}
          />
          <button
            type="button"
            onClick={submit}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1E3E2B] px-5 text-sm font-bold text-white transition-colors hover:bg-[#163021]"
          >
            <Plus size={18} />
            {t(language, "Add photo", "Pridať fotografiu")}
          </button>
        </div>
        <FieldError id={errorId} message={error} />
      </div>

      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => {
            const url = typeof photo === "string" ? photo : photo?.url;
            return (
              <li key={`${url}-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100">
                {broken.has(url) ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-3 text-center text-neutral-400">
                    <Link2 size={22} />
                    <span className="text-[11px] font-semibold leading-4">
                      {t(language, "Image could not be loaded", "Obrázok sa nepodarilo načítať")}
                    </span>
                  </div>
                ) : (
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setBroken((prev) => new Set(prev).add(url))}
                  />
                )}
                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded-lg bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1E3E2B]">
                    {t(language, "Cover", "Titulná")}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  aria-label={t(language, `Remove photo ${index + 1}`, `Odstrániť fotografiu ${index + 1}`)}
                  className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 text-red-600 shadow-sm"
                >
                  <Trash2 size={18} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-2xl border-2 border-dashed border-neutral-200 px-4 py-8 text-center text-[14px] font-medium text-neutral-400">
          {t(language, "No photos yet. The first photo becomes the cover.", "Zatiaľ žiadne fotografie. Prvá fotografia bude titulná.")}
        </p>
      )}
    </div>
  );
}

function Pricing({ data, errors, language, onChange, setField }) {
  return (
    <div className="space-y-6">
      <NumberStepperField
        name="nightlyPrice"
        label={t(language, "Nightly price (€)", "Cena za noc (€)")}
        value={data.nightlyPrice}
        onValueChange={setField}
        min={1}
        step={1}
        decimals={2}
        prefix="€"
        error={errors.nightlyPrice}
        language={language}
        hint={t(language, "Base price per night in euros, before cleaning or extra-guest fees.", "Základná cena za noc v eurách, bez upratovania či príplatkov za ďalších hostí.")}
      />
      <NumberStepperField
        name="minNights"
        label={t(language, "Minimum nights", "Minimálny počet nocí")}
        value={data.minNights}
        onValueChange={setField}
        min={1}
        step={1}
        error={errors.minNights}
        language={language}
        hint={t(language, "Shortest stay you accept. 1 allows single-night bookings.", "Najkratší pobyt, ktorý prijímate. 1 povoľuje aj jednonocové rezervácie.")}
      />
      <SelectField
        name="cancellationPolicy"
        label={t(language, "Cancellation policy (optional)", "Storno podmienky (voliteľné)")}
        value={data.cancellationPolicy}
        onChange={onChange}
        hint={t(language, "Shown to travellers before they book.", "Zobrazuje sa cestovateľom pred rezerváciou.")}
      >
        <option value="">{t(language, "Select policy", "Vyberte podmienky")}</option>
        {CANCELLATION_POLICIES.map((policy) => (
          <option key={policy.value} value={policy.value}>
            {policy[language === "en" ? "en" : "sk"]}
          </option>
        ))}
      </SelectField>
    </div>
  );
}

function Policies({ data, errors, language, onChange }) {
  return (
    <div className="space-y-6">
      <StepIntro>
        {t(language, "Check-in and check-out times are shown on the listing and in every booking confirmation.", "Časy príchodu a odchodu sa zobrazujú v ponuke a v každom potvrdení rezervácie.")}
      </StepIntro>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <TextField
          name="checkIn"
          type="time"
          label={t(language, "Check-in time", "Čas príchodu")}
          value={data.checkIn}
          onChange={onChange}
          error={errors.checkIn}
        />
        <TextField
          name="checkOut"
          type="time"
          label={t(language, "Check-out time", "Čas odchodu")}
          value={data.checkOut}
          onChange={onChange}
          error={errors.checkOut}
        />
      </div>
      <CheckCard
        id={fieldElementId("availabilityConfirmed")}
        name="availabilityConfirmed"
        checked={data.availabilityConfirmed}
        onChange={onChange}
        error={errors.availabilityConfirmed}
        title={t(language, "I confirm my availability is up to date", "Potvrdzujem, že moja dostupnosť je aktuálna")}
        description={t(
          language,
          "Required before publishing. It means the dates you leave open can really be booked — travellers rely on it, and you keep it current in the calendar step.",
          "Povinné pred zverejnením. Znamená to, že voľné termíny je naozaj možné rezervovať — cestovatelia sa na to spoliehajú a vy ich udržiavate aktuálne v kroku Kalendár.",
        )}
      />
    </div>
  );
}

function Calendar({ data, errors, language, setField }) {
  const feeds = Array.isArray(data.calendarFeeds) ? data.calendarFeeds : [];
  const choice = data.calendarChoice === "connect" ? "connect" : data.calendarChoice === "none" ? "none" : "";
  const choiceId = fieldElementId("calendarChoice");
  const choiceErrorId = `${choiceId}-error`;
  const feedsErrorId = `${fieldElementId("calendarFeeds")}-error`;

  const updateFeed = (index, patch) => {
    const next = feeds.map((feed, i) => (i === index ? { ...feed, ...patch } : feed));
    setField("calendarFeeds", next);
  };
  const removeFeed = (index) => setField("calendarFeeds", feeds.filter((_, i) => i !== index));
  const addFeed = () => setField("calendarFeeds", [...feeds, { label: "", url: "" }]);

  const options = [
    {
      value: "none",
      title: t(language, "Manual only", "Len manuálne"),
      description: t(language, "You block and open dates yourself in Putko.", "Termíny blokujete a otvárate sami v Putku."),
    },
    {
      value: "connect",
      title: t(language, "Connect calendar links (iCal)", "Pripojiť odkazy na kalendár (iCal)"),
      description: t(language, "Import blocked dates from Airbnb, Booking.com or another calendar.", "Importujte obsadené termíny z Airbnb, Booking.com alebo iného kalendára."),
    },
  ];

  return (
    <div className="space-y-8">
      <fieldset aria-describedby={errors.calendarChoice ? choiceErrorId : undefined}>
        <legend className="mb-3 text-sm font-bold text-[#1E3E2B]">
          {t(language, "How do you manage availability?", "Ako spravujete dostupnosť?")}
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {options.map((option, index) => {
            const checked = choice === option.value;
            const id = index === 0 ? choiceId : `${choiceId}-${option.value}`;
            return (
              <label
                key={option.value}
                htmlFor={id}
                className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-colors ${
                  checked ? "border-[#DFBA73] bg-[#DFBA73]/5" : errors.calendarChoice ? "border-red-300" : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                <input
                  id={id}
                  type="radio"
                  name="calendarChoice"
                  value={option.value}
                  checked={checked}
                  onChange={() => setField("calendarChoice", option.value)}
                  aria-invalid={errors.calendarChoice ? true : undefined}
                  className="mt-0.5 h-6 w-6 shrink-0 border-neutral-300 text-[#DFBA73] focus:ring-[#DFBA73] scroll-mb-40"
                />
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold text-[#1E3E2B]">{option.title}</span>
                  <span className="mt-0.5 block text-[13px] font-medium leading-5 text-neutral-500">{option.description}</span>
                </span>
              </label>
            );
          })}
        </div>
        <FieldError id={choiceErrorId} message={errors.calendarChoice} />
      </fieldset>

      {choice === "connect" && (
        <div className="space-y-4 border-t border-neutral-100 pt-6">
          <div>
            <h3 className="text-sm font-bold text-[#1E3E2B]">{t(language, "Calendar links (iCal)", "Odkazy na kalendár (iCal)")}</h3>
            <p className="mt-1 text-[13px] font-medium leading-5 text-neutral-500">
              {t(
                language,
                "Paste the export link from the other platform (it usually ends with .ics). Links are saved with the listing; automatic syncing is set up in the calendar section later.",
                "Vložte exportný odkaz z druhej platformy (zvyčajne končí na .ics). Odkazy sa uložia s ponukou; automatická synchronizácia sa nastaví neskôr v sekcii Kalendár.",
              )}
            </p>
          </div>
          {feeds.map((feed, index) => {
            const urlError = errors[`calendarFeeds.${index}.url`];
            const urlId = fieldElementId(`calendarFeeds.${index}.url`);
            return (
              <div key={index} className="rounded-2xl border border-neutral-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-neutral-400">
                    {t(language, `Link ${index + 1}`, `Odkaz ${index + 1}`)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFeed(index)}
                    aria-label={t(language, `Remove link ${index + 1}`, `Odstrániť odkaz ${index + 1}`)}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-red-500 transition-colors hover:bg-red-50"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                  <div>
                    <label htmlFor={`${urlId}-label`} className="mb-1.5 block text-[13px] font-bold text-[#1E3E2B]">
                      {t(language, "Label (optional)", "Štítok (voliteľné)")}
                    </label>
                    <input
                      id={`${urlId}-label`}
                      type="text"
                      value={feed.label || ""}
                      onChange={(event) => updateFeed(index, { label: event.target.value })}
                      placeholder={t(language, "e.g. Airbnb", "napr. Airbnb")}
                      className={controlClass(false)}
                    />
                  </div>
                  <div>
                    <label htmlFor={urlId} className="mb-1.5 block text-[13px] font-bold text-[#1E3E2B]">
                      {t(language, "Calendar link", "Odkaz na kalendár")}
                    </label>
                    <input
                      id={urlId}
                      type="url"
                      inputMode="url"
                      value={feed.url || ""}
                      onChange={(event) => updateFeed(index, { url: event.target.value })}
                      placeholder="https://…/calendar.ics"
                      aria-invalid={urlError ? true : undefined}
                      aria-describedby={urlError ? `${urlId}-error` : undefined}
                      className={controlClass(urlError)}
                    />
                    <FieldError id={`${urlId}-error`} message={urlError} />
                  </div>
                </div>
              </div>
            );
          })}
          <FieldError id={feedsErrorId} message={errors.calendarFeeds} />
          <button
            type="button"
            onClick={addFeed}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-neutral-200 px-4 text-[15px] font-bold text-[#1E3E2B] transition-colors hover:border-neutral-300 hover:bg-neutral-50"
          >
            <Plus size={18} /> {t(language, "Add calendar link", "Pridať odkaz na kalendár")}
          </button>
        </div>
      )}

      {choice === "none" && (
        <div className="flex items-start gap-3 rounded-2xl bg-neutral-50 px-4 py-3 text-[13px] font-medium leading-5 text-neutral-600">
          <CalendarIcon size={18} className="mt-0.5 shrink-0 text-[#1E3E2B]" />
          <span>
            {t(language, "You can add calendar links later from the listing's calendar without redoing setup.", "Odkazy na kalendár môžete pridať neskôr v kalendári ponuky bez opakovania nastavenia.")}
          </span>
        </div>
      )}
    </div>
  );
}

function Readiness({ data, errors, language, onChange }) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-neutral-200 bg-neutral-50/70 p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1E3E2B] text-white">
            <Landmark size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-[#1E3E2B]">{t(language, "Payouts", "Výplaty")}</h3>
              <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-bold text-neutral-700">
                {t(language, "Not available yet", "Zatiaľ nedostupné")}
              </span>
            </div>
            <p className="mt-2 text-[14px] font-medium leading-6 text-neutral-600">
              {t(
                language,
                "Putko does not process payouts yet, and there is no Stripe account connected to this listing or to your host account. Nothing is collected from travellers and nothing is paid out.",
                "Putko zatiaľ nespracúva výplaty a k tejto ponuke ani k vášmu hostiteľskému účtu nie je pripojený žiadny Stripe účet. Od cestovateľov sa nič nevyberá a nič sa nevypláca.",
              )}
            </p>
            <p className="mt-2 text-[14px] font-medium leading-6 text-neutral-600">
              {t(
                language,
                "You can finish and publish this listing now. Before paid bookings open, you will set up one payout account for your host profile; it will apply to all your listings.",
                "Túto ponuku môžete dokončiť a zverejniť už teraz. Pred spustením platených rezervácií si nastavíte jeden výplatný účet vo svojom hostiteľskom profile; bude platiť pre všetky vaše ponuky.",
              )}
            </p>
          </div>
        </div>
      </div>

      <CheckCard
        id={fieldElementId("payoutAcknowledged")}
        name="payoutAcknowledged"
        checked={data.payoutAcknowledged}
        onChange={onChange}
        error={errors.payoutAcknowledged}
        title={t(language, "I understand payouts are not set up yet", "Rozumiem, že výplaty zatiaľ nie sú nastavené")}
        description={t(
          language,
          "Required to finish setup. You will be asked to add a payout account before this listing can take paid bookings.",
          "Povinné na dokončenie nastavenia. Pred prijímaním platených rezervácií vás požiadame o pridanie výplatného účtu.",
        )}
      />
    </div>
  );
}

const STEP_COMPONENTS = {
  basics: Basics,
  location: Location,
  spaces: Spaces,
  amenities: Amenities,
  photos: Photos,
  pricing: Pricing,
  availability: Policies,
  calendar: Calendar,
  readiness: Readiness,
};

export default function EditorStep({ stepId, ...props }) {
  const Component = STEP_COMPONENTS[stepId];
  return Component ? <Component {...props} /> : null;
}
