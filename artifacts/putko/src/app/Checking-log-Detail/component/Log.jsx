"use client";
import React, { useEffect, useState } from "react";

const Log = () => {

  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showAll, setShowAll] = useState(false);    

    const groupHistoriesByDate = (historyList) => {
        const grouped = historyList.reduce((acc, item) => {
        const date = new Date(item.timestamp).toISOString().slice(0, 10);
        if (!acc[date]) acc[date] = { count: 0, logs: [] };
        acc[date].count++;
        acc[date].logs.push(item);
        return acc;
        }, {});
        return Object.entries(grouped)
        .map(([date, value]) => ({ date, ...value }))
        .sort((a, b) => b.date.localeCompare(a.date));
    };

  const fetchLoginHistories = async () => {
    try {
      setLoading(true);
      let url = `${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/login-histories`;

      if (!showAll && fromDate && toDate) {
        url = `${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/login-histories/filter?startDate=${fromDate}&endDate=${toDate}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Failed to fetch login histories");

      const items = showAll ? data.histories : data.filteredHistories;
      setHistories(groupHistoriesByDate(items || []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

   useEffect(() => {
    
        fetchLoginHistories();
     
    }, [fromDate, toDate, showAll]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
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
                  max={toDate}
                  className="border rounded px-2 py-1"
                />
              </label>
              <label className="flex flex-col text-gray-700 text-sm">
                To:
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  min={fromDate}
                  className="border rounded px-2 py-1"
                />
              </label>
            </div>
          )}
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? "Filter by Date" : "Show All"}
          </button>
        </div>

        {histories.length === 0 ? (
          <p className="text-gray-500 text-center">No login records found.</p>
        ) : (
          histories.map(({ date, count, logs }) => (
            <div key={date} className="mb-6">
              <h3 className="text-lg font-bold mb-2">{date} ({count} login{count > 1 ? "s" : ""})</h3>
              <ul className="space-y-2">
                {logs.map((log) => (
                  <li key={log._id} className="p-3 bg-gray-50 border rounded">
                    <div className="text-sm">
                      <strong>Name:</strong> {log.hostId?.name || "Unknown"}
                    </div>
                    <div className="text-sm">
                      <strong>Email:</strong>{log.hostId?.email}
                    </div>
                    <div className="text-sm">
                      <strong>Login Time:</strong> {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <div className="text-sm">
                      <strong>IP:</strong> {log.ip || "N/A"}
                    </div>
                    <div className="text-sm">
                      <strong>User Agent:</strong> {log.userAgent || "N/A"}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
    </div>
  )
}

export default Log
