import express from "express";
import OpenAI from "openai";
import Accommodation from "../models/Accommodation.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function detectLanguage(text) {
  const hasSlovakChars = /[ľščťžýáíéúäôňď]/i.test(text);
  return hasSlovakChars ? 'sk' : 'en';
}

router.post("/chat", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Query is required" });

  const lang = detectLanguage(query);

  try {
    const intentResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a smart accommodation assistant. Your job is to:
- Understand any user request about accommodations.
- Extract filters like city, street, postal code, country, property type, persons, price, amenities, beds, meals, pets, and date range.
- If any important information is missing, ask the user a **clarifying question**.
- Always respond ONLY in strict JSON with no text.

If you need to clarify, respond like this:
{
  "intent": "clarify",
  "question": "What area or street are you looking for accommodations in?"
}

Otherwise, respond like this:
{
  "intent": "search",
  "location": "null",
  "streetAndNumber": "null",
  "zipCode": "null",
  "country": "Slovakia",
  "propertyType": "null",
  "person": 2,
  "beds": 2,
  "minPrice": null,
  "maxPrice": null,
  "startDate": null,
  "endDate": null,
  "meals": null,
  "petsAllowed": null,
  "smoking": null,
  "amenities": [],
  "sortOrder": null
}`
        },
        { role: "user", content: query }
      ]
    });

    let extractedIntent;
    try {
      const raw = intentResponse.choices[0].message.content;
      const cleaned = raw.replace(/```json|```/g, '').trim().replace(/'/g, '"');
      extractedIntent = JSON.parse(cleaned);
    } catch (err) {
      console.error("GPT JSON parsing error:", err);
      const fallback = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant. If the user query cannot be processed, ask a clarifying question." },
          { role: "user", content: query }
        ]
      });
      return res.status(200).json({ response: fallback.choices[0].message.content });
    }

    if (extractedIntent.intent === "clarify") {
      return res.status(200).json({ response: extractedIntent.question });
    }

    if (extractedIntent.intent === "search") {
      const query = {};

      if (extractedIntent.location) {
        query["locationDetails.city"] = { $regex: new RegExp(extractedIntent.location, "i") };
      }
      if (extractedIntent.streetAndNumber) {
        query["locationDetails.streetAndNumber"] = { $regex: new RegExp(extractedIntent.streetAndNumber, "i") };
      }
      if (extractedIntent.zipCode) {
        query["locationDetails.zipCode"] = { $regex: new RegExp(extractedIntent.zipCode, "i") };
      }
      if (extractedIntent.country) {
        query["locationDetails.country"] = { $regex: new RegExp(extractedIntent.country, "i") };
      }
      if (extractedIntent.propertyType) {
        query[`propertyType.${lang}`] = extractedIntent.propertyType;
      }
      if (extractedIntent.person) {
        query.person = { $gte: extractedIntent.person };
      }
      if (extractedIntent.beds) {
        query.beds = { $gte: extractedIntent.beds };
      }
      if (extractedIntent.minPrice || extractedIntent.maxPrice) {
        const priceRange = {};
        if (extractedIntent.minPrice) priceRange.$gte = extractedIntent.minPrice;
        if (extractedIntent.maxPrice) priceRange.$lte = extractedIntent.maxPrice;
        query.$or = [
          { "specialPrice.price": priceRange },
          { "flexiblePrice.price": priceRange }
        ];
      }
      if (Array.isArray(extractedIntent.amenities) && extractedIntent.amenities.length > 0) {
        query[`wellnessAmenities.${lang}`] = { $all: extractedIntent.amenities };
      }
      if (extractedIntent.meals) {
        query[`meals.${lang}`] = extractedIntent.meals;
      }
      if (extractedIntent.petsAllowed !== null) {
        query[`pet.${lang}`] = extractedIntent.petsAllowed ? { $ne: "Not Allowed" } : "Not Allowed";
      }
      if (extractedIntent.smoking) {
        query[`smoking.${lang}`] = extractedIntent.smoking;
      }
      if (extractedIntent.startDate && extractedIntent.endDate) {
        const start = new Date(extractedIntent.startDate);
        const end = new Date(extractedIntent.endDate);

        query.$and = [
          {
            occupancyCalendar: {
              $not: {
                $elemMatch: {
                  $or: [
                    { startDate: { $lt: end }, endDate: { $gt: start }, status: "booked" },
                    { startDate: { $lt: end }, endDate: { $gt: start }, status: "blocked" }
                  ]
                }
              }
            }
          },
          {
            excludedDates: {
              $not: {
                $elemMatch: {
                  $gte: start,
                  $lte: end
                }
              }
            }
          }
        ];
      }

      const results = await Accommodation.find(query).limit(10);
console.log("Accommodation results:", results.map(acc => acc.slug)); // ✅ Now always runs

if (results.length === 0) {
  return res.status(200).json({ response: "No accommodations matched your search." });
}

      // ✅ Log all slugs for debugging
      console.log("Matching Slugs:", results.map(acc => acc.slug));

      const links = results
        .filter(acc => !!acc.slug)
        .map(acc => ({
          name: acc.name,
          type: acc.propertyType?.[lang],
          link: `${process.env.CLIENT_SITE_URL}/listings/${acc.slug}`
        }));

      return res.status(200).json({ response: links });

    }

    const chatResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: query }],
    });
    return res.status(200).json({ response: chatResponse.choices[0].message.content });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

export default router;
