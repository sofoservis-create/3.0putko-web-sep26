import React, { useState, useEffect } from "react";
import ClientPage from "./component/ClientPage";

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api"}/blog`);
        const data = res.ok ? await res.json() : [];
        if (isMounted) {
          setPosts(data);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching blog posts:", error);
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return <div className="flex h-[100vh] items-center justify-center">Loading...</div>;
  }

  return <ClientPage posts={posts} />;
}
