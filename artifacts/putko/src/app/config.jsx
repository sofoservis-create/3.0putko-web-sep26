// Production deployments should set VITE_API_URL to the external API origin
// (including its /api prefix). The default is same-origin for the local proxy.
const DEFAULT_API_URL = "/api";

export const Base_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
export const TestGuestAuth_URL = import.meta.env.DEV
  ? import.meta.env.VITE_GUEST_TEST_API_URL || "/api"
  : null;
export const Socket_base_URL = Base_URL.replace(/\/api\/?$/, "");

export const token =
  typeof window !== "undefined" ? localStorage.getItem("token") : null;
export const user =
  typeof window !== "undefined" ? localStorage.getItem("guest") : null;
export const admin =
  typeof window !== "undefined" ? localStorage.getItem("admin") : null;
