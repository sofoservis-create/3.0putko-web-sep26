import { redirect } from "next/navigation";
import ClientPage from "./ClientPage";

// ✅ Fetch accommodation data
async function getAccommodation(slug) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/slug/${slug}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  return res.json();
}

// --- Fetch all accommodations by userId
async function getUserAccommodations(userId) {
  if (!userId) return [];
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/user/${userId}`,
    { cache: "no-store" }
  );
  if (!res.ok) return [];
  return res.json();
}

// ✅ Fetch host details
async function getHost(userId) {
  if (!userId) return null;
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/hosts/${userId}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  return res.json();
}

// ✅ Fetch accommodation reviews
async function getReviews(accommodationId) {
  if (!accommodationId) return [];
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/reviews/${accommodationId}`,
    { cache: "no-store" }
  );
  if (!res.ok) return [];
  return res.json();
}

// ✅ SSR: Metadata (title, desc, OG, Twitter, canonical)
export async function generateMetadata({ params }) {
  const accommodation = await getAccommodation(params.details);

  if (!accommodation) {
    return {
      title: "Accommodation not found - Putko",
      description: "The accommodation you are looking for could not be found.",
      alternates: {
        canonical: `https://putko.sk/listings/${params.details}`,
      },
    };
  }

  const title = `${accommodation.name || "Accommodation"} - Putko`;
  const description =
    accommodation.description?.slice(0, 160) ||
    `Book ${accommodation.name} on Putko.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://putko.sk/listings/${params.details}`,
    },
    openGraph: {
      title,
      description,
      url: `https://putko.sk/listings/${params.details}`,
      siteName: "Putko",
      type: "website",
      images: accommodation.images?.length
        ? [
            {
              url: accommodation.images[0], // ✅ first image only
              width: 1200,
              height: 630,
              alt: accommodation.name,
            },
          ]
        : [
            {
              url: "https://putko.sk/default-og-image.jpg",
              width: 1200,
              height: 630,
              alt: accommodation.name || "Accommodation",
            },
          ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: accommodation.images?.length
        ? [accommodation.images[0]]
        : ["https://putko.sk/default-og-image.jpg"],
    },
  };
}

// ✅ Generate Structured Data JSON-LD
function generateStructuredData(accommodation, params) {
  const baseUrl = "https://putko.sk";
  const listingUrl = `${baseUrl}/listings/${params.details}`;

  // 🔹 Normalize country
  let country = accommodation.locationDetails?.country || "SK";
  if (country.toLowerCase().includes("sololkiya")) {
    country = "Slovakia"; // or "SK" depending on preference
  }

  return {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    "@id": listingUrl,
    name: accommodation.name,
    description: accommodation.description,
    url: listingUrl,
    image: accommodation.images?.map((img) => ({
      "@type": "ImageObject",
      url: img,
      caption: accommodation.name,
    })),
    telephone: accommodation.phoneNumber || "",
    address: {
      "@type": "PostalAddress",
      streetAddress: accommodation.locationDetails?.streetAndNumber || "",
      addressLocality: accommodation.locationDetails?.city || "",
      postalCode: accommodation.locationDetails?.zipCode || "",
      addressCountry: accommodation.locationDetails?.country || "SK",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: accommodation.location?.latitude || "",
      longitude: accommodation.location?.longitude || "",
    },
    numberOfRooms: accommodation.bedroom || 1,
    occupancy: {
      "@type": "QuantitativeValue",
      maxValue: accommodation.person || 1,
    },
    checkinTime: accommodation.arrivalFrom || "15:00",
    checkoutTime: accommodation.departureTo || "11:00",
    provider: {
      "@type": "Organization",
      name: "Putko",
      url: baseUrl,
    },
  };
}

// ✅ Page Component (SSR)
export default async function Page({ params }) {
  const accommodation = await getAccommodation(params.details);

  if (!accommodation) {
    redirect("/listing-stay-map");
  }

   const userId = accommodation?.userId?._id;
  const accommodationId = accommodation?._id;

  // 🔹 Parallel fetch for better performance
  const [userAccommodations, host, reviews] = await Promise.all([
    getUserAccommodations(userId),
    getHost(userId),
    getReviews(accommodationId),
  ]);
  // Build structured data
  const structuredData = generateStructuredData(accommodation, params);

  return (
    <>
      {/* Structured Data JSON-LD (SSR) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData, null, 2),
        }}
      />

      {/* Your main UI */}
      <ClientPage 
        accommodation={accommodation} 
        userAccommodations={userAccommodations} 
        host={host}
        reviewsRating={reviews}
      />
    </>
  );
}
