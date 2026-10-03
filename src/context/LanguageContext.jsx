import React, { createContext, useContext, useState } from 'react';

const translations = {
  en: {
    appTitle: "SecureHealth Platform",
    navHome: "Dashboard",
    navAnalytics: "Analytics & Map",
    navDoctor: "Doctor Portal",
    navUser: "Patient Portal",
    navAdmin: "Admin Security",
    emergencyHelpline: "Emergency: Call 108 / 112",
    topRisingDiseases: "Top 5 Rising Diseases",
    symptomChecker: "Symptom Checker",
    activeSessions: "Active Sessions",
    login: "Log In",
    register: "Register",
    logout: "Logout",
    languageToggle: "हिंदी",
    fieldEncryptedNotice: "AES-256 Encrypted Field",
    auditHashChainValid: "Audit Log Hash Chain Verified",
  },
  hi: {
    appTitle: "सिक्योर हेल्थ प्लेटफॉर्म",
    navHome: "डैशबोर्ड",
    navAnalytics: "एनालिटिक्स एवं मैप",
    navDoctor: "डॉक्टर पोर्टल",
    navUser: "मरीज पोर्टल",
    navAdmin: "एडमिन सुरक्षा",
    emergencyHelpline: "आपातकालीन: 108 / 112 डायल करें",
    topRisingDiseases: "शीर्ष 5 उभरती बीमारियाँ",
    symptomChecker: "लक्षण जांच (Symptom Checker)",
    activeSessions: "सक्रिय सत्र (Active Sessions)",
    login: "लॉग इन",
    register: "रजिस्टर",
    logout: "लॉग आउट",
    languageToggle: "English",
    fieldEncryptedNotice: "AES-256 एन्क्रिप्टेड फ़ील्ड",
    auditHashChainValid: "ऑडिट लॉग हैश चेन सत्यापित",
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('en');

  const toggleLanguage = () => {
    setLang(prev => (prev === 'en' ? 'hi' : 'en'));
  };

  const t = (key) => {
    return translations[lang][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
