"use client";
import React, { useState, useEffect } from "react";
import useFetchData from "../../hooks/useFetchData";
import { toast } from "react-toastify";
import Loading from "../../components/Loader/Loading";
import Error from "../../components/Error/Error";

const Accommodation = () => {
  const [accommodations, setAccommodations] = useState([]);
  const { data, loading, error } = useFetchData(
    `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation`
  );

  useEffect(() => {
    if (data) {
      setAccommodations(data);
    }
  }, [data]);

  const handleDelete = async (id) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast.success("Accommodation deleted successfully");
        setAccommodations(accommodations.filter((acc) => acc._id !== id));
      } else {
        toast.error(result.message || "Failed to delete accommodation");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Accommodation List</h2>

      {loading && <Loading />}
      {error && <Error error={error} />}

      {!loading && !error && accommodations?.length === 0 && (
        <p>No accommodations found</p>
      )}

      {!loading && !error && accommodations?.length > 0 && (
        <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-200">
              <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase">
                Image
              </th>
              <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase">
                Title
              </th>
              <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase">
                User Info
              </th>
              <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase">
                Actions
              </th>
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
                      className="w-20 h-20 object-cover rounded-md shadow-sm"
                    />
                  ) : (
                    "No Image"
                  )}
                </td>
                <td className="py-3 px-4">{acc.name?.length > 30 ? `${acc.name.substring(0, 30)}...` : acc.name || "No Title"}</td>
                <td className="py-3 px-4">
                  {acc.userId ? (
                    <div>
                      <p className="font-semibold">{acc.userId.name || "No Name"}</p>
                      <p className="text-gray-500 text-sm">{acc.userId.email || "No Email"}</p>
                    </div>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => handleDelete(acc._id)}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
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

export default Accommodation;
