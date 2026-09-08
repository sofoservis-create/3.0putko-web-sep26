import React, { useEffect, useState } from "react";

const HostLog = () => {
  const [hosts, setHosts] = useState([]);
  const [filteredHostsByDate, setFilteredHostsByDate] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // States for date filter inputs
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Show all data toggle
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchHosts = async () => {
      try {
        const response = await fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/hosts/latest`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch host data");
        }
        setHosts(data.hosts || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHosts();
  }, []);

  // Function to group hosts by date string YYYY-MM-DD
  const groupHostsByDate = (hostList) => {
    const grouped = hostList.reduce((acc, host) => {
      const day = new Date(host.lastLoginAt).toISOString().slice(0, 10);
      if (!acc[day]) acc[day] = { count: 0, hosts: [] };
      acc[day].count++;
      acc[day].hosts.push(host);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([date, value]) => ({ date, ...value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Filter & group hosts when dates or hosts data changes or when toggling showAll
  useEffect(() => {
    if (showAll) {
      // Show all hosts grouped by date
      setFilteredHostsByDate(groupHostsByDate(hosts));
    } else {
      // Show filtered hosts by date or empty if no dates selected
      if (!fromDate || !toDate) {
        setFilteredHostsByDate([]);
        return;
      }

      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999); // Include entire toDate day

      // Filter hosts within date range
      const filtered = hosts.filter(({ lastLoginAt }) => {
        const loginDate = new Date(lastLoginAt);
        return loginDate >= from && loginDate <= to;
      });

      setFilteredHostsByDate(groupHostsByDate(filtered));
    }
  }, [fromDate, toDate, hosts, showAll]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white shadow-md rounded-md">
      <h2 className="text-2xl font-semibold mb-6 text-center">Host Login Activity</h2>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
        {!showAll && (
          <div className="flex gap-4 items-center">
            <label className="flex flex-col text-gray-700 text-sm">
              From:
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                max={toDate || undefined}
                className="mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex flex-col text-gray-700 text-sm">
              To:
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate || undefined}
                className="mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
        )}

        <button
          onClick={() => setShowAll(!showAll)}
          className="px-5 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
        >
          {showAll ? "Show Filtered Logins" : "Show All Logins"}
        </button>
      </div>

      {!filteredHostsByDate.length ? (
        <p className="text-center text-gray-500">
          {showAll ? "No host login data available." : "No host login data for selected date range."}
        </p>
      ) : (
        filteredHostsByDate.map(({ date, count, hosts }) => (
          <div key={date} className="mb-8 p-4 border rounded-lg shadow-sm hover:shadow-md transition">
            <h3 className="text-lg font-bold mb-3 text-blue-700">
              {date} — {count} login{count > 1 ? "s" : ""}
            </h3>
            <ul className="space-y-3">
              {hosts.map((host, idx) => (
                <li
                  key={idx}
                  className="p-4 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 transition"
                >
                  <p>
                    <strong>Name:</strong> {host.name}
                  </p>
                  <p>
                    <strong>Email:</strong> {host.email}
                  </p>
                  <p>
                    <strong>Last Login:</strong> {new Date(host.lastLoginAt).toLocaleString()}
                  </p>
                  <p>
                    <strong>IP Address:</strong> {host.lastLoginIP}
                  </p>
                  <p>
                    <strong>User Agent:</strong> {host.lastUserAgent}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
};

export default HostLog;
