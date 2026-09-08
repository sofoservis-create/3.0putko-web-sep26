import PayPageClient from "./PayPageClient";

// Server Component
export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <PayPageClient />;
}
