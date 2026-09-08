import Host from '../models/Host.js';
import mongoose from 'mongoose';
import { validateIban, maskIban, normaliseIban } from '../utils/iban.js';
import { missingBillingFieldsOf } from '../utils/hostBilling.js';
import { syncListingStatusForHost } from '../utils/hostStripeSync.js';

export const updateHost = async (req, res) => {
    const id = req.params.id;

    try {
        const updates = { ...req.body };

        // Fields the host must never set directly — they are mirrored from
        // Stripe or derived, and accepting them from the body would let a host
        // mark their own account as onboarded and payout-enabled.
        //
        // `stripeAccounts` and `stripeTransfersActive` matter as much as the
        // older entries: the payout gate reads the per-account capability flags
        // inside that array (utils/payoutAccounts.js -> isAccountPayoutReady), so
        // a host who could write it could hand themselves a verified account and
        // take bookings Stripe would never settle.
        for (const field of [
            'stripeAccountId',
            'stripeAccounts',
            'stripeAccountIdHistory',
            'chargesEnabled',
            'payoutsEnabled',
            'stripeTransfersActive',
            'onboardingComplete',
            'stripeRequirementsDue',
            'stripePastDue',
            'stripeDisabledReason',
            'stripePayoutState',
            'stripeStatusUpdatedAt',
            'role',
        ]) {
            delete updates[field];
        }

        // An individual is invoiced under their legal name and address, not a
        // stale business registration left from an earlier profile choice.
        if (updates.billingSubjectType === 'individual') {
            updates.ico = '';
            updates.dic = '';
            updates.icDph = '';
            updates.isVatPayer = false;
            updates.vatinParagraph = null;
        }

        // The full IBAN is wanted for the DAC7 filing and cannot be derived from
        // Stripe, so it is collected here — but it is OPTIONAL and never blocks
        // the save. An empty value means "leave whatever is on file alone", and a
        // value that fails the checksum is still stored.
        //
        // The mod-97 check still runs, only its result no longer refuses the
        // request: it decides whether `payoutIbanVerifiedAt` is stamped. So a
        // number that did not verify is on file and visible, and is distinguished
        // from a verified one by that timestamp being null, which is what the
        // DAC7 readiness report should look at before filing.
        if (updates.payoutIbanFull !== undefined) {
            if (!updates.payoutIbanFull) {
                delete updates.payoutIbanFull;
            } else {
                const result = validateIban(updates.payoutIbanFull);
                // Store the normalised form either way, so "SK89 0200 …" and
                // "sk890200…" are never two different numbers on file.
                const stored = result.valid ? result.iban : normaliseIban(updates.payoutIbanFull);
                updates.payoutIbanFull = stored;
                updates.payoutIbanVerifiedAt = result.valid ? new Date() : null;
                // Keep the display value consistent with the number on file.
                // maskIban returns "" for anything under six characters; writing
                // that would blank the masked line for no reason.
                const masked = maskIban(stored);
                if (masked) updates.payoutIban = masked;
            }
        }

        const updatedHost = await Host.findByIdAndUpdate(id, updates, { new: true });

        // Filling in billing details is the other half of going live — Stripe
        // verifying the account is the first. So this is the second moment a
        // listing's status can legitimately change, and it changes itself:
        // the host saves their IČO and address here, and their listings move on
        // without anyone publishing them by hand.
        //
        // Never allowed to fail the save. The details are already stored by the
        // time this runs, and the status is recomputed on read anyway — this
        // only saves that read from having to correct anything.
        if (updatedHost) {
            syncListingStatusForHost(updatedHost).catch((err) =>
                console.error('[listing-status] post-billing sync failed:', err.message)
            );
        }

        res.status(200).json({ success: true, message: 'Successfully updated', data: updatedHost });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update' });
    }
};

export const deleteHost = async (req, res) => {
    const id = req.params.id;

    try {
        await Host.findByIdAndDelete(id);

        res.status(200).json({ success: true, message: 'Successfully deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to delete' });
    }
};

export const getSingleHost = async (req, res) => {
    const id = req.params.id;

    try {
        const host = await Host.findById(id).select('-password');

        if (!host) {
            return res.status(404).json({ success: false, message: 'No host found' });
        }

        res.status(200).json({ success: true, message: 'Host found', data: host });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Something went wrong' });
    }
};

export const getAllHosts = async (req, res) => {
    try {
        const hosts = await Host.find({}).select('-password');

        res.status(200).json({ success: true, message: 'Hosts found', data: hosts });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Something went wrong' });
    }
};

export const getHostProfile = async (req, res) => {
    const id = req.params.id;

    try {
        const host = await Host.findById(id);

        if (!host) {
            return res.status(404).json({ success: false, message: 'Host not found' });
        }

        const { password, ...rest } = host._doc;

        res.status(200).json({ success: true, message: 'Profile info retrieved', data: { ...rest } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Something went wrong' });
    }
};

export const getHostById = async (req, res) => {
  const { userId } = req.params;

  // Check if userId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid host ID format" });
  }

  try {
    // Fetch host by ID from the database.
    //
    // Explicitly projected. This route is UNAUTHENTICATED and is reached from
    // every public listing page, and it used to answer with the whole document:
    // the bcrypt password hash, `resetPasswordToken`, and every Stripe account
    // id the host holds. A password hash handed to anyone who asks is an offline
    // cracking target, and a live reset token is an account takeover.
    const user = await Host.findById(userId).select(
      "-password -resetPasswordToken -resetPasswordExpires -payoutIbanFull"
    );

    // If the host doesn't exist, return a 404
    if (!user) {
      return res.status(404).json({ message: "Host not found" });
    }

    // Ship the billing verdict alongside the raw fields.
    //
    // The payments page used to rebuild this rule in the browser from ico/dic/
    // streetNumber/city/zipcode/countryCode. That works only while the browser's
    // copy of the rule and the server's agree AND every one of those fields
    // survives the round trip — so a single field the client did not think to
    // read renders as "billing incomplete" with no way for the host to tell why.
    // The server already owns this decision at the payout gate; saying it out
    // loud here means the page can simply display the answer.
    const missing = missingBillingFieldsOf(user);

    return res.status(200).json({
      ...user.toObject(),
      billing: { complete: missing.length === 0, missing },
    });
  } catch (error) {
    // Log error and return a 500 status code
    console.error("Error fetching host by ID:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
