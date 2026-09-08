"use client"
import { useState, useEffect, useContext } from 'react';
import { useParams } from "@/app/components/NextNavigation"; // Use useParams instead of useRouter
import Footer from '../../components/Footer/Footer';
import { PuffLoader } from 'react-spinners';
import { useRouter } from "@/app/components/NextNavigation";
import { toast } from 'react-toastify';
import FooterNav from '../../Shared/FooterNav';
import HeroSearchForm2Mobile from '../../components/HeroSearchForm2Mobile';
import Header from '../../components/Header';
import en from '../../locales/en';
import sk from '../../locales/sk';
import { FormContext } from '../../FormContext';
import MenuBar from '@/app/Shared/MenuBar';

const ResetPasswordClient = () => {
    
    const { token } = useParams(); // Retrieve the token from the URL
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // Separate state for confirmation
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const translations = { en, sk };
    const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
    const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"
  
      // Update language state when `lang` changes in FormContext
      useEffect(() => {
        setLanguage(lang || "sk");
      }, [lang]);
    
      const t = translations[language];
    // Log the token to the console when the component mounts
    useEffect(() => {
        console.log("Token from URL:", token);
    }, [token]);

    const resetPassword = async (e) => {
        e.preventDefault();

        // Check if fields are empty
        if (!newPassword || !confirmPassword) {
            toast.error(t.AllFieldsAreRequired);
            return;
        }

        // Check if the passwords match
        if (newPassword !== confirmPassword) {
            setMessage(t.Passwordsdonotmatch);
            return;
        }

        setLoading(true); // Set loading to true when request starts

        try {
            const response = await fetch(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, newPassword }),
            });

            // Check if the response is OK
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Something went wrong');
            }

            const data = await response.json();
            setMessage(t.SuccessfullyResetPassword);
            setNewPassword(''); // Clear password input after success
            setConfirmPassword(''); // Clear confirmation input after success
            toast.success(t.SuccessfullyResetPassword);
            // Optionally redirect or navigate
            router.push('/login');
        } catch (error) {
            setMessage(t.SomethingwentwrongPleaseTryAgain);
            toast.error(t.SomethingwentwrongPleaseTryAgain);
        } finally {
            setLoading(false); // Reset loading state regardless of the outcome
        }
    };

    return (
        <div>
            <div
                className="sticky top-0 z-50 flex items-center justify-between px-2 py-4 bg-white/50 backdrop-blur-md lg:hidden"
                style={{ boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
            >
                <div className="flex-1">
                  <HeroSearchForm2Mobile />
                </div>
                <button>
                  <MenuBar />
                </button>
            </div>
            <div className="hidden lg:block">
                <Header/>
            </div>
            <div className="px-5 md:px-10 lg:px-20 xl:px-32 md:my-44">
                <div className="flex flex-col items-center">
                    <div className="mb-5">
                        <img
                            src="/P.avif"
                            alt="Password Reset Icon"
                            width={48}
                            height={48}
                            loading="eager"
                            className="border bg-gradient-to-t from-white to-[#D0D5DD] rounded-lg"
                        />
                    </div>
                    <h1 className="font-semibold text-[#101828] text-2xl md:text-3xl text-center pb-3">
                        {t.ResetthePasswordofAccount}
                    </h1>
                    <p className="text-[#475467] text-sm md:text-base font-normal text-center mb-8">
                        {t.Pleaseenteryournewpassword}
                    </p>
                    <div className="space-y-4 md:space-y-6 w-full max-w-md" >
                        <div>
                            <label
                                htmlFor="newPassword"
                                className="block mb-2 text-sm font-medium text-gray-900"
                            >
                                {t.EnterNewPassword} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                name="newPassword"
                                id="newPassword"
                                value={newPassword} 
                                onChange={(e) => setNewPassword(e.target.value)} 
                                placeholder="••••••••"
                                className="border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                                required
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="confirmPassword"
                                className="block mb-2 text-sm font-medium text-gray-900"
                            >
                                {t.ConfirmPassword} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                name="confirmPassword"
                                id="confirmPassword"
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                placeholder="••••••••"
                                className="border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                                required
                            />
                        </div>
                        {message && <p className="text-center text-red-500">{message}</p>}
                        <button
                            onClick={resetPassword}
                            type="submit"
                            className="w-full bg-[#238869] text-white text-[18px] leading-[30px] rounded-lg px-4 py-3"
                        >
                            {loading ? <PuffLoader size={25} color="#fff" /> : `${t.Resetthepassword}`}
                        </button>
                    </div>
                </div>
            </div>
            <Footer/>
            <div className="lg:hidden">
                <FooterNav/>
            </div>
        </div>
    );
};

export default ResetPasswordClient;
