import React, { useState, useEffect } from "react";
import BookNow from "./component/BookNow";

export default function Page() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api"}/accommodation/recommended`);
        const data = res.ok ? await res.json() : [];
        if (isMounted) {
          setListings(data);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching listings:", error);
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return <div className="flex h-[100vh] items-center justify-center">Loading...</div>;
  }

  return <BookNow listings={listings} />;
}
