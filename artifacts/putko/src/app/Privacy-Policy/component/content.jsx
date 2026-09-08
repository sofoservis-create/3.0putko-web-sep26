"use client";
import React, { useContext, useEffect, useState } from "react";
import Head from "@/app/components/NextHead";
import { FormContext } from "../../FormContext";
import en from "../../locales/en";
import sk from "../../locales/sk";

const PrivacyPolicy = () => {
  const translations = { en, sk };
  const { lang } = useContext(FormContext);
  const [language, setLanguage] = useState(lang || "sk");
  const [activeSection, setActiveSection] = useState("");
  const [lockedSection, setLockedSection] = useState(null);

  useEffect(() => {
    setLanguage(lang || "sk");
  }, [lang]);

  const t = translations[language];

  const sections = [
    { id: "operator", title: t.pp_operator_title },
    { id: "scope", title: t.pp_scope_title },
    { id: "purposes", title: t.pp_purposes_title },
    { id: "legal_basis", title: t.pp_legal_basis_title },
    { id: "marketing", title: t.pp_marketing_title },
    { id: "recipients", title: t.pp_recipients_title },
    { id: "transfer", title: t.pp_transfer_title },
    { id: "retention", title: t.pp_retention_title },
    { id: "rights", title: t.pp_rights_title },
    { id: "security", title: t.pp_security_title },
    { id: "cookies", title: t.pp_cookies_title },
    { id: "incidents", title: t.pp_incidents_title },
    { id: "contact", title: t.pp_contact_title },
  ];

  // Intersection observer (scroll spy)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !lockedSection) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.5 }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections, lockedSection]);

  // Unlock scroll spy on manual scroll
  useEffect(() => {
    const unlock = () => setLockedSection(null);
    window.addEventListener("wheel", unlock, { passive: true });
    window.addEventListener("touchmove", unlock, { passive: true });

    return () => {
      window.removeEventListener("wheel", unlock);
      window.removeEventListener("touchmove", unlock);
    };
  }, []);

  // Default active section
  useEffect(() => {
    if (!activeSection && sections.length) setActiveSection(sections[0].id);
  }, [sections, activeSection]);

  return (
    <>
      <Head>
        <title>{t.pp_meta_title}</title>
        <meta name="description" content={t.pp_meta_description} />
      </Head>

      <div className="bg-white text-slate-900">
        <div className="max-w-6xl mx-auto px-6 lg:py-40 py-10">
          <div className="flex flex-col lg:flex-row gap-16">

            {/* Sidebar */}
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-16">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 px-4">
                  {t.Documentation}
                </p>
                <ul className="space-y-1">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          const el = document.getElementById(section.id);
                          if (!el) return;
                          setActiveSection(section.id);
                          setLockedSection(section.id);
                          el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                          activeSection === section.id
                            ? "bg-green-50 text-green-800"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            {/* Content */}
            <main className="flex-1 max-w-3xl">
              <header className="mb-16">
                <h1 className="text-4xl font-extrabold mb-6">{t.pp_heading}</h1>
                <p className="text-lg text-slate-500">{t.pp_intro}</p>
              </header>

              <div className="space-y-20 border-l border-slate-100 pl-10 relative">
                {sections.map((section) => (
                  <Section key={section.id} id={section.id} title={section.title}>
                    {t[section.id + "_text"].map((item, i) => (
                      <p key={i} className="text-slate-600 mb-2">{item}</p>
                    ))}
                  </Section>
                ))}
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
};

const Section = ({ id, title, children }) => (
  <article id={id} className="relative scroll-mt-32">
    <Dot />
    <h2 className="section-title mb-4">{title}</h2>
    {children}
  </article>
);

const Dot = () => (
  <div className="absolute -left-[46px] top-1 w-4 h-4 rounded-full bg-green-800 ring-4 ring-green-50 border-4 border-white" />
);

export default PrivacyPolicy;
