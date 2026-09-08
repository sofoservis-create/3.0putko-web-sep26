"use client";
import React, { useEffect, useState } from 'react';
import Loading from '../../components/Loader/Loading';
import Error from '../../components/Error/Error';
import useFetchData from '../../hooks/useFetchData';
import { toast } from 'react-toastify';
import { formatCalendarDate } from '../../utlis/calendarDate';

const DeletedReservation = () => {
  const [reservations, setReservations] = useState([]); // State to store the reservation data
  const { data, loading, error } = useFetchData(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/reservation/deleted`); // Fetch reservation data

  useEffect(() => {
    if (data) {
      setReservations(data); // Store the fetched reservation data
      console.log("Fetched reservation data:", data); // Debugging log to check the structure
    }
  }, [data]);

  // Function to delete a reservation by ID
  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/reservation/delete/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Reservation deleted successfully');
        setReservations(reservations.filter(res => res._id !== id)); // Remove the deleted reservation from the state
      } else {
        console.error(result.message || 'Failed to delete reservation');
        toast.error(result.message || 'Failed to delete reservation');
      }
    } catch (error) {
      console.error('Error during deletion:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const handleRestore = async (id) => {
      try {
        const response = await fetch(
          `${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/reservation/restore/${id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
  
        if (!response.ok) {
          throw new Error("Failed to restore reservation");
        }
  
        toast.success("Reservation restored successfully!");
        window.location.reload();
  
      } catch (error) {
        toast.error(error.message || "An error occurred");
      }
    };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Reservation List</h2>

      {/* Loading state */}
      {loading && <Loading />} {/* Use your loader component here */}
      {error && <Error message={error} />} {/* Use your error component here */}

      {/* Display a message if no reservations are found */}
      {!loading && !error && reservations.length === 0 && <p>No reservations found</p>}

      {/* Reservation table */}
      {!loading && !error && reservations.length > 0 && (
        <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
          <thead>
            <tr>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">Check In</th>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">Check Out</th>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">Name</th>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">Email</th>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">Phone</th>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">Number of Persons</th>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">Total Price</th>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">Approved</th>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((res) => (
              <tr key={res._id} className="border-b">
                <td className="py-2 px-4">{formatCalendarDate(res.checkInDate)}</td>
                <td className="py-2 px-4">{formatCalendarDate(res.checkOutDate)}</td>
                <td className="py-2 px-4">{res.name}</td>
                <td className="py-2 px-4">{res.email}</td>
                <td className="py-2 px-4">{res.phone}</td>
                <td className="py-2 px-4">{res.numberOfPersons}</td>
                <td className="py-2 px-4">{res.totalPrice}</td>
                <td className="py-2 px-4">{res.isApproved}</td>
                <td className="py-2 px-4">
                  <button
                    onClick={() => handleRestore(res._id)}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => handleDelete(res._id)}
                    className="bg-red-600 text-white px-4 py-2 rounded"
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

export default DeletedReservation;
