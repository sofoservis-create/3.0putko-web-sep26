import ClientPage from "./ClientPage";

// ✅ SSR metadata for SEO
export async function generateMetadata({ params }) {
  const { id } = params;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/hosts/${id}`, {
      cache: "no-store", // always fresh
    });

    if (!res.ok) throw new Error("Host not found");

    const hostData = await res.json();

    return {
      title: `${hostData.name} - Putko`,
      description: `Ubytovanie od hostiteľa ${hostData.name}`,
      alternates: {
        canonical: `https://putko.sk/host-detail/${id}`,
      },
      keywords: [
        hostData.name,
        "vacation rental host",
        "Putko stays",
        hostData.languag || "Slovak",
      ],
      openGraph: {
        title: `${hostData.name} | Putko`,
        description: hostData.aboutYou || "",
        url: `https://putko.sk/host-detail/${id}`,
        images: hostData.photo ? [hostData.photo] : [],
      },
    };
  } catch {
    return {
      title: "Host - Putko",
      description: "The host profile you are looking for could not be found.",
      alternates: {
        canonical: `https://putko.sk/host-detail/${id}`,
      },
    };
  }
}

// ✅ Fetch all data here (SSR)
export default async function Page({ params }) {
  const { id } = params;

  let hostData = null;
  let accommodationData = [];

  try {
    const [hostRes, accommodationRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/hosts/${id}`, { cache: "no-store" }),
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/user/${id}`, { cache: "no-store" }),
    ]);

    if (hostRes.ok) hostData = await hostRes.json();
    if (accommodationRes.ok) accommodationData = await accommodationRes.json();
  } catch (error) {
    console.error("Error fetching data:", error);
  }

  return <ClientPage hostData={hostData} accommodationData={accommodationData} params={params} />;
}
