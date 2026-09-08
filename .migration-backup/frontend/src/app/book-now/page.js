import BookNow from "./component/BookNow";

async function getStripeEnabledListings() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/recommended`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to load listings");
  }

  return res.json();
}

export default async function Page() {
  const listings = await getStripeEnabledListings();

  return <BookNow listings={listings} />;
}
