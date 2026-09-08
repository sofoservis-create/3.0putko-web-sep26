import Client from "./component/Client";

// Server Component
export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};


export default function Page() {
  return <Client />;
}
