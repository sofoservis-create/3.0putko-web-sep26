"use client";
import { useState, useContext, useEffect } from "react";
import Link from "@/app/components/NextLink";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { useRouter } from "@/app/components/NextNavigation";
import { PuffLoader } from "react-spinners";
import { Eye, EyeOff } from "lucide-react";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";
import { Base_URL, TestGuestAuth_URL } from "../../config";

const Login = () => {
  const translations = { en, sk };
  const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
  const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    lang:lang
  });

  // Update language when `lang` changes
  useEffect(() => {
    setLanguage(lang || "sk");
    setFormData((prev) => ({ ...prev, lang: lang || "sk" })); // Ensure formData.lang updates dynamically
  }, [lang]);
    
  const t = translations[language];

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { dispatch } = useContext(AuthContext);
  const router = useRouter();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const submitHandler = async (event) => {
    event.preventDefault();
    setFormError("");

    // Check if email or password is empty
    if (!formData.email) {
      setFormError(t.emailRequired);
      toast.error(t.emailRequired);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      const message = language === "en" ? "Enter a valid email address." : "Zadajte platnú e-mailovú adresu.";
      setFormError(message);
      toast.error(message);
      return;
    }
    if (!formData.password) {
      setFormError(t.Passwordisrequired);
      toast.error(t.Passwordisrequired);
      return;
    }

    setLoading(true);

    try {
      const requestOptions = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(formData),
        };

      let res = null;
      if (TestGuestAuth_URL) {
        try {
          res = await fetch(
            `${TestGuestAuth_URL}/test-auth/login`,
            requestOptions
          );
        } catch {
          // Keep host login available if the development-only API is offline.
        }
      }

      if (!res) {
        res = await fetch(`${Base_URL}/auth/login`, requestOptions);
      }

      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        const errorResponse = contentType.includes("application/json")
          ? await res.json()
          : null;
        throw new Error(
          errorResponse?.message ||
            (language === "en"
              ? "Sign in is temporarily unavailable."
              : "Prihlásenie je momentálne nedostupné.")
        );
      }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error(
            language === "en"
              ? "The sign-in service returned an invalid response."
              : "Prihlasovacia služba vrátila neplatnú odpoveď."
          );
        }
        const result = await res.json();
        const authPayload = result.data?.user ? result.data : result;
        const authUser = authPayload.user || result.data;
        const authToken = authPayload.token || result.token;
        const authRole = authPayload.role || result.role || authUser?.activeMode;
        if (!authUser || !authToken) {
          throw new Error("The authentication response is missing account credentials.");
        }
      dispatch({
        type: "LOGIN_SUCCESS",
        payload: {
            user: authUser,
            token: authToken,
            role: authRole,
        },
      });

      setLoading(false);
      // toast.success(result.message);
      const returnTo = router.query.get("returnTo");
      const safeReturnTo =
        returnTo?.startsWith("/") &&
        !returnTo.startsWith("//") &&
        !returnTo.includes("\\")
          ? returnTo
          : null;

      if (safeReturnTo) {
        router.push(safeReturnTo);
      } else {
        router.push(
          authToken?.startsWith("test_session_") && authRole === "host"
            ? "/host"
            : authRole === "host"
              ? "/host"
              : authRole === "guest"
              ? "/account"
              : "/account"
        );
      }
    } catch (err) {
      console.log(err.message);
      const message = err.message || (language === "en" ? "Sign in failed. Please try again." : "Prihlásenie zlyhalo. Skúste to znova.");
      setFormError(message);
      toast.error(message);
      setLoading(false);
    }
  };

  
  return (
    <div className="px-4 sm:px-6 lg:px-8">
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
                {t.Login_OneAccount_Title}
              </h2>
              <p className="mt-4 font-inter text-[15px] leading-relaxed text-white/75">
                {t.Login_OneAccount_Desc}
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
                  <p className="font-inter text-sm font-medium">{t.Login_AllTogether_Title}</p>
                  <p className="font-inter text-[13px] text-white/65">{t.Login_AllTogether_Desc}</p>
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
                {language === "en" ? "Welcome back to Putko" : "Vitajte späť v Putko"}
              </h1>
              <p className="mt-2 font-inter text-sm md:text-base text-[#4A5568] text-center lg:text-left">
                {language === "en"
                  ? "Sign in to the account you use for traveling and hosting."
                  : "Prihláste sa do účtu, ktorý používate na cestovanie aj hostenie."}
              </p>
            </div>

            <form onSubmit={submitHandler} className="mt-8 space-y-5 w-full max-w-md mx-auto lg:mx-0" aria-describedby={formError ? "login-error" : undefined}>
              {formError && (
                <p id="login-error" role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </p>
              )}
              <div>
                <label
                  htmlFor="email"
                  className="block mb-2 font-inter text-sm font-medium text-[#1A3A2E]"
                >
                  {t.email} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  autoComplete="username"
                  className="block w-full rounded-xl border border-[#D9DEDB] bg-white px-4 py-3 font-inter text-[15px] text-gray-900 outline-none transition focus:border-[#238869] focus:ring-2 focus:ring-[#238869]/20"
                  placeholder={t.input_placeholder}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block mb-2 font-inter text-sm font-medium text-[#1A3A2E]"
                >
                  {t.Password} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    id="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="block w-full rounded-xl border border-[#D9DEDB] bg-white px-4 py-3 pr-12 font-inter text-[15px] text-gray-900 outline-none transition focus:border-[#238869] focus:ring-2 focus:ring-[#238869]/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? (language === "en" ? "Hide password" : "Skryť heslo") : (language === "en" ? "Show password" : "Zobraziť heslo")}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#66736D] transition hover:text-[#238869]"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="remember"
                      aria-describedby="remember"
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#D9DEDB] bg-gray-50 text-[#238869] focus:ring-2 focus:ring-[#238869]/30"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label
                      htmlFor="remember"
                      className="font-inter text-[#4A5568]"
                    >
                      {t.Rememberme}
                    </label>
                  </div>
                </div>
                <Link href="/forget-password">
                  <p className="font-inter text-sm font-medium text-[#238869] hover:underline">
                    {t.Forgotpassword}
                  </p>
                </Link>
              </div>
              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="flex w-full items-center justify-center rounded-xl bg-[#238869] px-4 py-3 font-inter text-[16px] font-medium leading-[30px] text-white transition hover:bg-[#1d6f56] focus:outline-none focus:ring-2 focus:ring-[#238869]/40 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? <PuffLoader size={25} color="#fff" /> : `${t.login}`}
              </button>
              {/* <Link
                href={`${Base_URL}/auth/google`}
                className="w-full flex items-center justify-center gap-4 py-3 px-6 text-sm tracking-wide text-gray-800 border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 focus:outline-none"
              >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20px"
              className="inline"
              viewBox="0 0 512 512"
            >
              <path
                fill="#fbbd00"
                d="M120 256c0-25.367 6.989-49.13 19.131-69.477v-86.308H52.823C18.568 144.703 0 198.922 0 256s18.568 111.297 52.823 155.785h86.308v-86.308C126.989 305.13 120 281.367 120 256z"
                data-original="#fbbd00"
              />
              <path
                fill="#0f9d58"
                d="m256 392-60 60 60 60c57.079 0 111.297-18.568 155.785-52.823v-86.216h-86.216C305.044 385.147 281.181 392 256 392z"
                data-original="#0f9d58"
              />
              <path
                fill="#31aa52"
                d="m139.131 325.477-86.308 86.308a260.085 260.085 0 0 0 22.158 25.235C123.333 485.371 187.62 512 256 512V392c-49.624 0-93.117-26.72-116.869-66.523z"
                data-original="#31aa52"
              />
              <path
                fill="#3c79e6"
                d="M512 256a258.24 258.24 0 0 0-4.192-46.377l-2.251-12.299H256v120h121.452a135.385 135.385 0 0 1-51.884 55.638l86.216 86.216a260.085 260.085 0 0 0 25.235-22.158C485.371 388.667 512 324.38 512 256z"
                data-original="#3c79e6"
              />
              <path
                fill="#cf2d48"
                d="m352.167 159.833 10.606 10.606 84.853-84.852-10.606-10.606C388.668 26.629 324.381 0 256 0l-60 60 60 60c36.326 0 70.479 14.146 96.167 39.833z"
                data-original="#cf2d48"
              />
              <path
                fill="#eb4132"
                d="M256 120V0C187.62 0 123.333 26.629 74.98 74.98a259.849 259.849 0 0 0-22.158 25.235l86.308 86.308C162.883 146.72 206.376 120 256 120z"
                data-original="#eb4132"
              />
            </svg>
            Sign in with Google
          </Link> */}
            </form>

            <p className="mt-6 font-inter text-sm text-[#4A5568] text-center lg:text-left max-w-md mx-auto lg:mx-0">
              {t.Donthaveanaccount}{" "}
              <Link
                href="/signup"
                className="font-medium text-[#238869] hover:underline"
              >
                {t.Registerhere}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
