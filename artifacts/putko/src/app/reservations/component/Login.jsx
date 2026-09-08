"use client";
import React, { useState, useContext } from "react";
import { toast } from "react-toastify";
import HashLoader from "react-spinners/HashLoader";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";
import { FormContext } from "../../FormContext";

const Login = ({ onLoginSuccess }) => {
    const translations = { en, sk };
    const { lang } = useContext(FormContext);
    const t = translations[lang || "en"];

    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });

    const [loading, setLoading] = useState(false);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const submitHandler = async (event) => {
        event.preventDefault();
        setLoading(true);

        // Simulate a small delay for better UX (optional)
        setTimeout(() => {
            if (formData.username === 'Putko_Reservation' && formData.password === 'team@putko') {
                toast.success(t.loginSuccessful);
                if (onLoginSuccess) onLoginSuccess();
            } else {
                toast.error(t.invalidCredentials);
            }
            setLoading(false);
        }, 500);
    };

    return (
        <section className="px-5">
            <div className="lg:w-[570px] lg:mx-auto rounded-lg shadow-md md:p-10 bg-white">
                <h3 className="text-headingColor text-[22px] leading-9 font-bold mb-10">
                    {t.loginTitlePrefix}<span className="text-[#4FBE9F]">{t.reservationStatistics}</span>
                </h3>

                <form className="py-4 md:py-0" onSubmit={submitHandler}>
                    <div className="mb-5">
                        <input
                            type="text"
                            placeholder={t.enterUsername}
                            name="username"
                            value={formData.username}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border-b border-solid border-[#0066ff61] focus:outline-none
                focus:border-b-primaryColor text-[16px] leading-7 text-headingColor
                placeholder:text-textColor rounded-md cursor-pointer"
                            required
                        />
                    </div>
                    <div className="mb-5">
                        <input
                            type="password"
                            placeholder={t.enterPassword}
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border-b border-solid border-[#0066ff61] focus:outline-none
                focus:border-b-primaryColor text-[16px] leading-7 text-headingColor
                placeholder:text-textColor rounded-md cursor-pointer"
                            required
                        />
                    </div>
                    <div className="mt-7">
                        <button
                            type="submit"
                            className="w-full bg-[#4FBE9F] text-white text-[18px] leading-[30px] rounded-lg px-4 py-3"
                        >
                            {loading ? <HashLoader size={25} color="#fff" /> : t.login}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default Login;
