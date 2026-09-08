import CompanyLookup from "../models/CompanyLookup.js";

const COMPLETE_CACHE_MS = 30 * 24 * 60 * 60 * 1000;
const INCOMPLETE_CACHE_MS = 60 * 60 * 1000;
const LOOKUP_TIMEOUT_MS = 8_000;
const inflight = new Map();

// Accept a pasted/short form and preserve leading zeroes required by Slovak IČO.
export const normaliseIco = (value) => String(value || "").replace(/\D/g, "").padStart(8, "0");

const emptyCompany = (ico) => ({
  name: "", ico, dic: "", icDph: "", street: "", city: "", zip: "",
  countryCode: "SK", sources: [], found: false,
});

const hasValue = (value) => Boolean(String(value || "").trim());
const isComplete = (company) => ["name", "street", "city", "zip", "dic"].every((key) => hasValue(company[key]));

async function getJson(url, signal) {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Official RegisterUZ two-step API: find its immutable id, then retrieve details. */
async function lookupRegisterUz(ico, signal) {
  const listUrl = new URL("https://www.registeruz.sk/cruz-public/api/uctovne-jednotky");
  listUrl.search = new URLSearchParams({
    "zmenene-od": "2000-01-01", ico, "max-zaznamov": "1",
  }).toString();
  const list = await getJson(listUrl, signal);
  const id = Array.isArray(list?.id) ? list.id[0] : undefined;
  if (!id) return null;
  return getJson(`https://www.registeruz.sk/cruz-public/api/uctovna-jednotka?id=${encodeURIComponent(id)}`, signal);
}

function mergeRegisterUz(company, record) {
  if (!record) return company;
  return {
    ...company,
    found: true,
    name: record.nazovUJ || company.name,
    dic: record.dic || company.dic,
    street: record.ulica || company.street,
    city: record.mesto || company.city,
    zip: String(record.psc || company.zip).replace(/\s/g, ""),
    legalForm: record.pravnaForma || undefined,
    sources: [...company.sources, "registeruz"],
  };
}

const decodeHtml = (value) => value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
const htmlText = (html) => decodeHtml(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/gi, " ").replace(/\s+/g, " "));

function valueAfterLabel(text, label, expression) {
  const from = text.search(new RegExp(label, "i"));
  if (from < 0) return "";
  return text.slice(from, from + 180).match(expression)?.[0]?.replace(/\s/g, "") || "";
}

/** Public page fallback. It is intentionally best-effort: FinStat may alter markup. */
async function lookupFinstat(ico, signal) {
  const response = await fetch(`https://www.finstat.sk/${encodeURIComponent(ico)}`, {
    signal,
    headers: { "User-Agent": "Putko company-data lookup/1.0", Accept: "text/html" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = htmlText(await response.text());
  return {
    dic: valueAfterLabel(text, "DIČ", /\b\d{10}\b/),
    icDph: valueAfterLabel(text, "IČ\s*DPH", /\bSK\s?\d{10}\b/i).toUpperCase(),
  };
}

/** Check a Slovak VAT number with the European Commission's VIES SOAP service. */
async function viesValidates(dic, signal) {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soapenv:Body><urn:checkVat><countryCode>SK</countryCode><vatNumber>${dic}</vatNumber></urn:checkVat></soapenv:Body>
</soapenv:Envelope>`;
  const response = await fetch("https://ec.europa.eu/taxation_customs/vies/services/checkVatService", {
    method: "POST", signal,
    headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: "" }, body,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return /<[^>]*valid[^>]*>\s*true\s*<\//i.test(await response.text());
}

async function uncachedLookup(ico) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  let company = emptyCompany(ico);
  try {
    try {
      company = mergeRegisterUz(company, await lookupRegisterUz(ico, controller.signal));
    } catch (error) {
      console.warn(`[company-lookup] RegisterUZ failed for ${ico}: ${error.message}`);
    }

    if (!company.found || !company.dic || !company.icDph) {
      try {
        const finstat = await lookupFinstat(ico, controller.signal);
        company.dic ||= finstat.dic;
        company.icDph ||= finstat.icDph;
        company.sources.push("finstat");
      } catch (error) {
        console.warn(`[company-lookup] Finstat failed for ${ico}: ${error.message}`);
      }
    }

    if (/^\d{10}$/.test(company.dic) && !company.icDph) {
      try {
        if (await viesValidates(company.dic, controller.signal)) {
          company.icDph = `SK${company.dic}`;
          company.sources.push("vies");
        }
      } catch (error) {
        console.warn(`[company-lookup] VIES failed for ${ico}: ${error.message}`);
      }
    }
  } finally {
    clearTimeout(timer);
  }

  company.complete = isComplete(company);
  company.vatPayer = Boolean(company.icDph);
  return company;
}

/** Cached, deduplicated company lookup. External failures return partial data. */
export async function lookupCompany(icoValue, { force = false } = {}) {
  const digits = String(icoValue || "").replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 8) {
    const error = new Error("INVALID_ICO");
    error.code = "INVALID_ICO";
    throw error;
  }
  const ico = normaliseIco(digits);
  const cached = await CompanyLookup.findOne({ ico }).lean();
  const freshness = cached?.complete ? COMPLETE_CACHE_MS : INCOMPLETE_CACHE_MS;
  if (!force && cached && Date.now() - new Date(cached.fetchedAt).getTime() < freshness) return cached.data;

  if (inflight.has(ico)) return inflight.get(ico);
  const pending = uncachedLookup(ico).then(async (data) => {
    await CompanyLookup.findOneAndUpdate(
      { ico }, { data, complete: data.complete, fetchedAt: new Date() }, { upsert: true }
    );
    return data;
  }).finally(() => inflight.delete(ico));
  inflight.set(ico, pending);
  return pending;
}

/** Refresh only the volatile VAT registration values before issuing an invoice. */
export async function refreshHostVatRegistration(host) {
  const ico = host.ico || host.idNumber;
  if (host.billingSubjectType === "individual" || !ico) return host;
  const company = await lookupCompany(ico, { force: true });
  host.icDph = company.icDph || host.icDph || "";
  host.isVatPayer = Boolean(company.icDph);
  await host.save();
  return host;
}
