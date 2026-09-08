"use client"
import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Footer from '../components/Footer/Footer';
import { PuffLoader } from 'react-spinners';
import { toast } from 'react-toastify';
import FooterNav from '../Shared/FooterNav';
import HeroSearchForm2Mobile from '../components/HeroSearchForm2Mobile';
import Header from '../components/Header';
import { FormContext } from '../FormContext';
import en from '../locales/en';
import sk from '../locales/sk';
import MenuBar from '../Shared/MenuBar';

const ForgetPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const translations = { en, sk };
    const { lang } = useContext(FormContext);
    const [language, setLanguage] = useState(lang || "sk");
  
    useEffect(() => {
        setLanguage(lang || "sk");
    }, [lang]);
  
    const t = translations[language];
    const router = useRouter();

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const sendResetLink = async () => {
        if (!email) {
            setMessage(t.Pleaseenteravalidemailaddress);
            toast.error(t.Pleaseenteravalidemailaddress);
            return;
        }
        if (!validateEmail(email)) {
            setMessage(t.EnterValidEmail);
            toast.error(t.EnterValidEmail);
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/password-reset-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                throw new Error(t.Somethingwentwrong);
            }

            setMessage(t.Pleasecheckyouremailandresetthepassword);
            toast.success(t.Pleasecheckyouremailandresetthepassword);
            setEmail('');
        } catch (error) {
            setMessage(t.SomethingwentwrongPleaseTryAgain);
            toast.error(t.SomethingwentwrongPleaseTryAgain);
        } finally {
            setLoading(false);
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
                <Header />
            </div>
            <div className="px-4 sm:px-6 lg:px-8 my-8 lg:my-20">
                <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-[24px] border border-[#E6E8E3] bg-white shadow-[0_8px_40px_rgba(22,60,46,0.10)]">
                    <div className="grid lg:grid-cols-2">
                        {/* LEFT — BRAND PANEL (desktop only) */}
                        <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-[#163C2E] via-[#1A3A2E] to-[#214F3D] p-10 xl:p-12 text-white">
                            <div>
                                <Link href="/" className="inline-flex items-center gap-3">
                                    <img
                                        src="/P.avif"
                                        alt="Putko"
                                        width={48}
                                        height={48}
                                        loading="eager"
                                        className="rounded-xl border border-white/15 bg-white/10 p-1"
                                    />
                                    <span className="font-fraunces text-2xl font-semibold tracking-tight">
                                        Putko
                                    </span>
                                </Link>
                            </div>

                            <div className="my-10">
                                <h2 className="font-fraunces text-3xl xl:text-4xl font-semibold leading-tight">
                                    {t.Hero_Accommodation}
                                    <br />
                                    <span className="text-white/85">{t.Hero_WithinReach}</span>
                                </h2>
                                <p className="mt-4 font-inter text-[15px] leading-relaxed text-white/75">
                                    {t.Hero_Subtitle}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-4 w-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        </svg>
                                    </span>
                                    <div>
                                        <p className="font-inter text-sm font-medium">{t.Feature_VerifiedHosts_Title}</p>
                                        <p className="font-inter text-[13px] text-white/65">{t.Feature_VerifiedHosts_Desc}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-4 w-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                                        </svg>
                                    </span>
                                    <div>
                                        <p className="font-inter text-sm font-medium">{t.Why_Secure_Title}</p>
                                        <p className="font-inter text-[13px] text-white/65">{t.Why_Secure_Desc}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT — FORM PANEL */}
                        <div className="bg-[#FFFEF9] p-6 sm:p-10 lg:p-12">
                            <button
                                onClick={() => router.back()}
                                className="inline-flex items-center gap-1.5 font-inter text-sm font-medium text-[#238869] transition hover:gap-2.5"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                                </svg>
                                {t.Back}
                            </button>

                            {/* Mobile logo */}
                            <div className="mt-6 mb-5 flex justify-center lg:hidden">
                                <Link href="/">
                                    <img
                                        src="/P.avif"
                                        alt="Putko"
                                        width={48}
                                        height={48}
                                        loading="eager"
                                        className="rounded-xl border bg-gradient-to-t from-white to-[#D0D5DD]"
                                    />
                                </Link>
                            </div>

                            <div className="mt-6 lg:mt-8">
                                <h1 className="font-fraunces text-2xl md:text-3xl font-semibold text-[#163C2E] text-center lg:text-left">
                                    {t.ResetthePasswordofAccount}
                                </h1>
                                <p className="mt-2 font-inter text-sm md:text-base text-[#4A5568] text-center lg:text-left">
                                    {t.Pleaseenteryouremailtoreceivetheresetlink}
                                </p>
                            </div>

                            <div className="mt-8 space-y-5 w-full max-w-md mx-auto lg:mx-0">
                                <div>
                                    <label className="block mb-2 font-inter text-sm font-medium text-[#1A3A2E]">
                                        {t.emailAddress} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={`${t.input_placeholder}`}
                                        className="block w-full rounded-xl border border-[#D9DEDB] bg-white px-4 py-3 font-inter text-[15px] text-gray-900 outline-none transition focus:border-[#238869] focus:ring-2 focus:ring-[#238869]/20"
                                    />
                                </div>
                                <button
                                    onClick={sendResetLink}
                                    className="flex w-full items-center justify-center rounded-xl bg-[#238869] px-4 py-3 font-inter text-[16px] font-medium leading-[30px] text-white transition hover:bg-[#1d6f56] focus:outline-none focus:ring-2 focus:ring-[#238869]/40 disabled:opacity-70"
                                    disabled={loading}
                                >
                                    {loading ? <PuffLoader size={25} color="#fff" /> : `${t.SendResetLink}`}
                                </button>
                                {message && <p className="text-center font-inter text-sm text-[#238869]">{message}</p>}

                                <p className="font-inter text-sm text-[#4A5568] text-center lg:text-left">
                                    <Link href="/login" className="text-[#238869] font-medium hover:underline">
                                        {t.login}
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
            <div className="lg:hidden">
                <FooterNav />
            </div>
        </div>
    );
};

export default ForgetPassword;
