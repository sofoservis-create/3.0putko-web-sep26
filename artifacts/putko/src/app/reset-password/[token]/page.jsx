import ResetPasswordClient from "./ResetPasswordClient";

// Server Component
export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <ResetPasswordClient />;
}
