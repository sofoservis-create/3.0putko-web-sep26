import fs from "fs";
import path from "path";

export const SITE = (process.env.EMAIL_SITE_URL || "https://putko.sk").replace(/\/+$/, "");

// Brand palette, taken from the frontend (tailwind classes and the logo).
export const FOREST = "#1E3E2B";     // deep green — headings, footer
export const TEAL = "#238869";       // primary green — buttons, accents
export const TEAL_LIGHT = "#319A81"; // links
export const GOLD = "#DFBA73";       // accent rule, warning callouts
export const INK = "#2A2A2A";        // body copy
export const MUTED = "#6B7280";      // secondary copy
export const PAGE_BG = "#F4F6F4";
export const HAIRLINE = "#E4E9E5";

const LOGO_CID = "putko-logo";

const LOGO_FILE = (() => {
  const candidates = [
    process.env.EMAIL_LOGO_PATH,
    path.resolve(process.cwd(), "assets/putko.png"),
    path.resolve(process.cwd(), "../frontend/public/putko.png"),
    path.resolve(process.cwd(), "public/putko.png"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      /* unreadable path — try the next candidate */
    }
  }

  console.warn(
    "[emailLayout] logo file not found; falling back to the hosted image. " +
      "Set EMAIL_LOGO_PATH to embed it."
  );
  return null;
})();

/** Escapes a value before it goes into the HTML body. */
export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Attachment list carrying the inline logo; pass straight to sendMail. */
export const logoAttachments = () =>
  LOGO_FILE ? [{ filename: "putko.png", path: LOGO_FILE, cid: LOGO_CID }] : [];

const logoSrc = () => (LOGO_FILE ? `cid:${LOGO_CID}` : `${SITE}/putko.png`);

/** A green call-to-action button, centred. */
export function button(href, label) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding:22px 0 24px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" bgcolor="${TEAL}" style="border-radius:8px;">
                <a href="${href}"
                   style="display:inline-block;padding:14px 34px;font-family:Arial,Helvetica,sans-serif;
                          font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;
                          border-radius:8px;">${esc(label)}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

/**
 * A highlighted note box.
 * @param {"info"|"warning"} tone  green left border, or gold for warnings
 */
export function callout(innerHtml, tone = "info") {
  const bg = tone === "warning" ? "#FDF4E7" : "#F1F7F3";
  const bar = tone === "warning" ? GOLD : TEAL;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
           style="background-color:${bg};border-left:4px solid ${bar};border-radius:6px;">
      <tr>
        <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;
                   line-height:1.6;color:${INK};">${innerHtml}</td>
      </tr>
    </table>`;
}

/** The plain-text sign-off, shared by every message. */
export const TEXT_SIGNOFF = `S pozdravom,
Tím podpory Putko
support@putko.sk
${SITE}`;

/**
 * Wraps body content in the branded shell.
 *
 * @param {object} options
 *   preheader  inbox preview line, hidden in the body itself
 *   title      the <h1>
 *   bodyHtml   markup for the message body (already escaped by the caller)
 */
export function brandShell({ preheader, title, bodyHtml }) {
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
       style="background-color:${PAGE_BG};margin:0;padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"
             style="width:100%;max-width:600px;background-color:#ffffff;border-radius:12px;
                    overflow:hidden;border:1px solid ${HAIRLINE};">

        <!-- Header. White, not the brand green: the logo is teal on transparent,
             and showing it on a dark band needs a CSS filter, which Gmail and
             Outlook strip. The green carries the footer instead. -->
        <tr>
          <td align="center" bgcolor="#FFFFFF" style="padding:30px 24px 26px 24px;">
            <img src="${logoSrc()}" alt="Putko" width="150"
                 style="display:block;width:150px;max-width:70%;height:auto;border:0;" />
          </td>
        </tr>

        <tr><td bgcolor="${GOLD}" style="height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>

        <tr>
          <td style="padding:32px 32px 28px 32px;font-family:Arial,Helvetica,sans-serif;
                     font-size:15px;line-height:1.65;color:${INK};">
            <h1 style="margin:0 0 18px 0;font-size:22px;line-height:1.3;color:${FOREST};
                       font-weight:bold;">${esc(title)}</h1>
            ${bodyHtml}
          </td>
        </tr>

        <tr>
          <td align="center" bgcolor="${FOREST}" style="padding:24px 24px;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;
                        color:#ffffff;padding-bottom:6px;">Putko.sk</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;padding-bottom:10px;">
              <a href="${SITE}" style="color:${GOLD};text-decoration:none;">putko.sk</a>
              <span style="color:#4C6B58;">&nbsp;•&nbsp;</span>
              <a href="mailto:support@putko.sk" style="color:${GOLD};text-decoration:none;">Podpora</a>
            </div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;
                        color:#A9C6B4;">
              Tento e-mail ste dostali, pretože máte účet na Putko.sk.
            </div>
          </td>
        </tr>

      </table>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUTED};
                  padding-top:14px;">© ${new Date().getFullYear()} Putko.sk</div>
    </td>
  </tr>
</table>`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Shared body pieces
 *
 * Every message was previously hand-rolling its own headings and label/value
 * rows, in a different style each time — and several were coloured #FF5A5F,
 * which is Airbnb's red rather than any Putko colour. These are the pieces that
 * kept being rewritten, so a message now composes rather than restyles.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * A label/value block — check-in, guest name, total, and so on.
 *
 * @param {Array<[string, string]|null|false>} rows  [label, value] pairs.
 *   Falsy entries are dropped, so a caller can inline `cond && [l, v]` rather
 *   than building the array conditionally.
 * @param {object} [options]
 * @param {boolean} [options.rawValues]  values are pre-built HTML (a link, say)
 *   rather than text. Off by default: everything is escaped unless asked.
 */
export function detailTable(rows, { rawValues = false } = {}) {
  const cells = (rows || []).filter(Boolean);
  if (!cells.length) return "";

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
           style="margin:6px 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;">
      ${cells
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding:7px 14px 7px 0;color:${MUTED};white-space:nowrap;
                     vertical-align:top;">${esc(label)}</td>
          <td style="padding:7px 0;color:${INK};font-weight:bold;">${
            rawValues ? value : esc(value)
          }</td>
        </tr>`
        )
        .join("")}
    </table>`;
}

/** A titled block, so sections read consistently across every message. */
export function section(title, innerHtml) {
  return `
    <div style="margin:22px 0 0 0;">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;
                  letter-spacing:.06em;text-transform:uppercase;color:${TEAL_LIGHT};
                  padding-bottom:6px;border-bottom:1px solid ${HAIRLINE};margin-bottom:10px;">
        ${esc(title)}
      </div>
      ${innerHtml}
    </div>`;
}

/**
 * The property photo at the top of a booking message.
 *
 * Returns nothing without a src — an empty <img> renders as a broken-image icon
 * in most clients, which looks worse than no photo at all.
 */
export function heroImage(src, alt = "") {
  if (!src) return "";
  return `
    <img src="${esc(src)}" alt="${esc(alt)}" width="552"
         style="display:block;width:100%;max-width:552px;height:auto;border:0;
                border-radius:10px;margin:0 0 20px 0;" />`;
}
