import EmailClient from "./EmailClient";


// Server Component
export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <EmailClient />;
}
