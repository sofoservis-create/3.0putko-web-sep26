"use client";

import { useContext, useEffect } from "react";
import { usePathname, useRouter } from "@/app/components/NextNavigation";
import { AuthContext } from "./context/AuthContext";
import { isTestGuestToken } from "./utlis/guestAccountApi";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { token, role, loading } = useContext(AuthContext); // Include loading state
  const router = useRouter();
  const pathname = usePathname();
  const normalizedPath = pathname?.toLowerCase() || "";
  const isLiveHostRoute = normalizedPath.startsWith("/host/onboard/");

  useEffect(() => {
    if (loading) return;

    if (!token) {
      const search = typeof window !== "undefined" ? window.location.search : "";
      const returnTo = pathname?.startsWith("/") ? `${pathname}${search}` : "/";
      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    const testAccount = isTestGuestToken(token);
    if (testAccount && isLiveHostRoute) {
      router.push("/host");
      return;
    }
    if (!allowedRoles.includes(role)) {
      router.push(
        role === "host"
          ? "/host"
          : role === "guest"
            ? "/account"
            : "/login",
      );
    }
  }, [token, role, allowedRoles, loading, pathname, router, isLiveHostRoute]);

  // Render children only if the user has access
  const blockedPreview =
    Boolean(token) &&
      (isLiveHostRoute && isTestGuestToken(token));

  if (loading || !token || !allowedRoles.includes(role) || blockedPreview) {
    return null; // Or return a loading spinner until the context is ready
  }

  return children; // Return the protected content if user is authorized
};

export default ProtectedRoute;
