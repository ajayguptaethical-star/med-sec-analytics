import React from 'react';
import { AlertTriangle, PhoneCall, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const EmergencyBanner = () => {
  const { emergencyAlert, setEmergencyAlert } = useAuth();

  if (!emergencyAlert) return null;

  return (
    <div className="emergency-banner py-3 px-4 flex items-center justify-between shadow-2xl relative z-50">
      <div className="flex items-center gap-3 max-w-6xl mx-auto w-full">
        <AlertTriangle className="w-7 h-7 animate-bounce text-yellow-300 shrink-0" />
        <div className="text-sm md:text-base font-bold tracking-wide">
          <span>🚨 MEDICAL EMERGENCY DETECTED: </span>
          <span className="underline decoration-yellow-400">{emergencyAlert}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a
            href="tel:112"
            className="bg-yellow-400 text-slate-950 px-3 py-1.5 rounded-full font-bold text-xs md:text-sm flex items-center gap-1 hover:bg-yellow-300 transition"
          >
            <PhoneCall className="w-4 h-4" /> Call 112
          </a>
          <button
            onClick={() => setEmergencyAlert(null)}
            className="p-1 text-white hover:opacity-75 transition"
            aria-label="Close alert"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
