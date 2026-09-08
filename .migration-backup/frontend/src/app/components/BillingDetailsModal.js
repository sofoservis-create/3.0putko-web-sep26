"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import apiFetch from "../utlis/apiFetch";
import { missingBillingFields, billingFieldLabel } from "../utlis/hostBilling";

/**
 * Collects the invoicing identity Putko needs before it may pay a host out.
 *
 * Putko deducts an intermediary fee from every payout and must issue a Slovak
 * VAT invoice for that fee (see §9 of the payment specification). Without the
 * host's IČO, DIČ and billing address the monthly invoice run cannot raise one —
 * `utils/invoiceJob.js` marks it `missing_host_billing_details` and gives up —
 * which would leave Putko having taken a fee it can never invoice. So the data
 * is collected at the moment the host asks for their money, rather than
 * discovered to be missing weeks later by a cron job nobody is watching.
 *
 * Nothing here is Stripe's. Stripe verifies the host's *identity*; these are the
 * *invoicing* fields, and Stripe's API exposes neither IČO nor DIČ.
 *
 * Billing form logic mirrors EditProfile: subject type (business / individual),
 * debounced IČO → business-register lookup with Bearer token, auto-fill of
 * company / tax / address fields, and the same format checks.
 */
/** Digits only, so "811 01" and "81101" are the same ZIP. */
const digits = (value) => String(value || "").replace(/\D/g, "");

export default function BillingDetailsModal({
  host,
  hostId,
  onSaved,
  onClose,
  // Copy overrides. The defaults are written for the case that prompted this
  // form — a payout refused for want of the details. When it is opened
  // deliberately from the payout settings header, and especially when the
  // details are already on file and are simply being corrected, "Billing details
  // required" is wrong on both counts.
  title,
  intro,
  submitLabel,
  // Locale dictionary (`en` / `sk`) from the calling page. Left optional, and
  // every read falls back to the English string, so a caller that has not been
  // wired up yet renders exactly as it did before.
  labels = {},
}) {
  const [form, setForm] = useState({
    // business = has IČO; individual = sole trader / no IČO (invoice uses name)
    subjectType: host?.billingSubjectType || "business",
    // Optional for sole trader: invoice falls back to the host's own name.
    // Never blank on purpose — an empty string would wipe a company name on file.
    companyName: host?.companyName || "",
    // Prefilled from the legacy free-text columns where those were populated —
    // the same fallback the completeness check uses, so a host is never asked to
    // retype something already on file.
    ico: host?.ico || host?.idNumber || "",
    dic: host?.dic || host?.tin || "",
    icDph: host?.icDph || host?.vatNumber || "",
    streetNumber: host?.streetNumber || "",
    city: host?.city || "",
    zipcode: host?.zipcode || "",
    countryCode: host?.countryCode || host?.country || "SK",
    vatPayer: Boolean(host?.isVatPayer),
    vatinParagraph: host?.vatinParagraph || "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  // IČO → business-register lookup (same flow as EditProfile).
  // status: idle | loading | success | manual
  const [icoLookup, setIcoLookup] = useState({
    status: "idle",
    message: "",
    isBranch: false,
  });

  const set = (field) => (event) => {
    const value =
      event?.target?.type === "checkbox"
        ? event.target.checked
        : event?.target?.value ?? event;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const isSlovak = String(form.countryCode || "").trim().toUpperCase() === "SK";

  // Debounced IČO lookup against the business register — same as EditProfile.
  // Only for subjectType === "business". Sends Bearer token so the route can
  // stay behind the API-key / auth gate (router.get("/ico/:ico", getCompanyByIco)).
  useEffect(() => {
    if (form.subjectType !== "business") {
      setIcoLookup({ status: "idle", message: "", isBranch: false });
      return undefined;
    }

    const ico = digits(form.ico);
    if (ico.length < 6 || ico.length > 8) {
      setIcoLookup({ status: "idle", message: "", isBranch: false });
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIcoLookup({
        status: "loading",
        message:
          labels.BillingIcoLookingUp || "Looking up the business register…",
        isBranch: false,
      });
      try {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/ico/${ico}`,
          {
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "LOOKUP_UNAVAILABLE");
        if (!data.found) throw new Error("NOT_FOUND");

        setForm((current) => ({
          ...current,
          companyName: data.name || current.companyName,
          ico: data.ico || ico,
          dic: data.dic || "",
          icDph: data.icDph || "",
          streetNumber: data.street || current.streetNumber,
          city: data.city || current.city,
          zipcode: data.zip || current.zipcode,
          countryCode: data.countryCode || "SK",
          vatPayer: Boolean(data.vatPayer),
          vatinParagraph: data.vatinParagraph || "",
        }));
        setIcoLookup({
          status: "success",
          message:
            labels.BillingIcoFilled || "Filled from the business register.",
          isBranch: Boolean(data.isBranch),
        });
      } catch (error) {
        if (error.name === "AbortError") return;
        setIcoLookup({
          status: "manual",
          message:
            labels.BillingIcoManual ||
            "Business-register lookup is unavailable. You can enter the details manually.",
          isBranch: false,
        });
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    form.ico,
    form.subjectType,
    labels.BillingIcoLookingUp,
    labels.BillingIcoFilled,
    labels.BillingIcoManual,
  ]);

  const validate = () => {
    const next = {};
    const isBusiness = form.subjectType === "business";

    // Company / legal name: required here (payout gate needs an invoice subject).
    if (!form.companyName.trim()) {
      next.companyName =
        labels.BillingNameRequired ||
        (isBusiness ? "Company name is required" : "Full legal name is required");
    }

    if (isBusiness) {
      if (!form.ico.trim()) {
        next.ico = labels.BillingErrIcoRequired || "IČO is required";
      } else if (isSlovak && digits(form.ico).length !== 8) {
        next.ico = labels.BillingErrIcoFormat || "A Slovak IČO is 8 digits";
      } else if (
        digits(form.ico).length < 6 ||
        digits(form.ico).length > 8
      ) {
        next.ico =
          labels.IcoMustBe8Digits || "IČO must contain 6 to 8 digits";
      }

      if (!form.dic.trim()) {
        next.dic = labels.BillingErrDicRequired || "DIČ is required";
      } else if (isSlovak && digits(form.dic).length !== 10) {
        next.dic = labels.BillingErrDicFormat || "A Slovak DIČ is 10 digits";
      }
    }

    // IČ DPH is optional — only VAT-registered hosts have one — but a value that
    // is present must still look like one.
    if (
      form.icDph.trim() &&
      !/^[A-Za-z]{2}\d{8,12}$/.test(form.icDph.replace(/\s/g, ""))
    ) {
      next.icDph =
        labels.BillingErrIcDphFormat ||
        "IČ DPH looks like SK2020123456, or leave it empty";
    }

    if (!form.streetNumber.trim()) {
      next.streetNumber =
        labels.BillingErrStreetRequired || "Street and number are required";
    }
    if (!form.city.trim()) {
      next.city = labels.BillingErrCityRequired || "City is required";
    }
    if (!form.zipcode.trim()) {
      next.zipcode = labels.BillingErrZipRequired || "ZIP code is required";
    } else if (isSlovak && digits(form.zipcode).length !== 5) {
      next.zipcode = labels.BillingErrZipFormat || "A Slovak ZIP is 5 digits";
    }
    if (!form.countryCode.trim()) {
      next.countryCode =
        labels.BillingErrCountryRequired || "Country is required";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        billingSubjectType: form.subjectType,
        companyName: form.companyName.trim(),
        streetNumber: form.streetNumber.trim(),
        city: form.city.trim(),
        zipcode: form.zipcode.trim(),
        countryCode: form.countryCode.trim().toUpperCase(),
        isVatPayer: form.vatPayer,
        vatinParagraph: form.vatinParagraph || "",
      };

      if (form.subjectType === "business") {
        payload.ico = form.ico.trim();
        payload.dic = form.dic.trim();
      }

      // Only sent when supplied: writing an empty string would flip a
      // VAT-registered host to "no VAT ID" on the next invoice.
      const icDph = form.icDph.replace(/\s/g, "").toUpperCase();
      if (icDph && form.subjectType === "business") {
        payload.icDph = icDph;
        payload.isVatPayer = true;
      }

      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/hosts/${hostId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok || data.success === false) {
        toast.error(
          data.message ||
            data.error ||
            labels.BillingSaveFailed ||
            "Could not save your billing details"
        );
        return;
      }

      // Trust what came back where the server returned it, so the caller's copy
      // of the host matches the database rather than the form.
      const saved = { ...(host || {}), ...payload, ...(data.data || {}) };

      // Belt and braces: if the write silently did not take, resuming the payout
      // would only fail again at the server-side gate with a confusing message.
      const stillMissing = missingBillingFields(saved);
      if (stillMissing.length) {
        toast.error(
          labels.BillingSaveIncomplete ||
            "Your billing details were not saved completely. Please try again."
        );
        return;
      }

      toast.success(labels.BillingSaved || "Billing details saved");
      onSaved?.(saved);
    } catch {
      toast.error(
        labels.BillingSaveError ||
          "Something went wrong while saving your billing details"
      );
    } finally {
      setSaving(false);
    }
  };

  const lookupBusy = icoLookup.status === "loading";

  // Hold the page still behind the modal.
  //
  // Without this the background scrolls under the overlay on touch, which on a
  // phone reads as the modal itself refusing to scroll — the user drags, the
  // page behind moves, and the form appears stuck.
  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const field = (name, label, extra = {}) => (
    <div className={extra.wrapClassName || ""}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {extra.optional && (
          <span className="ml-1 font-normal text-gray-400">
            {labels.BillingModalOptional || "(optional)"}
          </span>
        )}
      </label>
      <input
        type="text"
        // Numeric fields get the numeric keypad on a phone. `type="text"` is
        // kept deliberately — `type="number"` strips leading zeros, which a ZIP
        // and some IČO values genuinely have.
        inputMode={extra.inputMode}
        autoComplete={extra.autoComplete}
        value={form[name] ?? ""}
        onChange={set(name)}
        placeholder={extra.placeholder}
        disabled={extra.disabled || (lookupBusy && name !== "ico")}
        // text-base below sm: iOS Safari zooms the whole page in when a focused
        // input is under 16px, and it does not zoom back out — which is what
        // made this form unusable on a phone as much as the layout did.
        className={`mt-1 w-full rounded-lg border p-2.5 text-base sm:p-2 sm:text-sm ${
          errors[name] ? "border-red-400" : "border-gray-300"
        } ${lookupBusy && name !== "ico" ? "bg-gray-50 text-gray-500" : ""}`}
      />
      {errors[name] && (
        <p className="mt-1 text-xs text-red-600">{errors[name]}</p>
      )}
      {extra.hint}
    </div>
  );

  return (
    /**
     * Full-screen sheet on a phone, centred dialog from `sm` up.
     *
     * The previous markup was `fixed inset-0 flex items-center overflow-y-auto`
     * with the form as the only child. That is the classic flex-centring trap:
     * once the content is taller than the viewport, a centred flex item
     * overflows in BOTH directions and the part above the centre line cannot be
     * scrolled to — so on a phone, with the business fields expanded, the title
     * and the first inputs were simply unreachable. Scrolling is moved onto an
     * inner element with its own bounded height, and the outer wrapper uses
     * `min-h-full` so short content still centres.
     *
     * `dvh` rather than `vh`: mobile browsers count their collapsing address bar
     * in `vh`, so a `100vh` sheet has its footer — the Save button — hidden
     * under the browser chrome until the user scrolls.
     */
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-end justify-center sm:items-center sm:p-4">
        <form
          onSubmit={submit}
          className="flex w-full max-h-[92dvh] flex-col rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl"
        >
          {/* Header — stays put while the fields scroll, so the host can always
              see what they are filling in and why. */}
          <div className="shrink-0 border-b border-gray-100 px-4 pb-4 pt-5 sm:px-6 sm:pt-6">
            {/* Grab handle. Purely a phone affordance: it says "this sheet
                scrolls" before the user has tried to drag it. */}
            <div
              aria-hidden="true"
              className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 sm:hidden"
            />
            <h3 className="text-base font-bold text-gray-900 sm:text-lg">
              {title || labels.BillingModalTitle || "Billing details required"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {intro ||
                labels.BillingModalIntro ||
                "Putko issues you a monthly invoice for the platform fee deducted from your payouts. We need these details before we can release your money — you only have to enter them once."}
            </p>
          </div>

          {/* The only scrolling region. */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {/* Subject type — same as EditProfile.
                Stacked on a phone: side by side, "Business (has IČO)" and
                "Individual (no IČO)" wrapped mid-label into an unreadable row,
                and the tap targets were smaller than a fingertip. */}
            <div className="flex flex-col gap-1 text-sm text-gray-700 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
              <span className="font-medium">
                {labels.BillingAs || "Billing as"}
              </span>
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2 sm:min-h-0">
                <input
                  type="radio"
                  name="subjectType"
                  className="h-4 w-4 shrink-0"
                  checked={form.subjectType === "business"}
                  onChange={() =>
                    setForm((prev) => ({ ...prev, subjectType: "business" }))
                  }
                />
                {labels.BillingAsBusiness || "Business (has IČO)"}
              </label>
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2 sm:min-h-0">
                <input
                  type="radio"
                  name="subjectType"
                  className="h-4 w-4 shrink-0"
                  checked={form.subjectType === "individual"}
                  onChange={() =>
                    setForm((prev) => ({ ...prev, subjectType: "individual" }))
                  }
                />
                {labels.BillingAsIndividual || "Individual (no IČO)"}
              </label>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Company name / full legal name */}
              {field(
                "companyName",
                form.subjectType === "individual"
                  ? labels.BillingFullLegalName || "Full legal name"
                  : billingFieldLabel("billing_name", labels) ||
                      labels.companyName ||
                      "Company name",
                {
                  placeholder:
                    form.subjectType === "individual"
                      ? labels.BillingModalNamePlaceholderIndividual ||
                        "Your full legal name"
                      : labels.BillingModalNamePlaceholder ||
                        "Only if you trade under a company",
                  wrapClassName: "sm:col-span-2",
                }
              )}

              {form.subjectType === "business" && (
                <>
                  {/* IČO + lookup status */}
                  {field("ico", billingFieldLabel("ico", labels) || "IČO", {
                    placeholder: "12345678",
                    inputMode: "numeric",
                    hint:
                      icoLookup.status !== "idle" ? (
                        <p
                          className={`mt-1 text-xs ${
                            icoLookup.status === "success"
                              ? "text-emerald-600"
                              : "text-slate-500"
                          }`}
                        >
                          {icoLookup.message}
                        </p>
                      ) : null,
                  })}

                  {/* DIČ */}
                  {field("dic", billingFieldLabel("dic", labels) || "DIČ", {
                    placeholder: "1234567890",
                    inputMode: "numeric",
                  })}

                  {icoLookup.isBranch && (
                    <p className="sm:col-span-2 text-xs text-amber-700">
                      {labels.BillingIcoIsBranch ||
                        "This is a branch. Invoice the parent company instead?"}
                    </p>
                  )}

                  {/* IČ DPH */}
                  {field(
                    "icDph",
                    labels.BillingFieldIcDph || "IČ DPH (VAT ID)",
                    {
                      optional: true,
                      placeholder: "SK1234567890",
                      wrapClassName: "sm:col-span-2",
                    }
                  )}
                </>
              )}

              {/* Street */}
              {field(
                "streetNumber",
                billingFieldLabel("billing_address_street", labels) ||
                  "Street and number",
                {
                  placeholder: "Hlavná 12",
                  wrapClassName: "sm:col-span-2",
                }
              )}

              {/* City */}
              {field(
                "city",
                billingFieldLabel("billing_address_city", labels) || "City",
                { placeholder: "Bratislava" }
              )}

              {/* ZIP */}
              {field(
                "zipcode",
                billingFieldLabel("billing_address_zip", labels) || "ZIP code",
                { placeholder: "811 01", inputMode: "numeric", autoComplete: "postal-code" }
              )}

              {/* Country */}
              {field(
                "countryCode",
                labels.BillingModalCountryCode || "Country code",
                {
                  placeholder: "SK",
                  wrapClassName: "sm:col-span-2",
                }
              )}
            </div>

            <p className="mt-4 text-xs text-gray-500">
              {labels.BillingModalFootnote ||
                "These appear on the invoice Putko issues to you. They are not sent to guests."}
            </p>
          </div>

          {/* Footer — pinned, so Save is reachable without scrolling to the
              bottom of a form that is fifteen fields long on a phone.
              `pb-[max(...)]` keeps it clear of the iOS home indicator.
              Reversed column order puts the primary action on top on mobile and
              on the right on desktop, from one source of truth. */}
          <div className="shrink-0 border-t border-gray-100 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-4">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="w-full rounded-md px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 sm:w-auto sm:py-2"
              >
                {labels.Cancel || "Cancel"}
              </button>
              <button
                type="submit"
                disabled={saving || lookupBusy}
                className="w-full rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-400 sm:w-auto sm:py-2"
              >
                {saving
                  ? labels.BillingModalSaving || "Saving…"
                  : submitLabel ||
                    labels.BillingModalSubmit ||
                    "Save and continue"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
