import React, { useState } from 'react';
import { User, Sparkles, BookOpen, Sun, Umbrella, Snowflake, PhoneCall, MapPin, Bell, Heart, ShieldAlert } from 'lucide-react';
import { SymptomCheckerModal } from '../components/SymptomCheckerModal';
import { useAuth } from '../context/AuthContext';

export const UserPortal = () => {
  const { user } = useAuth();
  const [showChecker, setShowChecker] = useState(false);

  const healthDiaryEntries = [
    { id: 1, date: '2026-09-28', title: 'Seasonal Mild Cold & Cough', note: 'Took warm tea and steam. Temperature 98.6°F.' },
    { id: 2, date: '2026-09-15', title: 'Routine Checkup with Dr. Sharma', note: 'Blood pressure normal (120/80). Prescribed vitamin D supplements.' }
  ];

  const nearbyHospitals = [
    { name: 'AIIMS New Delhi Emergency Care', dist: '2.4 km away', phone: '011-26588500', city: 'Delhi' },
    { name: 'Safdarjung Hospital Emergency Ward', dist: '3.1 km away', phone: '011-26165060', city: 'Delhi' },
    { name: 'Max Super Speciality Hospital', dist: '4.8 km away', phone: '011-26515050', city: 'Delhi' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-heading flex items-center gap-2">
            <User className="w-7 h-7 text-cyan-400" /> Patient Health Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Personal Health Log, AI Symptom Assessment & Nearby Emergency Resources
          </p>
        </div>

        <button
          onClick={() => setShowChecker(true)}
          className="btn-primary flex items-center gap-2 text-sm font-bold shadow-lg shadow-cyan-500/25 py-2.5 px-5"
        >
          <Sparkles className="w-4 h-4 text-cyan-200" /> Launch AI Symptom Checker
        </button>
      </div>

      {/* Daily Health Tip & Seasonal Precautions Banner */}
      <div className="glass-panel p-6 bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 border-emerald-500/20">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl shrink-0">
            <Umbrella className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Monsoon Season Precautions</div>
            <h2 className="text-lg font-bold text-white font-heading">Dengue & Mosquito-Borne Disease Advisory</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ensure no stagnant water collects around plant pots or coolers. Use mosquito repellents and wear long-sleeved clothing. Drink purified water to prevent enteric fever.
            </p>
          </div>
        </div>
      </div>

      {/* Personal Health Diary & Nearby Hospitals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Personal Health Diary */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white font-heading flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" /> Personal Health Diary
            </h2>
            <span className="text-xs text-slate-400">Private & Encrypted</span>
          </div>

          <div className="space-y-3">
            {healthDiaryEntries.map(entry => (
              <div key={entry.id} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{entry.title}</span>
                  <span className="text-slate-500 font-mono">{entry.date}</span>
                </div>
                <p className="text-xs text-slate-300">{entry.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Nearby Hospitals & Emergency Helplines */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white font-heading flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose-400" /> Nearby Hospitals & Helplines
            </h2>
            <span className="text-xs text-rose-400 font-bold">24/7 Active</span>
          </div>

          <div className="space-y-3">
            {nearbyHospitals.map((hosp, idx) => (
              <div key={idx} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">{hosp.name}</div>
                  <div className="text-[11px] text-slate-400">{hosp.dist} • {hosp.city}</div>
                </div>
                <a
                  href={`tel:${hosp.phone}`}
                  className="px-3 py-1.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded-lg text-xs font-bold border border-rose-500/30 flex items-center gap-1 transition"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> Call
                </a>
              </div>
            ))}
          </div>
        </div>

      </div>

      {showChecker && (
        <SymptomCheckerModal onClose={() => setShowChecker(false)} />
      )}
    </div>
  );
};
