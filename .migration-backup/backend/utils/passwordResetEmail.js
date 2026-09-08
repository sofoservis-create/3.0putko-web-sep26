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
 * The reset link email.
 *
 * @param {object} options
 *   resetUrl        the full link, built by the caller
 *   expiresInHours  how long the link stays valid (matches resetPasswordExpires)
 */
export function buildPasswordResetEmail({ resetUrl, expiresInHours = 1 } = {}) {
  const subject = "Obnovenie hesla na Putko.sk";

  const text = `Obnovenie hesla

Dostali sme žiadosť o obnovenie hesla k vášmu účtu na Putko.sk.

Nové heslo si nastavíte na tejto adrese:
${resetUrl}

Platnosť odkazu: ${expiresInHours} hodina od odoslania tohto e-mailu.

Ak ste o obnovenie hesla nežiadali, tento e-mail môžete ignorovať — vaše heslo zostáva nezmenené.

Ak potrebujete pomoc, napíšte nám na support@putko.sk.

${TEXT_SIGNOFF}`;

  const html = brandShell({
    preheader: "Odkaz na obnovenie hesla k vášmu účtu na Putko.sk.",
    title: "Obnovenie hesla",
    bodyHtml: `
    <p style="margin:0 0 16px 0;">
      Dostali sme žiadosť o obnovenie hesla k vášmu účtu na <strong>Putko.sk</strong>.
    </p>

    <p style="margin:0 0 8px 0;">
      Kliknutím na tlačidlo nižšie si nastavíte nové heslo.
    </p>

    ${button(resetUrl, "Nastaviť nové heslo")}

    ${callout(
      `<strong>Platnosť odkazu je ${expiresInHours} hodina.</strong> Po jej uplynutí si vyžiadajte nový.`
    )}

    <p style="margin:20px 0 8px 0;font-size:14px;color:${MUTED};">
      Ak tlačidlo nefunguje, skopírujte do prehliadača túto adresu:
    </p>
    <p style="margin:0 0 20px 0;font-size:13px;word-break:break-all;">
      <a href="${resetUrl}" style="color:${TEAL_LIGHT};">${esc(resetUrl)}</a>
    </p>

    <p style="margin:0 0 16px 0;">
      Ak ste o obnovenie hesla <strong>nežiadali</strong>, tento e-mail môžete ignorovať —
      vaše heslo zostáva nezmenené.
    </p>

    <p style="margin:0;">
      Potrebujete pomoc? Napíšte nám na
      <a href="mailto:support@putko.sk" style="color:${TEAL_LIGHT};">support@putko.sk</a>.
    </p>`,
  });

  return { subject, html, text, attachments: logoAttachments() };
}

/** Confirmation that the password was actually changed. */
export function buildPasswordResetSuccessEmail() {
  const subject = "Vaše heslo bolo zmenené";

  const text = `Heslo bolo úspešne zmenené

Heslo k vášmu účtu na Putko.sk bolo práve zmenené.

Ak ste túto zmenu vykonali vy, nemusíte robiť nič ďalšie.

Ak ste heslo nemenili, ihneď nás kontaktujte na support@putko.sk — váš účet môže byť ohrozený.

${TEXT_SIGNOFF}`;

  const html = brandShell({
    preheader: "Heslo k vášmu účtu na Putko.sk bolo zmenené.",
    title: "Heslo bolo úspešne zmenené",
    bodyHtml: `
    <p style="margin:0 0 16px 0;">
      Heslo k vášmu účtu na <strong>Putko.sk</strong> bolo práve zmenené.
    </p>

    <p style="margin:0 0 20px 0;">
      Ak ste túto zmenu vykonali vy, nemusíte robiť nič ďalšie.
    </p>

    ${callout(
      `<strong>Nemenili ste heslo?</strong> Ihneď nás kontaktujte na
       <a href="mailto:support@putko.sk" style="color:${TEAL_LIGHT};">support@putko.sk</a> —
       váš účet môže byť ohrozený.`,
      "warning"
    )}

    <p style="margin:20px 0 0 0;">
      <a href="${SITE}/login" style="color:${TEAL_LIGHT};">Prihlásiť sa na Putko.sk</a>
    </p>`,
  });

  return { subject, html, text, attachments: logoAttachments() };
}
