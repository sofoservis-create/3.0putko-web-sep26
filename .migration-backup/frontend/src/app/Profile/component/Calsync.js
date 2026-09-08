"use client"
import React, { useEffect, useState, useContext } from 'react';
import useFetchData from '../../hooks/useFetchData';
import { AuthContext } from '../../context/AuthContext';
import en from '../../locales/en';
import sk from '../../locales/sk';
import { FormContext } from '../../FormContext';
import { CalendarDays, Moon, Download, Home, CalendarX2, AlertCircle } from "lucide-react";

const Calsync = () => {
    const { user } = useContext(AuthContext);
    const userId = user?._id; // Optional chaining to safely access user ID
    const [accommodationData, setAccommodationData] = useState([]);
    const [error, setError] = useState(null);
    const [calendarId, setCalendarId] = useState(null);
    const [secretToken, setSecretToken] = useState(null);
    const [bookings, setBookings] = useState([]); // State for bookings
    const translations = { en, sk }
        
      const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
      const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"
            
        // Update language state when `lang` changes in FormContext
        useEffect(() => {
          setLanguage(lang || "sk");
        }, [lang]);
            
    const t = translations[language];

    // Fetch accommodation data
    const { data, loading, error: fetchError } = useFetchData(`${process.env.NEXT_PUBLIC_BASE_URL}/accommodation/user/${userId}`);

    useEffect(() => {
        if (fetchError) {
            console.error("Error fetching accommodation data:", fetchError);
            setError(`${t.Failedtofetchaccommodationdata}`);
        } else if (data) {
            setAccommodationData(data);
            extractCalendarInfo(data); // Extract calendarId and secretToken
        }
    }, [data, fetchError]);
    const extractCalendarInfo = (data) => {
        if (data && data.length > 0) {
            let url = data[0]?.url; // Assuming the URL for the calendar is in the first accommodation object
    
            if (url) {
                // Add protocol if missing
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = `https://${url}`;
                }
    
                try {
                    const urlParts = new URL(url);
                    const params = new URLSearchParams(urlParts.search);
                    
                    // Extract calendarId and secretToken from the URL
                    const id = urlParts.pathname.split('/').pop().split('.')[0]; // Extracts the ID before .ics
                    const token = params.get('s'); // Assuming 's' is the parameter for the secret token
                    
                    // Log URL, calendarId, and secretToken
                    console.log('Calendar URL:', url);
                    console.log('Extracted Calendar ID:', id);
                    console.log('Extracted Secret Token:', token); 
                    
                    setCalendarId(id);
                    setSecretToken(token);
                } catch (error) {
                    console.error('Invalid URL format:', error);
                }
            }
        }
    };
    

    // Fetch bookings using calendarId and secretToken
    useEffect(() => {
        if (calendarId && secretToken) {
            const fetchBookings = async () => {
                const fetchUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/calendar/${calendarId}/${secretToken}`;
                console.log(`Fetching bookings from: ${fetchUrl}`); // Log the full fetch URL
                try {
                    const response = await fetch(fetchUrl);
                    if (!response.ok) {
                        const errorData = await response.json(); // Attempt to get error details
                        console.error("Fetch error details:", errorData);
                        throw new Error('Failed to fetch bookings');
                    }
                    const data = await response.json();
                    setBookings(data.bookings || []); // Store fetched bookings
                } catch (error) {
                    console.error("Error fetching bookings:", error);
                    setError("Failed to fetch bookings."); // Update error state
                }
            };
    
            fetchBookings();
        }
    }, [calendarId, secretToken]);

    // Assume the first accommodation is used to display data
    const apartment = accommodationData[0]; // Get the first accommodation data
    const apartmentName = apartment?.name || "Apartment Name"; // Fallback name

    return (
        <div className="flex flex-col gap-5">
            {bookings.length > 0 ? (
                bookings.map((booking, index) => {
                    const nights = Math.round(
                        (new Date(booking.end) - new Date(booking.start)) / (1000 * 60 * 60 * 24)
                    );

                    return (
                        <div
                            key={index}
                            className="group relative flex flex-col overflow-hidden bg-white border border-[#1E3E2B]/5 rounded-2xl shadow-xs hover:shadow-xl transition-all duration-300"
                        >
                            {/* Source Accent Strip */}
                            <div className="absolute top-0 left-0 h-full w-1.5 bg-[#DFBA73]" />

                            <div className="flex flex-col gap-5 p-5 pl-7 lg:flex-row lg:items-center lg:justify-between">
                                {/* Left: Import badge + stay details */}
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-10">
                                    {/* Import badge */}
                                    <div className="flex">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg border bg-[#DFBA73]/15 text-[#9a7a3a] border-[#DFBA73]/30">
                                            <Download className="w-3.5 h-3.5" />
                                            {t.Import || "Import"}
                                        </span>
                                    </div>

                                    {/* Apartment + dates */}
                                    <div className="flex flex-col gap-1.5">
                                        <h1 className="flex items-center gap-2 font-extrabold text-base text-[#1E3E2B] tracking-tight">
                                            <Home className="w-4 h-4 text-[#319A81] shrink-0" />
                                            {apartmentName}
                                        </h1>
                                        <p className="flex items-center gap-2 text-sm text-slate-600">
                                            <CalendarDays className="w-4 h-4 text-[#319A81] shrink-0" />
                                            {new Date(booking.start).toLocaleDateString()} —{" "}
                                            {new Date(booking.end).toLocaleDateString()}
                                        </p>
                                        <p className="flex items-center gap-2 text-sm text-slate-600">
                                            <Moon className="w-4 h-4 text-[#319A81] shrink-0" />
                                            {nights} {nights === 1 ? "night" : "nights"}
                                        </p>
                                    </div>
                                </div>

                                {/* Right: Source tag */}
                                <div className="flex lg:justify-end">
                                    <span className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl">
                                        Airbnb
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center bg-white shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-[#1E3E2B]/5 flex items-center justify-center text-[#1E3E2B]/40 mb-4 border border-[#1E3E2B]/10">
                        <CalendarX2 className="w-6 h-6" />
                    </div>
                    <p className="text-slate-700 font-bold text-base">{t.Nobookingsavailablefromoutsource}.</p>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}
        </div>
    );
};

export default Calsync;
