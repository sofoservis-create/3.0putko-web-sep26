// One source of truth for what Putko says about payouts. Editor Step 9 and
// the `/host/payouts` page both read from here so they can never disagree:
// no payout provider is connected (Stripe Connect is not implemented), so
// nothing is collected from travellers and nothing is paid out.

const t = (language, en, sk) => (language === "en" ? en : sk);

export const payoutStatusCopy = (language) => ({
  badge: t(language, "Not connected", "Nepripojené"),
  summary: t(
    language,
    "Putko does not process payouts yet, and no payout account (Stripe) is connected to your host account. Nothing is collected from travellers and nothing is paid out.",
    "Putko zatiaľ nespracúva výplaty a k vášmu hostiteľskému účtu nie je pripojený žiadny výplatný účet (Stripe). Od cestovateľov sa nič nevyberá a nič sa nevypláca.",
  ),
  next: t(
    language,
    "You can finish and publish listings now. Before paid bookings open, you will set up one payout account for your host profile; it will apply to all your listings.",
    "Ponuky môžete dokončiť a zverejniť už teraz. Pred spustením platených rezervácií si nastavíte jeden výplatný účet vo svojom hostiteľskom profile; bude platiť pre všetky vaše ponuky.",
  ),
  noButton: t(
    language,
    "There is nothing to connect yet. This page will offer the setup once payouts are available, and we will let you know.",
    "Zatiaľ nie je čo pripojiť. Keď budú výplaty dostupné, nastavenie sa objaví na tejto stránke a dáme vám vedieť.",
  ),
});

/** Copy for the machine-readable requirement codes the server lists. */
export const payoutRequirementCopy = (code, language) => {
  switch (code) {
    case "payout_provider":
      return {
        title: t(language, "Payout provider", "Poskytovateľ výplat"),
        body: t(language, "Putko will connect a payment provider (planned: Stripe) to collect and pay out bookings.", "Putko pripojí platobného poskytovateľa (plánovaný: Stripe) na výber a vyplácanie rezervácií."),
      };
    case "identity":
      return {
        title: t(language, "Identity verification", "Overenie totožnosti"),
        body: t(language, "The provider will ask for your legal name, date of birth and an ID document, or company details if you host as a business.", "Poskytovateľ si vyžiada vaše meno, dátum narodenia a doklad totožnosti, prípadne firemné údaje, ak prenajímate ako firma."),
      };
    case "bank_account":
      return {
        title: t(language, "Bank account", "Bankový účet"),
        body: t(language, "An IBAN in your name where payouts will arrive.", "IBAN na vaše meno, na ktorý budú výplaty prichádzať."),
      };
    case "listing_assignment":
      return {
        title: t(language, "One account for all listings", "Jeden účet pre všetky ponuky"),
        body: t(language, "The verified account is set once at host level and every listing uses it.", "Overený účet nastavíte raz na úrovni hostiteľa a použije sa pre všetky ponuky."),
      };
    default:
      return { title: String(code), body: "" };
  }
};

export const payoutErrorText = (error, language) => {
  if (error?.status === 401) return t(language, "Your session has expired. Log in again.", "Platnosť relácie vypršala. Prihláste sa znova.");
  if (error?.status === 403) return t(language, "Only hosts can see payout readiness.", "Stav výplat vidia len hostitelia.");
  return t(language, "Check your connection and try again.", "Skontrolujte pripojenie a skúste to znova.");
};
