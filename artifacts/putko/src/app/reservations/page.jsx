"use client";
import React, { useEffect, useState } from 'react';
import Loading from '../components/Loader/Loading';
import Error from '../components/Error/Error';
import useFetchData from '../hooks/useFetchData';
import { toast } from 'react-toastify';
import Login from './component/Login';
import Header from '../components/Header';
import Footer from '../components/Footer/Footer';

const ReservationPage = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    if (!isAuthenticated) {
        return (
            <div className='max-w-[1920px] mx-auto'>
                <Header />
                <div className='my-44'>
                    <Login onLoginSuccess={() => setIsAuthenticated(true)} />
                </div>
                <Footer />
            </div>
        );
    }

    return <ReservationList />;
};

const ReservationList = () => {
    const [reservations, setReservations] = useState([]);
    const [accommodationMap, setAccommodationMap] = useState({});
    const { data, loading, error } = useFetchData(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/reservation`);

    // Sends payment email manually
    const handleSendPaymentEmail = async (reservationId) => {
        try {
            const toastId = toast.loading("Sending payment email...");
            const res = await fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/payments/send-payment-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reservationId }),
            });
            const result = await res.json();

            toast.dismiss(toastId);

            if (res.ok) {
                toast.success(result.message || "Email sent successfully!");
            } else {
                toast.error(result.error || "Failed to send email.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong.");
        }
    };

    // Filter States
    const [searchTerm, setSearchTerm] = useState("");
    const [filterPaymentStatus, setFilterPaymentStatus] = useState("All");
    const [filterPayoutStatus, setFilterPayoutStatus] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All"); // Approved/Pending
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [sortBy, setSortBy] = useState("newest"); // Default sort: Newest Created

    const formatDateTime = (date) => {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? "PM" : "AM";

        hours = hours % 12;
        hours = hours ? hours : 12; // 0 -> 12
        const strHours = String(hours).padStart(2, '0');

        return `${day}-${month}-${year} ${strHours}:${minutes} ${ampm}`;
    };

    

    const centsToCurrency = (cents) => cents ? `€${(cents / 100).toFixed(2)}` : "-";

    const formatDate = (date) => {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const year = d.getFullYear();
        return `${day}-${month}-${year}`; // DD-MM-YYYY
    };

    useEffect(() => {
        if (data) {
            setReservations(data);
        }
    }, [data]);

    useEffect(() => {
        if (!reservations.length) return;

        const fetchAccommodations = async () => {
            try {
                const ids = [...new Set(reservations.map(r => r.accommodationId))];
                const results = await Promise.all(
                    ids.map(id =>
                        fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/accommodation/${id}`)
                            .then(res => res.json())
                    )
                );
                const map = {};
                results.forEach(acc => { map[acc._id] = acc; });
                setAccommodationMap(map);
            } catch (err) {
                console.error("Failed to load accommodations", err);
            }
        };
        fetchAccommodations();
    }, [reservations]);


    // Filtering & Sorting Logic
    const filteredReservations = reservations.filter(res => {
        const propertyName = accommodationMap[res.accommodationId]?.name || "";
        const matchesSearch =
            res.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            res.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            res.paymentIntentId?.includes(searchTerm) ||
            res.transferId?.includes(searchTerm);

        const matchesPayment = filterPaymentStatus === "All" || res.paymentStatus === filterPaymentStatus;
        const matchesPayout = filterPayoutStatus === "All" || res.payoutStatus === filterPayoutStatus;

        // Status Filter (Approved/Pending)
        let matchesStatus = true;
        if (filterStatus !== "All") {
            const isApproved =
                (typeof res.isApproved === "string" && res.isApproved.toLowerCase() === "approved") ||
                res.isApproved === true;

            if (filterStatus === "approved") matchesStatus = isApproved;
            if (filterStatus === "pending") matchesStatus = !isApproved;
        }

        // Date Filter (Check-in Range)
        let matchesDate = true;
        if (startDate && endDate) {
            const checkIn = new Date(res.checkInDate);
            const start = new Date(startDate);
            const end = new Date(endDate);
            // Set end date to end of day to include selection
            end.setHours(23, 59, 59, 999);
            matchesDate = checkIn >= start && checkIn <= end;
        } else if (startDate) {
            const checkIn = new Date(res.checkInDate);
            const start = new Date(startDate);
            matchesDate = checkIn >= start;
        } else if (endDate) {
            const checkIn = new Date(res.checkInDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchesDate = checkIn <= end;
        }

        return matchesSearch && matchesPayment && matchesPayout && matchesStatus && matchesDate;
    }).sort((a, b) => {
        if (sortBy === "newest") {
            return new Date(b.createdAt) - new Date(a.createdAt);
        } else if (sortBy === "oldest") {
            return new Date(a.createdAt) - new Date(b.createdAt);
        } else if (sortBy === "checkin_soonest") {
            return new Date(a.checkInDate) - new Date(b.checkInDate);
        } else if (sortBy === "checkin_latest") {
            return new Date(b.checkInDate) - new Date(a.checkInDate);
        }
        return 0;
    });

    const isPropertyDataReady = reservations.length > 0 && Object.keys(accommodationMap).length > 0;


    return (
        <div className="p-4 max-w-full">
            <h2 className="text-xl font-bold mb-4"> Putko Reservation Summary</h2>

            {/* Loading / Error */}
            {loading && <Loading />}
            {error && <Error message={error} />}

            {!loading && !error && (
                <div className="w-full shadow-md rounded-lg bg-white">

                    {/* FILTERS AREA */}
                    <div className='p-4 border-b border-gray-200 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between'>
                        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-wrap items-center">
                            {/* Search */}
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-48"
                            />

                            {/* Status */}
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="All">All Status</option>
                                <option value="approved">Approved</option>
                                <option value="pending">Pending</option>
                            </select>

                            {/* Date Range */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">From:</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="px-2 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">To:</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="px-2 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>

                            {/* Payment Status */}
                            <select
                                value={filterPaymentStatus}
                                onChange={(e) => setFilterPaymentStatus(e.target.value)}
                                className="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="All">All Payment Status</option>
                                <option value="paid">Paid</option>
                                <option value="unpaid">Unpaid</option>
                                <option value="refunded">Refunded</option>
                            </select>

                            {/* Payout Status */}
                            <select
                                value={filterPayoutStatus}
                                onChange={(e) => setFilterPayoutStatus(e.target.value)}
                                className="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="All">All Payout Status</option>
                                <option value="released">Released</option>
                                <option value="failed">Failed</option>
                                <option value="pending">pending</option>
                            </select>

                            {/* Sort By */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-gray-50"
                            >
                                <option value="newest">Sort: Newest Created (Latest)</option>
                                <option value="oldest">Sort: Oldest Created</option>
                                <option value="checkin_soonest">Sort: Earliest Check-in</option>
                                <option value="checkin_latest">Sort: Latest Check-in</option>
                            </select>
                        </div>

                    </div>


                    {/* TABLE AREA */}
                    {filteredReservations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {reservations.length === 0 ? "No reservations found." : "No reservations match your filters."}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full bg-white whitespace-nowrap">
                                <thead>
                                    <tr className="bg-gray-200 text-gray-600 uppercase text-xs leading-normal">
                                        <th className="py-3 px-6 text-left">Check In</th>
                                        <th className="py-3 px-6 text-left">Check Out</th>
                                        <th className="py-3 px-6 text-left">Name</th>
                                        <th className="py-3 px-6 text-left">Email</th>
                                        <th className="py-3 px-6 text-left">Phone</th>
                                        <th className="py-3 px-6 text-left">Persons</th>
                                        <th className="py-3 px-6 text-left">Total Price</th>
                                        <th className="py-3 px-6 text-left">Status</th>
                                        <th className="py-3 px-6 text-left">Payment Status</th>
                                        <th className="py-3 px-6 text-left">Host Amount (€)</th>
                                        <th className="py-3 px-6 text-left">Payout Status</th>
                                        <th className="py-3 px-6 text-left">Property</th>
                                        <th className="py-3 px-6 text-left">Created At</th>
                                        <th className="py-3 px-6 text-left">Payment Intent ID</th>
                                        <th className="py-3 px-6 text-left">Transfer ID</th>
                                        <th className="py-3 px-6 text-left">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600 text-sm font-light">
                                    {filteredReservations.map((res) => (
                                        <tr key={res._id} className="border-b border-gray-200 hover:bg-gray-100">
                                            <td className="py-3 px-6 text-left">{formatDate(res.checkInDate)}</td>
                                            <td className="py-3 px-6 text-left">{formatDate(res.checkOutDate)}</td>
                                            <td className="py-3 px-6 text-left">{res.name}</td>
                                            <td className="py-3 px-6 text-left">{res.email}</td>
                                            <td className="py-3 px-6 text-left">{res.phone}</td>
                                            <td className="py-3 px-6 text-left">{res.numberOfPersons}</td>
                                            <td className="py-3 px-6 text-left">{res.totalPrice}</td>
                                            <td className="py-3 px-6 text-left">{res.isApproved}</td>

                                            {/* Payment Status */}
                                            <td className="py-3 px-6 text-left">
                                                <span className={`px-3 py-1 rounded-full text-xs ${res.paymentStatus === "paid" ? "bg-green-200 text-green-600" :
                                                    res.paymentStatus === "refunded" ? "bg-yellow-200 text-yellow-600" :
                                                        "bg-red-200 text-red-600"
                                                    }`}>
                                                    {res.paymentStatus}
                                                </span>
                                            </td>

                                            <td className="py-3 px-6 text-left">{centsToCurrency(res.hostAmountCents)}</td>

                                            {/* Payout Status */}
                                            <td className="py-3 px-6 text-left">
                                                <span className={`px-3 py-1 rounded-full text-xs ${res.payoutStatus === "released" ? "bg-green-200 text-green-600" :
                                                    res.payoutStatus === "failed" ? "bg-red-200 text-red-600" :
                                                        "bg-gray-200 text-gray-600"
                                                    }`}>
                                                    {res.payoutStatus}
                                                </span>
                                            </td>

                                            <td className="py-3 px-6 text-left">{accommodationMap[res.accommodationId]?.name || "—"}</td>
                                            <td className="py-3 px-6 text-left">{formatDateTime(res.createdAt)}</td>
                                            <td className="py-3 px-6 text-left text-xs">{res.paymentIntentId || "-"}</td>
                                            <td className="py-3 px-6 text-left text-xs">{res.transferId || "-"}</td>
                                            <td className="py-3 px-6 text-left">
                                                {res.paymentStatus === "unpaid" && (
                                                    <button
                                                        onClick={() => handleSendPaymentEmail(res._id)}
                                                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-3 rounded shadow transition duration-200"
                                                    >
                                                        Send Email
                                                    </button>
                                                )}
                                                {res.paymentStatus === "paid" && (
                                                    <span className="text-xs text-green-500 font-semibold">Paid</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReservationPage;