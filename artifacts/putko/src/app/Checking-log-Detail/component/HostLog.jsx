"use client";
import Link from "@/app/components/NextLink";
import React, { useEffect, useState } from "react";

const HostLog = () => {
  const [hosts, setHosts] = useState([]);
  const [accommodations, setAccommodations] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHostsAndAccommodations = async () => {
      try {
        const res = await fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/hosts`);
        const hostsData = await res.json();
        console.log("HOSTS RESPONSE:", hostsData);

        const hostsArray = Array.isArray(hostsData)
        ? hostsData
        : hostsData.data || hostsData.hosts || [];

        if (!Array.isArray(hostsArray)) {
        throw new Error("Hosts data is not an array");
        }

        setHosts(hostsArray);


        const accMap = {};
        await Promise.all(
        hostsArray.map(async (host) => {
            try {
            const res = await fetch(
                `${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/accommodation/user/${host._id}`
            );
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
                accMap[host._id] = data.map((acc) => acc.slug || "(no slug)");
            } else {
                accMap[host._id] = [];
            }
            } catch (err) {
            console.error(`Failed to fetch accommodations for host ${host._id}`, err);
            accMap[host._id] = [];
            }
        })
        );

        // Sort hosts by number of accommodations (descending)
        const sortedHosts = [...hostsArray].sort((a, b) => {
        const countA = accMap[a._id]?.length || 0;
        const countB = accMap[b._id]?.length || 0;
        return countB - countA;
        });

        setAccommodations(accMap);
        setHosts(sortedHosts);

        
      } catch (err) {
        console.error("Error fetching hosts or accommodations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHostsAndAccommodations();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Hosts and their Accommodations</h2>
      <p className="text-lg font-bold text-gray-600 mb-4">
      Total Hosts: {hosts.length}
    </p>
    <ul className="space-y-4">
    {hosts.map((host, index) => (
        <li key={host._id} className="p-4 border rounded bg-gray-50">
        <div className="font-semibold text-lg">
            {index + 1}. {host.name}
        </div>
        <div className="text-sm text-gray-600">{host.email}</div>
        <div className="mt-2">
            <strong>Property URL:</strong>
            {(accommodations[host._id] && accommodations[host._id].length > 0) ? (
            <ul className="list-disc list-inside text-sm text-gray-700">
                {accommodations[host._id].map((slug, idx) => (
                <li key={idx}>
                    <Link href={`https://www.putko.sk/listings/${slug}`}>
                    https://www.putko.sk/listings/{slug}
                    </Link>
                </li>
                ))}
            </ul>
            ) : (
            <div className="text-sm text-red-500">No accommodations found for this host.</div>
            )}
        </div>
        </li>
    ))}
    </ul>

    </div>
  );
};

export default HostLog;
