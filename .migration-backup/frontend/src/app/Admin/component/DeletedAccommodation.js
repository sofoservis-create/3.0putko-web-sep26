"use client";
import React, { useState, useEffect } from "react";
import useFetchData from "../../hooks/useFetchData";
import { toast } from "react-toastify";
import Loading from "../../components/Loader/Loading";
import Error from "../../components/Error/Error";

const DeletedAccommodation = () => {
  const [accommodations, setAccommodations] = useState([]);
  const { data, loading, error, refetch } = useFetchData(
    `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/deleted`
  );

  // Debug log
  useEffect(() => {
    console.log("📡 Fetched Data:", data);
    console.log("Loading:", loading, "Error:", error);
    if (data) {
      setAccommodations(Array.isArray(data) ? data : []);
    }
  }, [data, loading, error]);

  const handleRestore = async (id) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/restore/${id}`,
        { method: "PUT", headers: { "Content-Type": "application/json" } }
      );

      if (!response.ok) throw new Error("Restore failed");

      setAccommodations((prev) => prev.filter((acc) => acc._id !== id));
      toast.success("Accommodation restored successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to restore");
    }
  };

  const handleDeletePermanently = async (id) => {
    if (!confirm("Permanently delete this item?")) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/deleted/${id}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Delete failed");

      setAccommodations((prev) => prev.filter((acc) => acc._id !== id));
      toast.success("Permanently deleted!");
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Deleted Accommodations</h2>
        <button
          onClick={refetch}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {loading && <Loading />}
      {error && <Error error={error} />}

      {!loading && !error && accommodations.length === 0 && (
        <p className="text-gray-500">No deleted accommodations found.</p>
      )}

      {!loading && !error && accommodations.length > 0 && (
        <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
          {/* Table content same as before */}
          <thead>
            <tr className="bg-gray-200">
              <th className="py-3 px-4 text-left">Image</th>
              <th className="py-3 px-4 text-left">Title</th>
              <th className="py-3 px-4 text-left">User Info</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accommodations.map((acc) => (
              <tr key={acc._id} className="border-b">
                <td className="py-3 px-4">
                  {acc.images?.[0] ? (
                    <img
                      src={acc.images[0]}
                      alt="Accommodation"
                      className="w-20 h-20 object-cover rounded"
                    />
                  ) : (
                    "No Image"
                  )}
                </td>
                <td className="py-3 px-4">{acc.name || "No Title"}</td>
                <td className="py-3 px-4">
                  {acc.userId?.name} <br />
                  <span className="text-sm text-gray-500">{acc.userId?.email}</span>
                </td>
                <td className="py-3 px-4 space-x-2">
                  <button
                    onClick={() => handleRestore(acc._id)}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => handleDeletePermanently(acc._id)}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DeletedAccommodation;