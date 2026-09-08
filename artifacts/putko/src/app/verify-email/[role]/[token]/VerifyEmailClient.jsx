"use client";
import { useContext, useEffect, useState } from 'react';
import { useRouter, useParams } from "@/app/components/NextNavigation";
import { toast } from 'react-toastify';
import en from '@/app/locales/en';
import { FormContext } from '@/app/FormContext';
import sk from '@/app/locales/sk';
import { Base_URL, TestGuestAuth_URL } from '@/app/config';

const VerifyEmailClient = () => {
  const { token, role } = useParams();
  const router = useRouter();

    const translations = { en, sk };
    const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
    const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"
  
      // Update language state when `lang` changes in FormContext
      useEffect(() => {
        setLanguage(lang || "sk");
      }, [lang]);
    
      const t = translations[language];
  
  // State to hold the verification status
  const [status, setStatus] = useState("");

  useEffect(() => {
    console.log("Token from URL:", token, role);
    
    // Call verifyEmail only if token exists
    if (token) {
      verifyEmail();

      setTimeout(() => {
        router.push('/login'); // Redirect after 5 seconds
      }, 2000);
    }
  }, [token]); // Only re-run the effect if token changes

  const verifyEmail = async () => {
    setStatus(t.Verifyingyouremail); // Initial status message

    try {
      const isTestGuestToken =
        role === "guest" &&
        token.startsWith("test_") &&
        Boolean(TestGuestAuth_URL);
      const verificationUrl = isTestGuestToken
        ? `${TestGuestAuth_URL}/test-auth/verify-email/${encodeURIComponent(token)}`
        : `${Base_URL}/auth/verify-email/${role}/${token}`;
      const res = await fetch(verificationUrl);

      // Check if the response is OK before parsing JSON
      if (!res.ok) {
        const errorData = await res.json(); // Parse the error response
        throw new Error(t.Emailverificationfailed); // Use default message if none is provided
      }

      const data = await res.json(); // Parse the success response
      setStatus(t.Youremailhasbeensuccessfullyverified); // Update status with success message
      toast.success(t.Youremailhasbeensuccessfullyverified); // Show success message
      
      // Redirect to login page after successful verification
      setTimeout(() => {
        router.push('/login'); // Redirect after 5 seconds
      }, 2000);

    } catch (err) {
      setStatus(t.VerificationfailedPleasetryagain); // Update status with error message
      toast.error(t.Anerroroccurredwhileverifyingyouremail); // Show error message
      
      // Redirect to login after 5 seconds in case of error as well
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div>
        <h1 className="text-2xl font-bold">{status || t.Verifyingyouremail}</h1> {/* Display the current status */}
      </div>
    </div>
  );
};

export default VerifyEmailClient;
