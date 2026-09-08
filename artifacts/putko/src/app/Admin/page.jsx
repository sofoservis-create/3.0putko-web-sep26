import React from 'react'
import nextDynamic from "@/app/components/NextDynamic";
import ProtectedRoute from '../ProtectedRoute'
import Header from '../Admin-Login/component/Header'

export const metadata = {
  robots: {
    index: false,   // ❌ don't index this page
    follow: false,  // ❌ don't follow links on this page
  },
};

// ✅ These are Next.js special exports — keep them as-is
export const dynamic = "force-static";
export const fetchCache = "force-no-store";

// ✅ Use the renamed import here
const MyAccount = nextDynamic(() => import("./component/MyAccount"), { ssr: false });

const page = () => {
  return (
    <ProtectedRoute allowedRoles={["superadmin"]}>
      <Header />
    <div className="max-w-[1920px] mx-auto">
    
    <MyAccount />
  </div>
  </ProtectedRoute>
  )
}

export default page
