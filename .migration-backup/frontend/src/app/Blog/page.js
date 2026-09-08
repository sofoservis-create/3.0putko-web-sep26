import ClientPage from "./component/ClientPage";

// Metadata works here because it's a server component
export const metadata = {
  title: "Blog – Najnovšie články",
  description: "Buďte v obraze s najnovšími článkami, sprievodcami a užitočnými tipmi.",
  openGraph: {
    title: "Blog – Najnovšie články",
    description: "Buďte v obraze s najnovšími článkami, sprievodcami a užitočnými tipmi.",
    url: "https://putko.sk/blog",
    siteName: "Putko",
    type: "website",
  },
};

export default async function BlogPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blog`, {
    next: { revalidate: 604800 } 
  });
  const posts = res.ok ? await res.json() : [];

  return <ClientPage posts={posts} />;
}
