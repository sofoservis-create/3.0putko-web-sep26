import React from "react";
import { useParams } from "@/app/components/NextNavigation";
import CanonicalListingPage from "../../testlisting/page";

export default function Page() {
  const params = useParams();
  return <CanonicalListingPage slug={params.details} />;
}
