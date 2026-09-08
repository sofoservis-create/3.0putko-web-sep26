"use client";
import React, { useState } from "react";
import Accommodation from "./Accommodation";
import Hosts from "./Hosts";
import Email from "../component/Email";
import Reservation from "./Reservation";
import Blog from "./Blog";
import DeletedReservation from "./DeletedReservation";
import DeletedAccommodation from "./DeletedAccommodation";
import HostLog from "./HostLog";

const MyAccount = () => {
  const [tab, setTab] = useState("hosts");

  const tabs = [
    { id: "hosts", label: "Hosts Collection", component: <Hosts /> },
    { id: "email", label: "Email Subscribe", component: <Email /> },
    { id: "accommodation", label: "Accommodation Collection", component: <Accommodation /> },
    { id: "reservation", label: "Reservation", component: <Reservation /> },
    { id: "deletedreservation", label: "Deleted Reservation", component: <DeletedReservation /> },
    { id: "deletedaccommodation", label: "Deleted Accommodation", component: <DeletedAccommodation /> },
    { id: "blog", label: "Show All Blogs", component: <Blog /> },
    { id: "HostLoginlog", label: "Host Login log", component: <HostLog /> },
  ];

  return (
    <section className="max-w-8xl mx-auto px-6 py-10 bg-gray-50 min-h-screen">
      <div className="grid md:grid-cols-4 gap-10 bg-white shadow-lg rounded-lg p-6">
        
        {/* Sidebar Navigation */}
        <div className="bg-gray-100 rounded-lg p-5">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Dashboard</h2>
          <div className="flex flex-col space-y-3">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`text-left px-4 py-3 rounded-lg transition-all duration-300 font-medium ${
                  tab === t.id
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-gray-200 text-gray-700 hover:bg-blue-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Display */}
        <div className="md:col-span-3 bg-white rounded-lg p-6 shadow-md">
          {tabs.find((t) => t.id === tab)?.component}
        </div>
      </div>
    </section>
  );
};

export default MyAccount;
