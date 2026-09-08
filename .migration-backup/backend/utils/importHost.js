import xlsx from "xlsx";
import path from "path";
import Host from "../models/Host.js";
import Accommodation from "../models/Accommodation.js";
import Review from "../models/Review.js";
import bcrypt from "bcryptjs";
import { getTransporter } from './mailer.js';
import jwt from "jsonwebtoken";
import fs from "fs";
import { geocodeWithDelay } from "./geocode.js";
import { uploadAccommodationImages } from "./uploadUrlToCloudinary.js";
import { SITE, brandShell, logoAttachments } from "./emailLayout.js";

// ─── Convert Excel fractional time to HH:MM string ───────────────────────────
// ─── Convert Excel fractional time to HH:MM string ───────────────────────────
function formatExcelTime(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === "") return null;

  // If it's already a string in HH:MM format, return it clean
  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed.padStart(5, '0');
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed.split(':').slice(0, 2).join(':').padStart(5, '0');
  }

  // If it is a number (Excel decimal time serial value)
  const num = Number(rawValue);
  if (!isNaN(num) && num >= 0 && num < 1) {
    const totalMinutes = Math.round(num * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    
    return `${formattedHours}:${formattedMinutes}`;
  }

  return String(rawValue).trim();
}

// ─── Parse reviews JSON column ───────────────────────────────────────────────
function cleanReviews(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') return [];
  let cleaned = rawValue.trim();

  // Pre-processing: Escape literal newlines/tabs that break JSON.parse
  // This handles case where Excel row has actual line breaks inside the string
  cleaned = cleaned
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");

  // Strategy 1: Direct parse
  try {
    return JSON.parse(cleaned);
  } catch (err) {}

  // Strategy 2: Clean Excel/CSV quote artifacts
  try {
    // Strip wrapping quotes if present
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    // Replace escaped double quotes "" -> "
    // (Note: we use a temporary placeholder and then restore intended escaped quotes if needed, 
    // but usually in CSV/Excel, "" is just an escaped ")
    cleaned = cleaned.replace(/""/g, '"');
    
    // Attempt parse again
    return JSON.parse(cleaned);
  } catch (err) {}

  // Strategy 3: Handle Python-style single quoted dicts
  try {
    // This is a bit aggressive but often works for dirty CSV data
    let singleQuotedFix = cleaned.replace(/'/g, '"');
    return JSON.parse(singleQuotedFix);
  } catch (err) {
    console.error('❌ Failed to parse reviews JSON. Raw value snippet:', rawValue.substring(0, 100) + '...');
    console.error('Error:', err.message);
    return [];
  }
}

// ─── The cleanFlexiblePrice function ─────────────────────────────────────────
function cleanFlexiblePrice(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') return [];
  let cleaned = rawValue.trim();

  // Escape literal newlines/tabs
  cleaned = cleaned
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");

  let parsed = null;
  // Strategy 1: Direct parse
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    // Strategy 2: Clean artifacts
    try {
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
      }
      cleaned = cleaned.replace(/""/g, '"');
      parsed = JSON.parse(cleaned);
    } catch (err2) {
      // Strategy 3: Handle single quotes
      try {
        let singleQuotedFix = cleaned.replace(/'/g, '"');
        parsed = JSON.parse(singleQuotedFix);
      } catch (err3) {
        console.error('❌ Failed to parse flexiblePrice:', err3.message);
        return [];
      }
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.map(item => ({
    name: item.name || '',
    start: item.start || '',
    end: item.end || '',
    price: Number(item.price) || 0,
    Minnumberofpersons: Number(item.min_persons) || 1,
    Minnumberofnights: Number(item.min_nights) || 1,
    accommodationnote: item.accommodation_note || ''
  }));
}

export const importHostsFromExcel = async (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log("🚀 [VER 2.2] Starting importHostsFromExcel...");
    const results = []; // ← collects putko URLs for CSV export

    const outputDir = path.dirname(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(outputDir, `putko_results_${timestamp}.csv`);

    const saveProgressToCSV = () => {
      if (results.length === 0) return;
      const wsData = [
        ['Property Name', 'Host Email', 'Status', 'Putko URL'], // header row
        ...results.map(r => [r.propertyName, r.email, r.status, r.putkoUrl]),
      ];
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.aoa_to_sheet(wsData);

      // Auto-width columns
      ws['!cols'] = wsData[0].map((_, ci) => ({
        wch: Math.max(...wsData.map(row => String(row[ci] ?? '').length), 12),
      }));

      xlsx.utils.book_append_sheet(wb, ws, 'Putko URLs');
      xlsx.writeFile(wb, outputPath, { bookType: 'csv' });
    };

    for (const row of sheetData) {
      const {
        name,
        lastName,
        email,
        password,
        photo,
        language,
        gender,
        propertyName,
        description,
        WCs,
        SocialRoom,
        LivingRoom, 
        pets,
        wifi,
        parking,
        acreage,
        streetAndNumber,
        phoneNumber,
        arrivalFrom,
        arrivalTo,
        bathroom,
        latitude,
        longitude,
        bathroomAmenities,
        bedroom,
        beds,
        cancellationPolicy,
        checkIn,
        createdAt,
        departureFrom,
        departureTo,
        discount,
        doublebed,
        heatingCoolingAmenities,
        kitchen,
        kitchenDiningAmenities,
        meals,
        nightMax,
        nightMin,
        outdoorAmenities,
        parkingFacilities,
        partyOrganizing,
        person,
        pet,
        zipCode,
        state,
        city,
        country,
        Country,
        priceMonThus,
        pricePerNight: excelPricePerNight,
        price,
        start,
        end,
        min_persons,
        min_nights,
        accommodation_note,
        Minnumberofpersons,
        Minnumberofnights,
        accommodationnote,
        flexiblePrice,
        propertyType,
        rentalform,
        safetyAmenities,
        services,
        singlebed,
        smoking,
        specialNote,
        tags,
        wellnessAmenities,
        _id,
        reviews,
      } = row;

      // Case-insensitive & trimmed key lookup for images
      const imagesKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'images');
      const imagesToUpload = imagesKey ? String(row[imagesKey] || '').trim() : '';

      if (!imagesToUpload) {
        // Log keys once to help debug if images are really missing
        if (sheetData.indexOf(row) === 0) {
          console.log(`ℹ️ [DEBUG] First row keys: ${Object.keys(row).join(', ')}`);
        }
      }

      if (!email) {
        console.log("⚠️ Skipping row due to missing email.");
        continue;
      }

      // Check if host exists
      let host = await Host.findOne({
        email: { $regex: new RegExp(`^${email}$`, 'i') }
      });
      if (!host) {
        const hashPassword = await bcrypt.hash(password || "Putko2026", 10);
        host = new Host({
          name,
          lastName,
          email,
          password: hashPassword,
          photo: photo || "",
          language: language || "Slovak",
          gender: gender || "other",
          role: "host",
          isVerified: "true"
        });
        await host.save();
          
        console.log(`✅ New host created: ${email}`);
      } else {
        console.log(`ℹ️ Existing host found: ${email}`);
      }

      const userId = host._id;

      if (!propertyName) {
        console.log(`⚠️ Skipping accommodation due to missing propertyName for host ${email}`);
        continue;
      }

      const existingAccommodation = await Accommodation.findOne({ name: propertyName, userId });
      if (existingAccommodation) {
        console.log(`⏩ Skipping existing accommodation: ${propertyName} for host ${email}`);
        // Still record the existing URL so it appears in the output CSV
        const existingSlug = existingAccommodation.slug ||
          propertyName.toString().trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-').replace(/^-+|-+$/g, '');
        results.push({
          propertyName,
          email,
          status: 'skipped (already exists)',
          putkoUrl: `https://putko.sk/listings/${existingSlug}`,
        });
        saveProgressToCSV();
        continue;
      }

      // Parse flexiblePrice first
      const parsedFlexiblePrice = cleanFlexiblePrice(flexiblePrice);

      let pricePerNight = 89;

      // Use the price from the file when present; otherwise fall back to the logic below
      const csvPricePerNight = parseFloat(excelPricePerNight);

      if (!isNaN(csvPricePerNight) && csvPricePerNight > 0) {
        pricePerNight = csvPricePerNight;
      } else if (parsedFlexiblePrice && parsedFlexiblePrice.length > 0) {
        // Get price value of first data, if not then get from second
        if (parsedFlexiblePrice[0] && parsedFlexiblePrice[0].price) {
          pricePerNight = parsedFlexiblePrice[0].price;
        } else if (parsedFlexiblePrice.length > 1 && parsedFlexiblePrice[1] && parsedFlexiblePrice[1].price) {
          pricePerNight = parsedFlexiblePrice[1].price;
        } else {
          pricePerNight = 89;
        }
      } else {
        // If flexiblePrice has no data / null
        pricePerNight = Math.floor(Math.random() * (45 - 35 + 1)) + 35; // random 35 to 45
      }

      // If price > 80, set pricePerNight value randomly 35 to 45 (not applied to the file price)
      if (isNaN(csvPricePerNight) && pricePerNight > 80) {
        pricePerNight = Math.floor(Math.random() * (45 - 35 + 1)) + 35;
      }

      console.log(`🔨 Generating slug for: "${propertyName}"`);
      const slugify = (str) => {
        if (!str) return '';

        return str
          .toString()
          .trim()
          .toLowerCase()
          // Normalize accents (á → a, č → c, ľ → l, etc.)
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          // Replace spaces and underscores with dash
          .replace(/[\s_]+/g, '-')
          // Remove invalid chars (keep a-z, 0-9, dash)
          .replace(/[^a-z0-9-]/g, '')
          // Replace multiple dashes with single dash
          .replace(/-+/g, '-')
          // Remove starting and ending dash
          .replace(/^-+|-+$/g, '');
      };
      const slug = slugify(propertyName || '');

      // Upload images for accommodation
      let uploadedImages = [];
      if (imagesToUpload) {
        try {
          console.log(`📸 Attempting to upload images for "${propertyName || 'Unknown'}":`, imagesToUpload.substring(0, 100) + '...');
          uploadedImages = await uploadAccommodationImages(imagesToUpload, slug);
        } catch (err) {
          console.warn(`⚠️ Skipping accommodation "${propertyName || 'Unknown'}" for host ${email} due to image upload failure: ${err.message}`);
          continue; // move to next accommodation
        }
      } else {
        console.log(`ℹ️ No images found for "${propertyName || 'Unknown'}", skipping image upload.`);
      }

      // Full address
      const fullAddress = streetAndNumber;

      // Use row coordinates if available, otherwise geocode address
      let coords = { 
        latitude: parseFloat(latitude) || 48.6690, 
        longitude: parseFloat(longitude) || 19.6990 
      };

      if (!latitude && !longitude && streetAndNumber) {
        const geo = await geocodeWithDelay(streetAndNumber);
        if (geo) {
          coords = geo;
          console.log(`✅ Geocoded: ${streetAndNumber}`);
          console.log(`Latitude: ${coords.latitude}, Longitude: ${coords.longitude}`);
        } else {
          console.warn(`⚠️ Could not geocode: ${streetAndNumber}`);
        }
        // Small delay to respect Nominatim rate limit
        await new Promise(resolve => setTimeout(resolve, 1200));
      } else if (latitude && longitude) {
        console.log(`📍 Using coordinates from Excel: ${coords.latitude}, ${coords.longitude}`);
      }

      // ─── Format Arrival & Departure Times safely ───────────────────────────
      const formattedArrivalFrom = formatExcelTime(arrivalFrom) || "14:00";
      const formattedArrivalTo = formatExcelTime(arrivalTo) || "20:00";
      const formattedDepartureFrom = formatExcelTime(departureFrom) || "06:00";
      const formattedDepartureTo = formatExcelTime(departureTo) || "10:00";
      
      const newAccommodation = new Accommodation({
        name: propertyName,
        slug,
        description: description || "",
        propertyType: propertyType || { en: "Nature House", sk: "Prírodný dom" },
        location: { 
          latitude: coords.latitude, 
          longitude: coords.longitude, 
          address: fullAddress 
        },
        priceMonThus: priceMonThus,
        pricePerNight: pricePerNight || 0,
        person: person || 1,
        departureFrom: formattedDepartureFrom, // 👈 updated
        departureTo: formattedDepartureTo,     // 👈 updated
        discount: discount || 0,
        nightMax: nightMax || 15,
        nightMin: nightMin || 1,
        safetyAmenities: safetyAmenities || { en: ["First Aid Kit"], sk: ["Lekárnička"] },
        heatingCoolingAmenities: heatingCoolingAmenities || { en: "Central Heating", sk: "Ústredné kúrenie" },
        images: uploadedImages,
        bedroom: bedroom || 1,
        bathroom: bathroom || 1,
        WCs: WCs || 1,
        SocialRoom: SocialRoom || 0,
        LivingRoom: LivingRoom || 0, 
        doublebed: doublebed || "",
        phoneNumber: phoneNumber,
        checkIn: checkIn || { en: ["Host Greeting"], sk: ["Privítanie hostiteľom"] },
        meals: meals || { en: ["Breakfast"], sk: ["Raňajky"] },
        beds: beds || "",
        wellnessAmenities: wellnessAmenities || { en: ["Sauna"], sk: ["Sauna"] },
        partyOrganizing: partyOrganizing || { en: "Not Allowed", sk: "Nepovolené" },
        outdoorAmenities: outdoorAmenities || { en: ["Balcony"], sk: ["Balkón"] },
        arrivalFrom: formattedArrivalFrom,
        services: services || { en: ["Wifi"], sk: ["Wifi"] },
        singlebed: singlebed || "",
        pet: pet || { en: "Not Allowed", sk: "Nepovolené" },
        rentalform: rentalform || { en: "Entire place", sk: "Celé miesto" },
        kitchen: kitchen || 1,
        kitchenDiningAmenities: kitchenDiningAmenities || { en: ["Oven"], sk: ["Rúra"] },
        locationDetails: {
          streetAndNumber: streetAndNumber || "",
          city: city || "",
          zipCode: zipCode || "",
          country: country || Country || "Slovakia",
          state: state,
        },
        bathroomAmenities: bathroomAmenities || { en: ["Bathtub"], sk: ["Vaňa"] },
        arrivalTo: formattedArrivalTo,
        smoking: smoking || { en: "Not allowed", sk: "Nepovolené" },
        parkingFacilities: parkingFacilities || { en: ["Paid Parking on-site"], sk: ["Platené parkovanie"] },
        userId,
      });

      await newAccommodation.save();
      console.log(`🏠 Accommodation created: ${propertyName} for host ${email}`);

      // Record putko URL for this newly created accommodation
      results.push({
        propertyName,
        email,
        status: 'created',
        putkoUrl: `https://putko.sk/listings/${slug}`,
      });
      saveProgressToCSV();

      // ── Ingest reviews ────────────────────────────────────────────────────
      const parsedReviews = cleanReviews(reviews);
      let reviewCount = 0;
      const reviewIds = [];

      for (const rv of parsedReviews) {

      const reviewerName =
        rv.reviewsId?.trim() ||
        rv.reviewer?.trim() ||
        "";

      if (!reviewerName) continue;

      const rating = parseFloat(rv.rating);

      if (isNaN(rating) || rating < 1 || rating > 5) continue;

      const reviewText =
        rv.reviews?.trim() ||
        rv.review?.trim() ||
        "Bez komentára";

        // Avoid duplicate reviews (same accommodation + reviewer + rating)
        let reviewDoc = await Review.findOne({
          accommodation: newAccommodation._id,
          name: reviewerName,
          overallRating: Math.round(rating),
        });

        if (!reviewDoc) {
          // Parse date if present
          let createdAt;
          if (rv.date) {
            const parts = rv.date.split('/');
            if (parts.length === 3) {
              // format: DD/MM/YYYY
              createdAt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
          }

          reviewDoc = new Review({
            accommodation: newAccommodation._id,
            name: reviewerName,
            reviewText,
            overallRating: Math.round(rating),
            ...(createdAt && !isNaN(createdAt) ? { createdAt } : {}),
          });

          await reviewDoc.save();
          reviewCount++;
        }
        
        if (reviewDoc && !reviewIds.includes(reviewDoc._id)) {
          reviewIds.push(reviewDoc._id);
        }
      }

      if (reviewIds.length > 0) {
        // Update accommodation with review IDs
        await Accommodation.findByIdAndUpdate(newAccommodation._id, {
          $addToSet: { reviews: { $each: reviewIds } }
        });

        // Recalculate average rating on the accommodation
        await Review.calAverageRatings(newAccommodation._id);
        if (reviewCount > 0) {
          console.log(`⭐ ${reviewCount} new review(s) ingested (Total linked: ${reviewIds.length}) for: ${propertyName}`);
        }
      }

      // Set up transporter for sending email - DISABLED
      const transporter = getTransporter();
      

      // Inline logo, same as every other Putko email. Falls back to the hosted
      // image when the file cannot be found, so the header never renders broken.
      const logoFiles = logoAttachments();
      // The logo now comes from brandShell; only the attachment is needed here.

      // Send listing draft confirmation email
      const listingMailOptions = {
        from: '"Putko Support" <support@putko.sk>',
        to: email,
        subject: 'Váš návrh inzerátu je pripravený na Putko',
        attachments: logoFiles,
        html: brandShell({
          preheader: `Návrh inzerátu ${name} je pripravený na kontrolu.`,
          title: "Váš návrh inzerátu je pripravený",
          bodyHtml: `

              <p style="font-size:16px; margin:0 0 12px 0;">Vážený pán ${name},</p>
              <p style="font-size:16px; margin:0 0 12px 0;">
                Bolo nám potešením sa s Vami porozprávať. Vytvorili sme predbežný návrh Vášho inzerátu na ubytovanie na Putko – slovenskej platforme, ktorá spája hostí priamo s ubytovateľmi bez provízií.
              </p>

              <p style="font-size:16px; margin:0 0 12px 0;">
                Pred zverejnením inzerátu prosím skontrolujte niekoľko detailov:
              </p>
              <ul style="font-size:16px; margin:0 0 12px 20px;">
                <li>Synchronizujte kalendár, aby ste predišli dvojitým rezerváciám</li>
                <li>Skontrolujte, či sú ceny správne nastavené</li>
                <li>Potvrďte vybavenie a ďalšie údaje</li>
              </ul>

              <p style="font-size:16px; margin:12px 0;">
                Prezrite si a upravte inzerát tu:
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding:12px 0 16px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#238869" style="border-radius:8px;">
                          <a href="https://putko.sk/listings/${slug}"
                             style="display:inline-block; padding:14px 34px; font-family:Arial,Helvetica,sans-serif;
                                    font-size:16px; font-weight:bold; color:#ffffff; text-decoration:none;
                                    border-radius:8px;">Skontrolovať môj inzerát</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="text-align:center; margin:20px 0;">
                <img src="${imagesToUpload?.split(",")[0]?.trim() || ""}" alt="Accommodation Image" style="width:100%; max-width:550px; border-radius:12px; box-shadow:0 8px 16px rgba(0,0,0,0.1);">
              </div>

              <p style="font-size:16px; margin:12px 0;">Vaše prihlasovacie údaje sú:</p>
              <ul style="font-size:16px; margin:0 0 12px 20px;">
                <li><strong>E-mail:</strong> ${email}</li>
                <li><strong>Heslo:</strong> Putko2026</li>
              </ul>

              <!-- ── Nastavenie platieb ──────────────────────────────────── -->
              <hr style="border:0; border-top:1px solid #E4E9E5; margin:28px 0 24px 0;" />

              <p style="font-size:16px; line-height:1.6; margin:0 0 20px 0;">
                Aby ste mohli bez problémov a bez zbytočných oneskorení prijímať platby za svoje
                budúce rezervácie, je potrebné pripojiť váš bankový účet k účtu na Putko.sk
                a dokončiť proces nastavenia platieb.
              </p>

              <h2 style="font-size:19px; line-height:1.3; color:#1E3E2B; margin:0 0 16px 0;">
                Postup nastavenia platieb
              </h2>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                     style="margin:0 0 8px 0;">
                <tr>
                  <td width="40" valign="top" style="padding:0 12px 16px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" valign="middle" width="28" height="28" bgcolor="#238869"
                            style="width:28px; height:28px; border-radius:14px; color:#ffffff;
                                   font-family:Arial,Helvetica,sans-serif; font-size:14px;
                                   font-weight:bold; line-height:28px;">1</td>
                      </tr>
                    </table>
                  </td>
                  <td valign="top" style="padding:0 0 16px 0; font-size:15px; line-height:1.55;">
                    <strong style="color:#1E3E2B;">Prihláste sa do svojho účtu Putko</strong><br />
                    <span style="color:#6B7280; font-size:14px;">
                      Navštívte <a href="https://putko.sk/login" style="color:#238869; text-decoration:underline;">putko.sk/login</a>
                      a prihláste sa pomocou svojich prihlasovacích údajov.
                    </span>
                  </td>
                </tr>
                <tr>
                  <td width="40" valign="top" style="padding:0 12px 16px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" valign="middle" width="28" height="28" bgcolor="#238869"
                            style="width:28px; height:28px; border-radius:14px; color:#ffffff;
                                   font-family:Arial,Helvetica,sans-serif; font-size:14px;
                                   font-weight:bold; line-height:28px;">2</td>
                      </tr>
                    </table>
                  </td>
                  <td valign="top" style="padding:0 0 16px 0; font-size:15px; line-height:1.55;">
                    <strong style="color:#1E3E2B;">Prejdite do svojho profilu</strong><br />
                    <span style="color:#6B7280; font-size:14px;">
                      Po prihlásení navštívte <a href="https://putko.sk/Profile" style="color:#238869; text-decoration:underline;">putko.sk/Profile</a>.
                    </span>
                  </td>
                </tr>
                <tr>
                  <td width="40" valign="top" style="padding:0 12px 16px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" valign="middle" width="28" height="28" bgcolor="#238869"
                            style="width:28px; height:28px; border-radius:14px; color:#ffffff;
                                   font-family:Arial,Helvetica,sans-serif; font-size:14px;
                                   font-weight:bold; line-height:28px;">3</td>
                      </tr>
                    </table>
                  </td>
                  <td valign="top" style="padding:0 0 16px 0; font-size:15px; line-height:1.55;">
                    <strong style="color:#1E3E2B;">Otvorte sekciu Platby</strong><br />
                    <span style="color:#6B7280; font-size:14px;">
                      Vo svojom profile prejdite do sekcie <strong>Platby</strong>.
                    </span>
                  </td>
                </tr>
                <tr>
                  <td width="40" valign="top" style="padding:0 12px 16px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" valign="middle" width="28" height="28" bgcolor="#238869"
                            style="width:28px; height:28px; border-radius:14px; color:#ffffff;
                                   font-family:Arial,Helvetica,sans-serif; font-size:14px;
                                   font-weight:bold; line-height:28px;">4</td>
                      </tr>
                    </table>
                  </td>
                  <td valign="top" style="padding:0 0 16px 0; font-size:15px; line-height:1.55;">
                    <strong style="color:#1E3E2B;">Pridajte svoj bankový účet</strong><br />
                    <span style="color:#6B7280; font-size:14px;">
                      Zadajte údaje svojho bankového účtu a dôkladne skontrolujte, či sú všetky
                      údaje správne.
                    </span>
                  </td>
                </tr>
                <tr>
                  <td width="40" valign="top" style="padding:0 12px 4px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" valign="middle" width="28" height="28" bgcolor="#238869"
                            style="width:28px; height:28px; border-radius:14px; color:#ffffff;
                                   font-family:Arial,Helvetica,sans-serif; font-size:14px;
                                   font-weight:bold; line-height:28px;">5</td>
                      </tr>
                    </table>
                  </td>
                  <td valign="top" style="padding:0 0 4px 0; font-size:15px; line-height:1.55;">
                    <strong style="color:#1E3E2B;">Dokončite proces onboardingu</strong><br />
                    <span style="color:#6B7280; font-size:14px;">
                      Postupujte podľa pokynov zobrazených v sekcii Platby a dokončite celý proces
                      nastavenia.
                    </span>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding:22px 0 24px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#238869" style="border-radius:8px;">
                          <a href="https://putko.sk/Profile"
                             style="display:inline-block; padding:14px 34px; font-family:Arial,Helvetica,sans-serif;
                                    font-size:16px; font-weight:bold; color:#ffffff; text-decoration:none;
                                    border-radius:8px;">Nastaviť platby</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="font-size:16px; line-height:1.6; margin:0 0 24px 0;">
                Po úspešnom dokončení bude váš účet pripravený na prijímanie platieb z budúcich
                rezervácií. Odporúčame vám dokončiť nastavenie čo najskôr, aby mohli byť vaše
                budúce rezervácie a výplaty spracované plynulo a bez zbytočných oneskorení.
              </p>

              <!-- ── O platforme ─────────────────────────────────────────── -->
              <hr style="border:0; border-top:1px solid #E4E9E5; margin:0 0 24px 0;" />

              <h2 style="font-size:19px; line-height:1.3; color:#1E3E2B; margin:0 0 14px 0;">
                Vaše ubytovanie, vaše podnikanie, naša platforma
              </h2>

              <p style="font-size:16px; line-height:1.6; margin:0 0 14px 0;">
                V Putko budujeme platformu zameranú na slovenský trh krátkodobých prenájmov, ktorá
                spája kvalitných poskytovateľov ubytovania s hosťami hľadajúcimi príjemné pobyty
                po celom Slovensku.
              </p>

              <p style="font-size:16px; line-height:1.6; margin:0 0 14px 0;">
                Na platforme neustále pracujeme, rozširujeme jej dosah a vytvárame nové
                príležitosti pre našich hostiteľov.
              </p>

              <p style="font-size:16px; line-height:1.6; margin:0 0 20px 0;">
                Sme radi, že ste sa k nám pridali, a tešíme sa na spoločný rast. Váš úspech ako
                hostiteľa je dôležitou súčasťou úspechu Putko.
              </p>

              <p style="font-size:16px; line-height:1.6; margin:0 0 14px 0;">
                Ak potrebujete pomoc s nastavením platieb alebo máte akékoľvek otázky, kontaktujte
                náš tím podpory na
                <a href="mailto:support@putko.sk" style="color:#238869; text-decoration:underline;">support@putko.sk</a>.
                Radi vám pomôžeme.
              </p>

              <p style="font-size:16px; line-height:1.6; margin:0 0 24px 0;">
                Ďakujeme, že ste si vybrali Putko a že ste súčasťou našej cesty.
              </p>

`,
        }),
      };

      await transporter.sendMail(listingMailOptions); // FIRST email sent
      console.log("✅ Listing email sent successfully.");
      
      console.log(`✅ New host created: ${email}`);
        
    }

    console.log("🎉 Host and accommodation import completed.");
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("🗑️ Excel file deleted after import.");
    } else {
      console.warn("⚠️ Excel file not found during cleanup:", filePath);
    }
    console.log(`📄 Putko URL results saved sequentially to: ${outputPath}`);
  } catch (err) {
    console.error("❌ Error importing hosts and accommodations:", err.message);
  }
};