"use client";

import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "./context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { token, role, loading } = useContext(AuthContext); // Include loading state
  const router = useRouter();

  useEffect(() => {
    // If no token or user role is not allowed, redirect to login
    if (!loading && (!token || !allowedRoles.includes(role))) {
      router.push("/login"); // Redirect to login if unauthorized
    }
  }, [token, role, allowedRoles, loading, router]);

  // Render children only if the user has access
  if (loading || !token || !allowedRoles.includes(role)) {
    return null; // Or return a loading spinner until the context is ready
  }

  return children; // Return the protected content if user is authorized
};

export default ProtectedRoute;
