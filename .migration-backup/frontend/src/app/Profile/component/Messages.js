"use client"
import React, { useContext, useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import en from '@/app/locales/en';
import sk from '@/app/locales/sk';
import { FormContext } from '@/app/FormContext';

function Messages() {

  const translations = { en, sk }
    const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
    const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"
                
      // Update language state when `lang` changes in FormContext
      useEffect(() => {
        setLanguage(lang || "sk");
      }, [lang]);
                
  const t = translations[language];

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br ">
      <div className="p-8 space-y-6 text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 mb-4 bg-green-600 rounded-full">
          <MessageSquare size={48} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-800">{t.Messages}</h1>
        <p className="max-w-md text-xl text-gray-600">
          {t.MessagingComingSoon}
        </p>
       
        <div className="pt-4">
         
        </div>
      </div>
    </div>
  );
}

export default Messages;