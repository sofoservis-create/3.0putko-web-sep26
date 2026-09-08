"use client";
import React, { useContext, useEffect, useState } from "react";
import Head from "@/app/components/NextHead";
import en from "../../locales/en";
import sk from "../../locales/sk";
import { FormContext } from "../../FormContext";

const GeneralBusinessConditions = () => {
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
    { id: "operator", title: t.gbc_operator_title },
    { id: "definitions", title: t.gbc_definitions_title },
    { id: "fees", title: t.gbc_fees_title },
    { id: "payments", title: t.gbc_payments_title },
    { id: "cancellation", title: t.gbc_cancellation_title },
    { id: "host", title: t.gbc_host_duties_title },
    { id: "guest", title: t.gbc_guest_duties_title },
    { id: "anticirc", title: t.gbc_anti_circumvention_title },
    { id: "chargeback", title: t.gbc_chargeback_title },
    { id: "liability", title: t.gbc_liability_title },
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

  // Unlock when user scrolls manually
  useEffect(() => {
    const unlock = () => setLockedSection(null);

    window.addEventListener("wheel", unlock, { passive: true });
    window.addEventListener("touchmove", unlock, { passive: true });

    return () => {
      window.removeEventListener("wheel", unlock);
      window.removeEventListener("touchmove", unlock);
    };
  }, []);

  // Default active on load
  useEffect(() => {
    if (!activeSection && sections.length) {
      setActiveSection(sections[0].id);
    }
  }, [sections, activeSection]);

  return (
    <>
      <Head>
        <title>{t.gbc_meta_title}</title>
        <meta name="description" content={t.gbc_meta_description} />
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

                          el.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
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
                <h1 className="text-4xl font-extrabold mb-6">
                  {t.gbc_heading}
                </h1>
                <p className="text-lg text-slate-500">{t.gbc_intro}</p>
                <div className="mt-8 inline-block text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 border px-3 py-1 rounded">
                  {t.gbc_effective_date}
                </div>
              </header>

              <div className="space-y-20 border-l border-slate-100 pl-10 relative">
                <Section id="operator" title={t.gbc_operator_title}>
                  <p className="text-slate-600">{t.gbc_operator_text}</p>
                </Section>

                <Section id="definitions" title={t.gbc_definitions_title}>
                  <ul className="list-disc list-inside space-y-2 text-slate-600">
                    {t.gbc_definitions.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </Section>

                <Section id="fees" title={t.gbc_fees_title}>
                  <p className="text-slate-600">{t.gbc_fees_text}</p>
                </Section>

                <Section id="payments" title={t.gbc_payments_title}>
                  <p className="text-slate-600">{t.gbc_payments_text}</p>
                </Section>

                <Section id="cancellation" title={t.gbc_cancellation_title}>
                  <p className="text-slate-600">{t.gbc_cancellation_text}</p>
                </Section>

                <Section id="host" title={t.gbc_host_duties_title}>
                  <p className="text-slate-600">{t.gbc_host_duties_text}</p>
                </Section>

                <Section id="guest" title={t.gbc_guest_duties_title}>
                  <p className="text-slate-600">{t.gbc_guest_duties_text}</p>
                </Section>

                <Section id="anticirc" title={t.gbc_anti_circumvention_title}>
                  <p className="text-slate-600">
                    {t.gbc_anti_circumvention_text}
                  </p>
                </Section>

                <Section id="chargeback" title={t.gbc_chargeback_title}>
                  <p className="text-slate-600">{t.gbc_chargeback_text}</p>
                </Section>

                <Section id="liability" title={t.gbc_liability_title}>
                  <p className="text-slate-600">{t.gbc_liability_text}</p>
                </Section>
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
};

const Section = ({ id, title, children }) => (
  <article
    id={id}
    className="relative scroll-mt-32"
  >
    <Dot />
    <h2 className="section-title">{title}</h2>
    {children}
  </article>
);

const Dot = () => (
  <div className="absolute -left-[46px] top-1 w-4 h-4 rounded-full bg-green-800 ring-4 ring-green-50 border-4 border-white" />
);

export default GeneralBusinessConditions;
