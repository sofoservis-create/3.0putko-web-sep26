"use client";
import React, { useEffect, useState } from "react";
import Log from "./Log";
import HostLog from "./HostLog";

const Client = () => {

  const [enteredPassword, setEnteredPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const PASSWORD = "Details@4321";


  const [tab, setTab] = useState("log");
  
    const tabs = [
      // { id: "users", label: "Users Collection", component: <Users /> },
      { id: "log", label: "Hosts Log", component: <Log /> },
      { id: "hosts", label: "Host properties", component: <HostLog /> },
    ];


  useEffect(() => {
    const stored = localStorage.getItem("host_auth");
    if (stored === PASSWORD) setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const timeout = setTimeout(() => {
        setIsAuthenticated(false);
        setEnteredPassword("");
        localStorage.removeItem("host_auth");
      }, 20 * 60 * 1000);
      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (enteredPassword === PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem("host_auth", PASSWORD);
    } else {
      alert("Incorrect password.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-md">
          <h2 className="text-2xl font-semibold mb-4 text-center">Logs - Putko Host Login</h2>
          <h2 className="text-lg font-semibold mb-4 text-left">Please Enter Password</h2>
          <input
            type="password"
            value={enteredPassword}
            onChange={(e) => setEnteredPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Password"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Access Page
          </button>
        </form>
      </div>
    );
  }



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

export default Client;
