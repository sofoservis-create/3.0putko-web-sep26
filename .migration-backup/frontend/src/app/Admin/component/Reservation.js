"use client";
import React, { useEffect, useState } from 'react';
import Loading from '../../components/Loader/Loading.js';
import Error from '../../components/Error/Error.js';
import useFetchData from '../../hooks/useFetchData.js';
import RefundDialog from './RefundDialog.js';
import { formatCalendarDate } from '../../utlis/calendarDate';


const Reservation = () => {
  const [reservations, setReservations] = useState([]); // State to store the reservation data
  const [accommodationMap, setAccommodationMap] = useState({});
  // Booking currently open in the refund dialog, if any.
  const [refunding, setRefunding] = useState(null);
  const { data, loading, error } = useFetchData(`${process.env.NEXT_PUBLIC_BASE_URL}/reservation`); // Fetch reservation data

  const formatDateTime = (date) =>
  new Date(date).toLocaleString(); // date + time

  const centsToCurrency = (cents) =>
    cents ? `€${(cents / 100).toFixed(2)}` : "-";

  useEffect(() => {
    if (data) {
      setReservations(data); // Store the fetched reservation data
      console.log("Fetched reservation data:", data); // Debugging log to check the structure
    }
  }, [data]);

  useEffect(() => {
  if (!reservations.length) return;

  const fetchAccommodations = async () => {
    try {
      const ids = [...new Set(reservations.map(r => r.accommodationId))];

      const results = await Promise.all(
        ids.map(id =>
          fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/${id}`)
            .then(res => res.json())
        )
      );

      const map = {};
      results.forEach(acc => {
        map[acc._id] = acc;
      });

      setAccommodationMap(map);
    } catch (err) {
      console.error("Failed to load accommodations", err);
    }
  };

  fetchAccommodations();
}, [reservations]);


  const isPropertyDataReady =
  reservations.length > 0 &&
  Object.keys(accommodationMap).length > 0;


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
        <div className="w-full overflow-x-auto">
          

        <table className=" bg-white shadow-md rounded-lg ">
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
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">Created At</th>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">Payment Status</th>
              {/* <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">Total</th> */}
              {/* <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">Platform Fee</th>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">Stripe Fee</th> */}
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">Host Amount</th>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">Payout Status</th>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">Stripe</th>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">
                Property
              </th>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">Dispute</th>
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
                  {formatDateTime(res.createdAt)}
                </td>
                 {/* PAYMENT STATUS */}
                <td className="py-2 px-4">
                  <span
                    className={`px-2 py-1 rounded text-white text-xs ${
                      res.paymentStatus === "paid"
                        ? "bg-green-600"
                        : res.paymentStatus === "refunded"
                        ? "bg-yellow-600"
                        : "bg-red-600"
                    }`}
                  >
                    {res.paymentStatus}
                  </span>
                </td>

                {/* MONEY */}
                {/* <td className="py-2 px-4">{centsToCurrency(res.totalPriceCents)}</td> */}
                {/* <td className="py-2 px-4">{centsToCurrency(res.platformFeeCents)}</td>
                <td className="py-2 px-4">{centsToCurrency(res.stripeFeeCents)}</td> */}
                <td className="py-2 px-4">{centsToCurrency(res.hostAmountCents)}</td>

                {/* PAYOUT */}
                <td className="py-2 px-4">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      res.payoutStatus === "released"
                        ? "bg-green-500 text-white"
                        : res.payoutStatus === "failed"
                        ? "bg-red-500 text-white"
                        : "bg-gray-400 text-white"
                    }`}
                  >
                    {res.payoutStatus}
                  </span>
                </td>

                {/* STRIPE INFO */}
                <td className="py-2 px-4 text-xs">
                  <div>Payment Intent ID: {res.paymentIntentId || "-"}</div>
                  <div>TranferID: {res.transferId || "-"}</div>
                </td>

                <td className="py-2 px-4">
                  {accommodationMap[res.accommodationId]?.name || "—"}
                </td>

                {/* DISPUTE — Stripe webhooks record these; without a column they
                    landed in the database and nobody ever saw them. */}
                <td className="py-2 px-4 text-xs">
                  {res.disputeId ? (
                    <div>
                      <span className="px-2 py-1 rounded bg-orange-600 text-white">
                        {res.disputeStatus || "open"}
                      </span>
                      <div className="mt-1 text-gray-500">{res.disputeId}</div>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>

                {/* ACTIONS */}
                <td className="py-2 px-4">
                  {res.isApproved === "cancelled" ? (
                    <span className="text-xs text-gray-500">
                      cancelled
                      {res.refundAmountCents > 0 && ` · refunded ${centsToCurrency(res.refundAmountCents)}`}
                    </span>
                  ) : res.paymentStatus === "paid" ? (
                    <button
                      onClick={() => setRefunding(res)}
                      className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Refund…
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">not paid</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {refunding && (
        <RefundDialog
          reservation={refunding}
          onClose={() => setRefunding(null)}
          onDone={(result) =>
            // Reflect the outcome without a full refetch.
            setReservations((prev) =>
              prev.map((r) =>
                r._id === refunding._id
                  ? {
                      ...r,
                      isApproved: "cancelled",
                      refundAmountCents: result.refundAmountCents,
                      paymentStatus:
                        result.refundAmountCents >= (r.totalPriceCents || 0)
                          ? "refunded"
                          : result.refundAmountCents > 0
                          ? "partially_refunded"
                          : r.paymentStatus,
                    }
                  : r
              )
            )
          }
        />
      )}
    </div>
  );
};

export default Reservation;
