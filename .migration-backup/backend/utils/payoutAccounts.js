// utils/payoutAccounts.js
//
// Which connected account does a given listing pay out to?
//
// A host may hold several. One account across every property is the common
// case; a separate account per property is the reason this exists — an owner
// with an apartment in their own name and a chalet under a company needs both,
// and the money has to land in the right one.
//
// Every caller that moves money, or decides whether money CAN be moved, resolves
// through here. Duplicating the fallback rule is how a booking ends up paying
// the wrong account.

/**
 * The host's accounts as a list, including the legacy single account.
 *
 * A host onboarded before `stripeAccounts` existed has only `stripeAccountId`
 * and the top-level capability fields. Presenting that as a one-entry list means
 * nothing downstream needs to know which era a host belongs to.
 *
 * @param {object|null} host
 * @returns {Array<{accountId, label, chargesEnabled, payoutsEnabled, requirementsDue, isDefault}>}
 */
export function listPayoutAccounts(host) {
  if (!host) return [];

  const accounts = (host.stripeAccounts || [])
    .filter((a) => a?.accountId)
    .map((a) => ({
      accountId: a.accountId,
      label: a.label || "",
      chargesEnabled: Boolean(a.chargesEnabled),
      payoutsEnabled: Boolean(a.payoutsEnabled),
      // Undefined rather than false when never synced — `isAccountPayoutReady`
      // distinguishes the two, and coercing here would erase that.
      transfersActive: a.transfersActive,
      requirementsDue: a.requirementsDue || [],
      pastDue: a.pastDue || [],
      pendingVerification: a.pendingVerification || [],
      eventuallyDue: a.eventuallyDue || [],
      disabledReason: a.disabledReason || null,
      requirementErrors: a.requirementErrors || [],
      currentDeadline: a.currentDeadline || null,
      futureDue: a.futureDue || [],
      futureDeadline: a.futureDeadline || null,
      payoutState: a.payoutState || null,
      statusUpdatedAt: a.statusUpdatedAt || null,
      payoutIban: a.payoutIban || null,
      connectedAt: a.connectedAt || null,
      isDefault: host.stripeAccountId === a.accountId,
    }));

  // The default account may predate the list. Fold it in from the top-level
  // fields rather than showing a host an empty dropdown next to a working
  // account.
  if (host.stripeAccountId && !accounts.some((a) => a.accountId === host.stripeAccountId)) {
    accounts.unshift({
      accountId: host.stripeAccountId,
      label: "",
      chargesEnabled: Boolean(host.chargesEnabled),
      payoutsEnabled: Boolean(host.payoutsEnabled),
      transfersActive: host.stripeTransfersActive,
      requirementsDue: host.stripeRequirementsDue || [],
      pastDue: host.stripePastDue || [],
      pendingVerification: [],
      eventuallyDue: [],
      disabledReason: host.stripeDisabledReason || null,
      requirementErrors: [],
      currentDeadline: null,
      futureDue: [],
      futureDeadline: null,
      payoutState: host.stripePayoutState || null,
      statusUpdatedAt: host.stripeStatusUpdatedAt || null,
      payoutIban: host.payoutIban || null,
      connectedAt: null,
      isDefault: true,
    });
  }

  // Most recently connected first — the spec asks for the newest to be
  // pre-selected in the add form, and a host who has just connected an account
  // is almost always connecting it FOR the listing they are creating.
  return accounts.sort((a, b) => {
    if (a.isDefault !== b.isDefault && !a.connectedAt && !b.connectedAt) {
      return a.isDefault ? -1 : 1;
    }
    return new Date(b.connectedAt || 0) - new Date(a.connectedAt || 0);
  });
}

/**
 * The account a listing actually pays out to.
 *
 * Falls back to the host's default when the listing names none — and ALSO when
 * it names one the host no longer holds. The second case matters: an account id
 * left on a listing after the host disconnected it would otherwise send money
 * to an account this platform may not even control.
 *
 * @param {object|null} accommodation
 * @param {object|null} host
 * @returns {object|null} the resolved account, or null when there is none
 */
export function resolvePayoutAccount(accommodation, host) {
  const accounts = listPayoutAccounts(host);
  if (!accounts.length) return null;

  const named = accommodation?.payoutStripeAccountId;
  if (named) {
    const match = accounts.find((a) => a.accountId === named);
    if (match) return match;
    console.warn(
      `[payout-accounts] listing ${accommodation?._id} names account ${named}, ` +
        `which host ${host?._id} does not hold — falling back to the default`
    );
  }

  return accounts.find((a) => a.isDefault) || accounts[0];
}

/** Just the id, for the many callers that only need a transfer destination. */
export function resolvePayoutAccountId(accommodation, host) {
  return resolvePayoutAccount(accommodation, host)?.accountId || null;
}

/**
 * Is this specific account ready to receive money?
 *
 * Deliberately per-account. With several accounts a host-level "payouts
 * enabled" is meaningless — one account can be verified while another is still
 * waiting on an ID document.
 *
 * The rule is `payoutsEnabled && transfersActive`, NOT the former
 * `chargesEnabled && payoutsEnabled`.
 *
 * Putko charges the guest on the platform account and moves the host's share
 * with `transfers.create`, so `transfers` is the only capability a host account
 * needs — and since the platform stopped requesting `card_payments` (which was
 * what dragged hosts into Stripe's "Restricted" state for a payment method they
 * never accept), `charges_enabled` is permanently false on newly connected
 * accounts. Gating on it would refuse every host onboarded from now on.
 *
 * `transfersActive` is undefined on accounts that have not been synced since
 * that change, so those fall back to the old rule rather than being locked out
 * of a payout they had already qualified for. The next `account.updated` — or
 * the next staleness refresh — fills it in and the fallback stops applying.
 */
export function isAccountPayoutReady(account) {
  if (!account?.payoutsEnabled) return false;

  if (account.transfersActive === undefined || account.transfersActive === null) {
    return Boolean(account.chargesEnabled);
  }

  return Boolean(account.transfersActive);
}

/**
 * What is standing between this account and a payout, as a short state name.
 *
 * `payoutState` is written by the Stripe sync (utils/stripeHelpers.js ->
 * describeAccountState). This derives the same answer for an account that
 * predates the field, so callers never have to special-case its absence.
 *
 * @returns {'active'|'pending'|'verifying'|'restricted'}
 */
export function payoutStateOf(account) {
  if (!account) return "pending";
  if (isAccountPayoutReady(account)) return "active";
  if (account.payoutState) return account.payoutState;
  if (account.disabledReason || account.pastDue?.length) return "restricted";
  if (account.requirementsDue?.length) return "pending";
  if (account.pendingVerification?.length) return "verifying";
  return "pending";
}
