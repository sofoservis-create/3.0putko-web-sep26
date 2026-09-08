import React, { useState, useEffect } from "react";
import { useParams } from "@/app/components/NextNavigation";
import ClientPage from "./ClientPage";

export default function Page() {
  const params = useParams();
  const [data, setData] = useState({
    hostData: null,
    accommodationData: [],
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const id = params.id;
        if (!id) return;
        
        const [hostRes, accRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api"}/hosts/${id}`),
          fetch(`${import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api"}/accommodation/user/${id}`)
        ]);

        const hostData = hostRes.ok ? await hostRes.json() : null;
        const accommodationData = accRes.ok ? await accRes.json() : [];

        if (isMounted) {
          setData({
            hostData,
            accommodationData,
            loading: false,
          });
        }
      } catch (error) {
        console.error("Error fetching host details:", error);
        if (isMounted) setData(prev => ({ ...prev, loading: false }));
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, [params.id]);

  if (data.loading) {
    return <div className="flex h-[100vh] items-center justify-center">Loading...</div>;
  }

  return (
    <ClientPage 
      hostData={data.hostData} 
      accommodationData={data.accommodationData} 
      params={params} 
    />
  );
}
