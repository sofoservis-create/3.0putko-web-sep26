// utils/requestToBookEmails.js
//
// The four messages the request-to-book flow sends.
//
// None of them throw. A booking request that was recorded must not be rolled
// back because SMTP was briefly unreachable, so every sender logs its failure
// and returns false; the caller decides whether that matters.

import { getTransporter, MAIL_FROM } from "./mailer.js";
import {
  brandShell,
  button,
  callout,
  esc,
  section,
  logoAttachments,
  SITE,
  INK,
  MUTED,
  TEAL,
  HAIRLINE,
  FOREST,
} from "./emailLayout.js";
import { onboardingStepsHtml } from "./hostOnboardingSteps.js";

const money = (cents, currency = "eur") =>
  new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: (currency || "eur").toUpperCase(),
  }).format((Number(cents) || 0) / 100);

const day = (date) =>
  date
    ? new Date(date).toLocaleDateString("sk-SK", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";

/** The stay, as a small table. Used in every message so the facts never drift. */
const stayTable = (reservation, listingName) => {
  const rows = [
    [listingName ? "Ubytovanie" : null, listingName],
    ["Termín", `${day(reservation.checkInDate)} – ${day(reservation.checkOutDate)}`],
    ["Počet hostí", String(reservation.numberOfPersons || 1)],
    ["Suma", money(reservation.totalPriceCents, reservation.currency)],
  ].filter(([label]) => label);

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
           style="margin:8px 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;">
      ${rows
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding:7px 12px 7px 0;color:${MUTED};white-space:nowrap;">${esc(label)}</td>
          <td style="padding:7px 0;color:${INK};font-weight:bold;">${esc(value)}</td>
        </tr>`
        )
        .join("")}
    </table>`;
};

const send = async (options, label) => {
  try {
    await getTransporter().sendMail({
      from: MAIL_FROM,
      attachments: logoAttachments(),
      ...options,
    });
    return true;
  } catch (err) {
    console.error(`[request-to-book] ${label} email failed:`, err.message);
    return false;
  }
};

/**
 * To the HOST: a real booking is waiting, and the only thing standing between
 * them and the money is onboarding.
 *
 * The amount is in the subject line on purpose. "You have a €340 booking" is a
 * far stronger reason to finish setting up payouts than a reminder to complete
 * a profile, and that is the entire point of this flow.
 *
 * `onboarding` is the object from `hostOnboardingGuidance()`. When the host
 * cannot be paid yet — in ANY listing status, including PUBLISHED, where the
 * missing piece is billing details rather than Stripe — the mail carries the
 * actual sequence of steps, with the ones already behind them ticked off. That
 * matters because this is the one message such a host is guaranteed to open:
 * telling them only that "something is missing" spends the strongest nudge the
 * product has on a sentence they cannot act on.
 *
 * `needsOnboarding` remains accepted on its own so an older caller that has no
 * guidance object still produces the short version rather than throwing.
 */
export const sendHostBookingRequestEmail = async ({
  to,
  reservation,
  listingName,
  hostName,
  needsOnboarding,
  onboarding = null,
}) => {
  const amount = money(reservation.totalPriceCents, reservation.currency);
  const dates = `${day(reservation.checkInDate)} – ${day(reservation.checkOutDate)}`;
  const link = `${SITE}/Profile?tab=reservation`;
  const payoutsLink = `${SITE}/Profile?tab=payments`;

  // The guidance object is the authority when it is present: it is computed
  // from the same blockers the accept endpoint enforces, so the mail cannot
  // promise a one-click approval the API will then refuse.
  const blocked = onboarding ? onboarding.needsOnboarding : Boolean(needsOnboarding);

  // Two quite different messages behind one subject line. An onboarded host has
  // nothing to connect, and telling them to "connect a payout account" reads as
  // a bug — so they are simply asked to approve the guest.
  const onboardingBlock = blocked
    ? `
      ${callout(
        `<strong>${esc(
          onboarding?.headline ||
            "Na prijatie žiadosti potrebujete pripojiť výplatný účet."
        )}</strong><br />
         Po dokončení žiadosť prijmete jedným kliknutím a hosťovi automaticky
         odošleme platobný odkaz.`,
        "warning"
      )}
      ${
        onboarding?.steps?.length
          ? section("Ako to dokončíte", onboardingStepsHtml(onboarding.steps, {
              ink: INK,
              muted: MUTED,
              teal: TEAL,
              hairline: HAIRLINE,
            }))
          : ""
      }
      ${button(payoutsLink, onboarding?.ctaLabel || "Pripojiť účet a prijať žiadosť")}
      <p style="margin:0 0 14px 0;color:${MUTED};font-size:13px;">
        Žiadosť vám medzitým nikam nezmizne — nájdete ju v profile v sekcii
        <strong>Rezervácie</strong>.
      </p>`
    : `
      ${callout(
        `Žiadosť prijmete alebo odmietnete v sekcii <strong>Rezervácie</strong>.
         Po prijatí hosťovi odošleme platobný odkaz s platnosťou 24 hodín —
         rezervácia je potvrdená až po zaplatení.`
      )}
      ${button(link, "Zobraziť žiadosť")}`;

  const bodyHtml = `
    <p style="margin:0 0 14px 0;">Dobrý deň${hostName ? ` ${esc(hostName)}` : ""},</p>
    <p style="margin:0 0 16px 0;">
      Máte novú žiadosť o rezerváciu na <strong>${amount}</strong>.
    </p>
    ${stayTable(reservation, listingName)}
    ${onboardingBlock}
    <p style="margin:0 0 8px 0;color:${MUTED};font-size:14px;">
      Hosť zatiaľ nič nezaplatil a termín nie je blokovaný. Ak neodpoviete do 48 hodín,
      žiadosť automaticky vyprší.
    </p>`;

  return send(
    {
      to,
      subject: `Máte žiadosť o rezerváciu — ${dates}, ${amount}`,
      html: brandShell({
        preheader: `${dates} · ${reservation.numberOfPersons} hostia · ${amount}`,
        title: "Nová žiadosť o rezerváciu",
        bodyHtml,
      }),
    },
    "host-request"
  );
};

/** To the GUEST: the request is in, nothing has been charged. */
export const sendGuestRequestReceivedEmail = async ({ to, reservation, listingName }) => {
  const bodyHtml = `
    <p style="margin:0 0 14px 0;">Dobrý deň${reservation.name ? ` ${esc(reservation.name)}` : ""},</p>
    <p style="margin:0 0 16px 0;">
      Vašu žiadosť o rezerváciu sme odoslali hostiteľovi. <strong>Zatiaľ ste nič nezaplatili.</strong>
    </p>
    ${stayTable(reservation, listingName)}
    ${callout(
      `Hostiteľ má 48 hodín na odpoveď. Keď žiadosť prijme, pošleme vám platobný odkaz
       a rezervácia bude potvrdená až po zaplatení. Termín zatiaľ nie je blokovaný.`
    )}
    <p style="margin:0;color:${MUTED};font-size:14px;">
      Číslo žiadosti: ${esc(String(reservation._id))}
    </p>`;

  return send(
    {
      to,
      subject: "Vaša žiadosť o rezerváciu bola odoslaná",
      html: brandShell({
        preheader: "Zatiaľ ste nič nezaplatili — čakáme na odpoveď hostiteľa.",
        title: "Žiadosť odoslaná",
        bodyHtml,
      }),
    },
    "guest-request-received"
  );
};

/** To the GUEST: approved — here is the payment link, valid 24 hours. */
export const sendGuestPaymentLinkEmail = async ({
  to,
  reservation,
  listingName,
  paymentUrl,
  expiresAt,
}) => {
  const bodyHtml = `
    <p style="margin:0 0 14px 0;">Dobrý deň${reservation.name ? ` ${esc(reservation.name)}` : ""},</p>
    <p style="margin:0 0 16px 0;">
      Dobrá správa — hostiteľ vašu žiadosť <strong>prijal</strong>. Rezerváciu potvrdíte zaplatením.
    </p>
    ${stayTable(reservation, listingName)}
    ${button(paymentUrl, "Zaplatiť a potvrdiť rezerváciu")}
    ${callout(
      `Odkaz je platný do <strong>${esc(
        new Date(expiresAt).toLocaleString("sk-SK")
      )}</strong>. Termín je pre vás držaný do zaplatenia — po vypršaní odkazu sa uvoľní.`,
      "warning"
    )}
    <p style="margin:0;color:${MUTED};font-size:13px;word-break:break-all;">
      Ak tlačidlo nefunguje, otvorte tento odkaz:<br />${esc(paymentUrl)}
    </p>`;

  return send(
    {
      to,
      subject: "Vaša rezervácia bola prijatá — zostáva zaplatiť",
      html: brandShell({
        preheader: "Hostiteľ prijal vašu žiadosť. Platobný odkaz je platný 24 hodín.",
        title: "Žiadosť prijatá",
        bodyHtml,
      }),
    },
    "guest-payment-link"
  );
};

/**
 * To the GUEST: declined, or lapsed after 48 hours.
 *
 * Both cases end the same way for the guest, so both offer somewhere to go
 * next rather than a dead end.
 */
export const sendGuestRequestClosedEmail = async ({
  to,
  reservation,
  listingName,
  reason = "declined",
  hostMessage,
}) => {
  const expired = reason === "expired";
  const searchLink = `${SITE}/listings`;

  const bodyHtml = `
    <p style="margin:0 0 14px 0;">Dobrý deň${reservation.name ? ` ${esc(reservation.name)}` : ""},</p>
    <p style="margin:0 0 16px 0;">
      ${
        expired
          ? "Hostiteľ na vašu žiadosť o rezerváciu neodpovedal, preto jej platnosť vypršala."
          : "Hostiteľ vašu žiadosť o rezerváciu, žiaľ, nemohol prijať."
      }
      <strong>Nič vám nebolo účtované.</strong>
    </p>
    ${stayTable(reservation, listingName)}
    ${hostMessage ? callout(`<em>${esc(hostMessage)}</em>`) : ""}
    <p style="margin:16px 0 0 0;">
      Na rovnaký termín máme ďalšie voľné ubytovania — pozrite si ich a rezervujte okamžite.
    </p>
    ${button(searchLink, "Zobraziť voľné ubytovania")}`;

  return send(
    {
      to,
      subject: expired
        ? "Platnosť vašej žiadosti o rezerváciu vypršala"
        : "Vaša žiadosť o rezerváciu bola zamietnutá",
      html: brandShell({
        preheader: "Nič vám nebolo účtované.",
        title: expired ? "Žiadosť vypršala" : "Žiadosť zamietnutá",
        bodyHtml,
      }),
    },
    "guest-request-closed"
  );
};
