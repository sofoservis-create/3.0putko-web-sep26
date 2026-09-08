import {
  SITE,
  TEAL_LIGHT,
  MUTED,
  esc,
  brandShell,
  button,
  callout,
  logoAttachments,
  TEXT_SIGNOFF,
} from "./emailLayout.js";

/**
 * The verification link email.
 *
 * @param {object} options
 *   name            the registrant's first name, optional
 *   verificationUrl the full link, built by the caller
 *   expiresInHours  how long the token stays valid (matches the JWT expiry)
 */
export function buildEmailVerificationEmail({
  name,
  verificationUrl,
  expiresInHours = 1,
} = {}) {
  const subject = "Potvrďte svoju e-mailovú adresu – Putko.sk";

  const greetingName = (name || "").trim();
  const greeting = greetingName ? `Vážený/á ${greetingName},` : "Vážený/á zákazník,";

  const text = `${greeting}

ďakujeme za registráciu na Putko.sk. Na dokončenie registrácie potvrďte svoju e-mailovú adresu.

Potvrdíte ju na tejto adrese:
${verificationUrl}

Platnosť odkazu: ${expiresInHours} hodina od odoslania tohto e-mailu. Po jej uplynutí si vyžiadajte nový.

Ak ste sa neregistrovali, tento e-mail môžete ignorovať — bez potvrdenia sa účet neaktivuje.

Ak potrebujete pomoc, napíšte nám na support@putko.sk.

${TEXT_SIGNOFF}`;

  const html = brandShell({
    preheader: "Potvrďte svoju e-mailovú adresu a dokončite registráciu na Putko.sk.",
    title: "Potvrďte svoju e-mailovú adresu",
    bodyHtml: `
    <p style="margin:0 0 16px 0;">${esc(greeting)}</p>

    <p style="margin:0 0 8px 0;">
      ďakujeme za registráciu na <strong>Putko.sk</strong>. Na dokončenie registrácie
      potvrďte svoju e-mailovú adresu kliknutím na tlačidlo nižšie.
    </p>

    ${button(verificationUrl, "Potvrdiť e-mailovú adresu")}

    ${callout(
      `<strong>Platnosť odkazu je ${expiresInHours} hodina.</strong> Po jej uplynutí si vyžiadajte nový.`
    )}

    <p style="margin:20px 0 8px 0;font-size:14px;color:${MUTED};">
      Ak tlačidlo nefunguje, skopírujte do prehliadača túto adresu:
    </p>
    <p style="margin:0 0 20px 0;font-size:13px;word-break:break-all;">
      <a href="${verificationUrl}" style="color:${TEAL_LIGHT};">${esc(verificationUrl)}</a>
    </p>

    <p style="margin:0 0 16px 0;">
      Ak ste sa <strong>neregistrovali</strong>, tento e-mail môžete ignorovať — bez
      potvrdenia sa účet neaktivuje.
    </p>

    <p style="margin:0;">
      Potrebujete pomoc? Napíšte nám na
      <a href="mailto:support@putko.sk" style="color:${TEAL_LIGHT};">support@putko.sk</a>.
    </p>`,
  });

  return { subject, html, text, attachments: logoAttachments() };
}

/** Confirmation that the address has been verified and the account is active. */
export function buildEmailVerifiedEmail({ name } = {}) {
  const subject = "E-mailová adresa bola potvrdená – Putko.sk";

  const greetingName = (name || "").trim();
  const greeting = greetingName ? `Vážený/á ${greetingName},` : "Vážený/á zákazník,";

  const text = `${greeting}

vaša e-mailová adresa bola úspešne potvrdená a váš účet na Putko.sk je aktívny.

Teraz sa môžete prihlásiť a začať:
${SITE}/login

Ak potrebujete pomoc, napíšte nám na support@putko.sk.

${TEXT_SIGNOFF}`;

  const html = brandShell({
    preheader: "Vaša e-mailová adresa bola potvrdená — účet na Putko.sk je aktívny.",
    title: "E-mailová adresa bola potvrdená",
    bodyHtml: `
    <p style="margin:0 0 16px 0;">${esc(greeting)}</p>

    <p style="margin:0 0 8px 0;">
      vaša e-mailová adresa bola úspešne potvrdená a váš účet na <strong>Putko.sk</strong>
      je aktívny. Teraz sa môžete prihlásiť a začať.
    </p>

    ${button(`${SITE}/login`, "Prihlásiť sa")}

    <p style="margin:0;">
      Potrebujete pomoc? Napíšte nám na
      <a href="mailto:support@putko.sk" style="color:${TEAL_LIGHT};">support@putko.sk</a>.
    </p>`,
  });

  return { subject, html, text, attachments: logoAttachments() };
}
