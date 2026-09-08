import ClientPage from "./ClientPage";

export async function generateMetadata({ params }) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/blog/slug/${params.slug}`,
      { cache: "no-store" } // ensure fresh data
    );

    if (!res.ok) {
      return {
        title: "Blog not found | Putko",
        description: "The blog you are looking for could not be found.",
      };
    }

    const blog = await res.json();

    return {
      title: blog.title || "Blog | Putko",
      description: blog.summary || blog.content?.slice(0, 150),
      openGraph: {
        title: blog.title,
        description: blog.summary || blog.content?.slice(0, 150),
        url: `https://putko.sk/blog/${params.slug}`,
        siteName: "Putko",
        type: "article",
        images: [
          {
            url: blog.image || "https://putko.sk/default-og-image.jpg",
            width: 1200,
            height: 630,
            alt: blog.title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: blog.title,
        description: blog.summary,
        images: [blog.image],
      },
    };
  } catch (error) {
    return {
      title: "Error loading blog | Putko",
      description: "There was an error while loading this blog post.",
    };
  }
}

export default function BlogDetailPage() {
  return <ClientPage />;
}
