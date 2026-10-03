import React, { useState, useEffect } from 'react';
import { Stethoscope, Activity, Heart, Sparkles, X, Minimize2, Maximize2, ShieldAlert } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export function DoctorScrollVfx() {
  const { vfx, lang } = useSettings();
  const [scrollY, setScrollY] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [heartBeat, setHeartBeat] = useState(78);
  const [bpmPulse, setBpmPulse] = useState(false);

  const isHindi = lang === 'hi';

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(100, Math.max(0, (currentScrollY / (totalHeight || 1)) * 100));

      setScrollY(currentScrollY);
      setScrollProgress(progress);

      // Dynamically simulate fluctuating vital signs during scrolling operation!
      const newBpm = 75 + Math.floor((progress % 15));
      setHeartBeat(newBpm);
      setBpmPulse(true);
      setTimeout(() => setBpmPulse(false), 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // If VFX is disabled in user Settings, do not render
  if (!vfx) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-auto transition-all duration-300">
      
      {isMinimized ? (
        /* Minimized Floating Surgeon Badge */
        <button
          onClick={() => setIsMinimized(false)}
          className="glass-panel p-3 rounded-full bg-slate-900/90 border border-emerald-500/50 shadow-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition group animate-bounce"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30">
            <Stethoscope className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="pr-2 text-left hidden sm:block">
            <div className="text-[11px] font-extrabold text-white flex items-center gap-1">
              <span>{isHindi ? 'डॉक्टर ऑपरेशन VFX' : 'Doctor Operation VFX'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <div className="text-[9px] text-emerald-400 font-mono">
              {heartBeat} BPM • {Math.round(scrollProgress)}% {isHindi ? 'स्क्रॉल' : 'Scroll'}
            </div>
          </div>
        </button>
      ) : (
        /* Expanded Cartoon Doctor Surgery Animated Card */
        <div 
          className="glass-panel w-80 bg-slate-900/95 border-2 border-emerald-500/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-300"
          style={{
            transform: `translateY(${Math.sin(scrollY / 100) * 4}px)`,
            boxShadow: `0 0 ${20 + (scrollProgress / 5)}px rgba(16, 185, 129, 0.35)`
          }}
        >
          
          {/* Header Bar */}
          <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-b border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-heading font-extrabold text-white tracking-wide flex items-center gap-1.5">
                  <span>{isHindi ? 'लाइव डॉक्टर ऑपरेशन VFX' : 'Live Doctor Surgery VFX'}</span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded-full font-mono border border-emerald-500/40">
                    LIVE
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 text-slate-400 hover:text-white rounded-md transition"
                title="Minimize"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Animated Cartoon Surgery Operation Frame */}
          <div className="relative h-44 bg-slate-950 overflow-hidden group">
            
            {/* Generated Pixar-style Cartoon Doctor Surgery Image */}
            <img 
              src="/cartoon_doctor_operation.jpg" 
              alt="Cartoon Doctor Operation"
              className="w-full h-full object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-105"
              style={{
                transform: `scale(${1 + (scrollProgress / 300)}) rotate(${Math.sin(scrollY / 150) * 1.5}deg)`
              }}
            />

            {/* Glowing Laser Scanline Effect driven by Scroll */}
            <div 
              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#06b6d4] opacity-80"
              style={{
                top: `${(scrollProgress * 0.9) + 5}%`,
                transition: 'top 0.1s linear'
              }}
            />

            {/* Live Holographic Heart Beat Monitor ECG Line Overlay */}
            <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-emerald-500/40 flex items-center gap-2">
              <Heart className={`w-3.5 h-3.5 text-rose-500 ${bpmPulse ? 'scale-125' : 'scale-100'} transition-transform`} />
              <div className="text-[11px] font-mono font-bold text-emerald-300">
                {heartBeat} <span className="text-[9px] text-slate-400 font-sans">BPM</span>
              </div>
              <div className="w-12 h-3 flex items-center overflow-hidden">
                <svg className="w-full h-full text-emerald-400 stroke-current stroke-2 fill-none" viewBox="0 0 50 15">
                  <path d="M 0 7 L 10 7 L 13 2 L 17 13 L 21 0 L 25 10 L 28 7 L 50 7" />
                </svg>
              </div>
            </div>

            {/* Surgery Vitals & Scroll Progress Badge */}
            <div className="absolute bottom-2 right-2 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-cyan-500/40 text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 shadow-lg">
              <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" />
              <span>SpO2: 99%</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-bold">{Math.round(scrollProgress)}% {isHindi ? 'स्क्रॉल' : 'Scroll'}</span>
            </div>

            {/* Floating Medical Particles */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 left-1/3 text-emerald-400/40 text-xs font-bold animate-ping">✚</div>
              <div className="absolute top-2/3 right-1/4 text-cyan-400/40 text-xs font-bold animate-pulse">✚</div>
            </div>

          </div>

          {/* Footer Status Bar */}
          <div className="px-3.5 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span className="truncate">
                {isHindi ? 'कार्टून डॉक्टर ऑपरेशन एक्टिव (VFX ON)' : 'Cartoon Doctor Surgery Active (VFX ON)'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono shrink-0">
              {scrollY}px
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
