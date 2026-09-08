"use client";
import Header from "@/app/components/Header/Header";
import { AuthContext } from "@/app/context/AuthContext";
import { FormContext } from "@/app/FormContext";
import en from "@/app/locales/en";
import sk from "@/app/locales/sk";
import ButtonPrimary from "@/app/Shared/ButtonPrimary";
import Input from "@/app/Shared/Input";
import Label from "@/app/Shared/Label";
import React, { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { KeyRound, Eye, EyeOff, Lock } from "lucide-react";

const ChangePassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);

  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language] || en;

  // Real-time structural checks
  const isMinLength = newPassword.length >= 8;
  const isMatching = newPassword && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error(t.Pleasefillinallpasswordfieldstochangethepassword);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t.NewandConfirmpassworddoesnotmatch);
      return;
    }

    if (!user || !user._id) {
      toast.error(t.Usernotfound);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/auth/change-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user._id,
            newPassword,
            role: "host",
          }),
        }
      );

      if (response.ok) {
        toast.success(t.Passwordchangedsuccessfully);
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || t.Failedtochangepassword);
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error(t.Anerroroccurredwhilechangingpassword);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-16">
      <Header 
        title={t.ChangePassword || "Security Settings"} 
        subtitle="" 
        showAddButton={false} 
      />

      <div className="w-full max-w-xl mx-auto px-4 mt-10">
        <form 
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden"
        >
          {/* Header Banner */}
          <div className="p-6 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#319A81]/10 rounded-2xl flex items-center justify-center text-[#319A81]">
                <KeyRound className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                  {t.Pleaseenternewpassword || "Security Key Update"}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {t.updateCredentialSafely || "Update credential safely"}
                </p>
              </div>
            </div>
          </div>

          {/* Form Content Interface Container */}
          <div className="p-6 md:p-8 space-y-6">
            
            {/* Input Element Panel: New Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-0.5">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider" htmlFor="new-password">
                  {t.NewPassword}
                </Label>
                {newPassword && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isMinLength ? "text-[#319A81]" : "text-amber-500"}`}>
                    {isMinLength ? (t.secureLength || "Secure Length") : (t.tooShort || "Too Short")}
                  </span>
                )}
              </div>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#319A81] transition-colors">
                  <Lock className="w-4 h-4" />
                </span>
                <Input
                  type={showNewPass ? "text" : "password"}
                  id="new-password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-12 pl-11 pr-11 text-sm border-slate-200 rounded-2xl bg-slate-50/30 focus:bg-white focus:border-[#319A81] focus:ring-4 focus:ring-[#319A81]/5 transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Input Element Panel: Confirm Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-0.5">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider" htmlFor="confirm-password">
                  {t.ConfirmPassword}
                </Label>
                {confirmPassword && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isMatching ? "text-[#319A81]" : "text-rose-500"}`}>
                    {isMatching ? (t.matches || "Matches") : (t.mismatch || "Mismatch")}
                  </span>
                )}
              </div>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#319A81] transition-colors">
                  <Lock className="w-4 h-4" />
                </span>
                <Input
                  type={showConfirmPass ? "text" : "password"}
                  id="confirm-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-12 pl-11 pr-11 text-sm border-slate-200 rounded-2xl bg-slate-50/30 focus:bg-white focus:border-[#319A81] focus:ring-4 focus:ring-[#319A81]/5 transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Integrated Security Micro-Status Bar */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className={`h-1 rounded-full transition-all duration-300 ${isMinLength ? "bg-[#319A81]" : "bg-slate-100"}`} />
              <div className={`h-1 rounded-full transition-all duration-300 ${isMatching ? "bg-[#319A81]" : "bg-slate-100"}`} />
            </div>

          </div>

          {/* Action Trigger Block Area */}
          <div className="p-6 bg-slate-50/60 border-t border-slate-100 flex items-center justify-end">
            <ButtonPrimary 
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto sm:px-10 h-11 text-xs font-bold tracking-wide text-white bg-[#1E3E2B] hover:bg-[#152B1E] rounded-2xl transition-all duration-150 disabled:opacity-50 shadow-xs active:scale-[0.99]"
            >
              {loading ? `${t.Updating || "Updating..."}` : `${t.ChangePassword}`}
            </ButtonPrimary>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ChangePassword;