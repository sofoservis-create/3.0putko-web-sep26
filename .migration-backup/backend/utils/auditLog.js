// utils/auditLog.js
//
// One structured line per outbound money call, whatever the provider.
//
// The pre-production checklist requires "comprehensive logging of all Stripe and
// SuperFaktúra API calls for audit". Stripe already had `logStripeCall`;
// SuperFaktúra had nothing, so a failed invoice left only an admin alert and no
// record of what was actually sent. Both now go through here, in the same shape,
// so `[putko-audit]` greps the whole money trail.
//
// Never log credentials or a full request body — the context is deliberately a
// small set of identifiers, not a dump.

/**
 * @param {string} channel   'stripe' | 'superfaktura' | ...
 * @param {string} operation e.g. 'invoices.create'
 * @param {object} context   identifiers only — ids, amounts, periods
 * @param {'ok'|'error'} outcome
 * @param {Error|null} error
 */
export function logExternalCall(channel, operation, context = {}, outcome = "ok", error = null) {
  const entry = {
    at: new Date().toISOString(),
    channel,
    operation,
    outcome,
    ...context,
  };

  if (error) {
    entry.errorCode = error.code || error.type || undefined;
    entry.errorMessage = error.message;
    // Axios puts the provider's own response here; it is what actually explains
    // a SuperFaktúra rejection.
    const providerBody = error.response?.data;
    if (providerBody) {
      entry.providerError =
        typeof providerBody === "string" ? providerBody.slice(0, 500) : providerBody;
    }
  }

  const line = `[putko-audit] ${JSON.stringify(entry)}`;
  if (outcome === "ok") console.log(line);
  else console.error(line);

  return entry;
}
