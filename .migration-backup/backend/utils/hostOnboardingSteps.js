// utils/hostOnboardingSteps.js
//
// What a host still has to do before Putko can pay them — as a list a person
// can act on, rather than the machine-readable blocker codes the gates return.
//
// This exists because of one thing the request-to-book flow does: it emails a
// host a REAL booking for a REAL amount while they are still un-onboarded. That
// email is the strongest nudge the product has, and it was spending it on a
// single sentence ("you need to connect a payout account"). A host who reads
// that still has to work out what "connect" means, what Stripe will ask for,
// and why their listing is not taking payments.
//
// So the steps are spelled out, and they are spelled out for EVERY listing
// status, not only for a listing with no account attached:
//
//   DRAFT      no account yet — the whole sequence is ahead of them
//   PENDING    account created, Stripe still verifying — name the documents it
//              is waiting for, because that is what stalls at this stage
//   PUBLISHED  Stripe is finished, yet the host can STILL be unable to take a
//              booking: billing details are the third gate, and paying out to a
//              host who cannot be invoiced is the failure the monthly run
//              records as `missing_host_billing_details`
//
// The third case is the one worth being careful about. "PUBLISHED" reads like
// "done", so a naive email would tell such a host nothing at all — they would
// see a request they cannot accept and no explanation anywhere.
//
// Nothing here talks to Stripe. It reads the capabilities the `account.updated`
// webhook already cached, so it is safe to call while rendering an email.

import { LISTING_STATUS, listingStatusFor, pendingRequirementsOf } from "./listingStatus.js";
import { hostBookingBlockers } from "./listingGating.js";
import { missingBillingFieldsOf } from "./hostBilling.js";
import { resolvePayoutAccount } from "./payoutAccounts.js";

/** Host-facing Slovak names for the invoicing fields the gate can report. */
const BILLING_FIELD_LABELS_SK = {
  billing_name: "Fakturačné meno",
  ico: "IČO",
  dic: "DIČ",
  billing_address_street: "Ulica a číslo",
  billing_address_city: "Mesto",
  billing_address_zip: "PSČ",
  billing_address_country: "Krajina",
};

/**
 * Slovak names for the Stripe requirement codes seen most often on an Express
 * account in SK/CZ. Anything unrecognised falls back to the raw code with its
 * dots and underscores opened up — the same treatment the Payments screen gives
 * it — so a code Stripe adds later still renders as words rather than vanishing.
 */
const STRIPE_REQUIREMENT_LABELS_SK = {
  "individual.verification.document": "Doklad totožnosti (občiansky preukaz alebo pas)",
  "individual.verification.additional_document": "Doklad o adrese",
  "individual.id_number": "Rodné číslo / identifikačné číslo",
  "individual.address.line1": "Adresa trvalého pobytu",
  "individual.dob.day": "Dátum narodenia",
  "individual.dob.month": "Dátum narodenia",
  "individual.dob.year": "Dátum narodenia",
  "individual.first_name": "Meno",
  "individual.last_name": "Priezvisko",
  "individual.email": "E-mail",
  "individual.phone": "Telefónne číslo",
  "company.verification.document": "Doklad o registrácii spoločnosti",
  "company.tax_id": "IČ DPH / daňové číslo",
  "company.address.line1": "Sídlo spoločnosti",
  external_account: "Číslo bankového účtu (IBAN) pre výplaty",
  "business_profile.url": "Webová stránka alebo popis podnikania",
  "business_profile.mcc": "Odvetvie podnikania",
  "tos_acceptance.date": "Súhlas s podmienkami Stripe",
  "tos_acceptance.ip": "Súhlas s podmienkami Stripe",
};

export const billingFieldLabelSk = (key) => BILLING_FIELD_LABELS_SK[key] || String(key);

export const stripeRequirementLabelSk = (code) =>
  STRIPE_REQUIREMENT_LABELS_SK[code] || String(code).replace(/[._]/g, " ");

/** Unique, order preserving — Stripe repeats dob.day/month/year, which share one label. */
const uniq = (values) => [...new Set(values)];

/**
 * Everything a host-facing message needs to explain the situation, in one object.
 *
 * `accommodation` is optional and only matters once a host holds several payout
 * accounts: the steps must describe the account THIS listing pays out to, not
 * the host's aggregate state, or a host with one finished account and one new
 * one is told the wrong thing.
 *
 * @param {object|null} host
 * @param {object|null} accommodation
 * @returns {{
 *   status: 'DRAFT'|'PENDING'|'PUBLISHED',
 *   needsOnboarding: boolean,
 *   blockers: string[],
 *   steps: Array<{ key: string, title: string, detail: string, done: boolean }>,
 *   requirements: string[],
 *   missingBilling: string[],
 *   headline: string,
 *   ctaLabel: string
 * }}
 */
export function hostOnboardingGuidance(host, accommodation = null) {
  const status = listingStatusFor(accommodation, host);
  const account = resolvePayoutAccount(accommodation, host);
  const blockers = hostBookingBlockers(host);
  const needsOnboarding = blockers.length > 0;

  const hasAccount = Boolean(account?.accountId || host?.stripeAccountId);
  const stripeVerified =
    hasAccount &&
    !blockers.includes("stripe_charges_disabled") &&
    !blockers.includes("stripe_payouts_disabled");
  const billingDone = !blockers.includes("billing_details_incomplete");
  const missingBilling = missingBillingFieldsOf(host).filter((f) => f !== "host_not_found");

  // Requirements only mean anything while Stripe is still verifying. On a
  // finished account the cached list is empty anyway, but gating on
  // `stripeVerified` keeps a stale value from being read back to a host who is
  // already done.
  const requirements = stripeVerified ? [] : uniq(pendingRequirementsOf(host, accommodation));

  const steps = [
    {
      key: "connect",
      title: "Pripojte výplatný účet",
      detail: hasAccount
        ? "Účet je pripojený."
        : "V profile v sekcii <strong>Platby</strong> kliknite na <strong>Pripojiť účet</strong>. " +
          "Presmerujeme vás na Stripe, nášho platobného partnera — registrácia je " +
          "bezplatná a trvá približne 5 minút.",
      done: hasAccount,
    },
    {
      key: "verify",
      title: "Dokončite overenie u Stripe",
      detail: stripeVerified
        ? "Overenie je dokončené — Stripe povolil platby aj výplaty."
        : requirements.length
          ? "Stripe od vás ešte potrebuje: " +
            uniq(requirements.map(stripeRequirementLabelSk))
              .map((label) => `<strong>${label}</strong>`)
              .join(", ") +
            ". Doplníte to priamo u Stripe cez tlačidlo nižšie."
          : "Stripe si vyžiada doklad totožnosti, dátum narodenia, adresu a číslo účtu " +
            "(IBAN), na ktorý vám budú chodiť výplaty. Overenie zvyčajne prebehne do " +
            "niekoľkých minút, výnimočne do jedného pracovného dňa.",
      done: stripeVerified,
    },
    {
      key: "billing",
      title: "Doplňte fakturačné údaje",
      detail: billingDone
        ? "Fakturačné údaje sú kompletné."
        : "Potrebujeme ich, aby sme vám mohli vystaviť faktúru za províziu Putko. " +
          (missingBilling.length
            ? "Chýba: " +
              missingBilling.map((f) => `<strong>${billingFieldLabelSk(f)}</strong>`).join(", ") +
              "."
            : "Vyplníte ich v profile v sekcii <strong>Platby</strong>."),
      done: billingDone,
    },
  ];

  return {
    status,
    needsOnboarding,
    blockers,
    steps,
    requirements,
    missingBilling,
    headline: headlineFor(status, { hasAccount, stripeVerified, billingDone }),
    ctaLabel: hasAccount ? "Dokončiť nastavenie výplat" : "Pripojiť výplatný účet",
  };
}

/**
 * One sentence naming where the host actually stands, per listing status.
 *
 * Written so the PUBLISHED-but-blocked case does not read as a contradiction:
 * the listing IS live, and what is missing is invoicing data, which has nothing
 * to do with Stripe.
 */
function headlineFor(status, { hasAccount, stripeVerified, billingDone }) {
  if (stripeVerified && billingDone) {
    return "Vaše výplaty sú nastavené — žiadosť môžete prijať hneď.";
  }

  if (stripeVerified && !billingDone) {
    return (
      "Platby máte nastavené, chýbajú už len fakturačné údaje. Bez nich vám nevieme " +
      "vystaviť faktúru za províziu, a preto žiadosť zatiaľ nemôžete prijať."
    );
  }

  if (status === LISTING_STATUS.PENDING || hasAccount) {
    return (
      "Váš výplatný účet je pripojený, ale Stripe ešte nedokončil overenie. Kým sa " +
      "overenie nedokončí, nemáme kam poslať peniaze za túto rezerváciu."
    );
  }

  return (
    "Vaše ubytovanie zatiaľ nemá pripojený výplatný účet, takže táto rezervácia " +
    "nemôže byť zaplatená. Nastavenie zaberie približne 5 minút."
  );
}

/**
 * The steps as email HTML — a numbered list with the finished ones ticked off,
 * so a host part-way through sees what they have already done rather than the
 * whole sequence again.
 *
 * Table-based on purpose: Outlook drops the margins on `<ol>` and the list
 * collapses into the paragraph above it.
 */
export function onboardingStepsHtml(
  steps,
  { ink = "#2A2A2A", muted = "#6B7280", teal = "#238869", hairline = "#E4E9E5" } = {}
) {
  const rows = (steps || [])
    .map((step, index) => {
      const marker = step.done ? "&#10003;" : String(index + 1);
      const markerBg = step.done ? teal : hairline;
      const markerColor = step.done ? "#ffffff" : ink;
      const titleColor = step.done ? muted : ink;

      return `
        <tr>
          <td valign="top" width="36" style="padding:0 12px 14px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" width="24" height="24" bgcolor="${markerBg}"
                    style="border-radius:12px;font-family:Arial,Helvetica,sans-serif;
                           font-size:13px;font-weight:bold;color:${markerColor};
                           line-height:24px;">${marker}</td>
              </tr>
            </table>
          </td>
          <td valign="top" style="padding:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;
                     font-size:14px;line-height:1.6;color:${ink};">
            <strong style="color:${titleColor};">${step.title}</strong><br />
            <span style="color:${muted};">${step.detail}</span>
          </td>
        </tr>`;
    })
    .join("");

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
           style="margin:6px 0 2px 0;">
      ${rows}
    </table>`;
}
