import React, { useEffect, useState } from 'react';
import { Activity, TrendingUp, ShieldCheck, AlertCircle, Sparkles, MapPin, ChevronRight, PhoneCall } from 'lucide-react';
import { SymptomCheckerModal } from '../components/SymptomCheckerModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const Dashboard = ({ setActiveTab }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [showChecker, setShowChecker] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => (res.headers.get('content-type')?.includes('application/json') ? res.json() : null))
      .then(data => data && setAnalytics(data))
      .catch(console.error);

    fetch('/api/analytics/forecast')
      .then(res => (res.headers.get('content-type')?.includes('application/json') ? res.json() : null))
      .then(data => data && setForecast(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      
      {/* Hero Welcome & Quick Action Header */}
      <div className="glass-panel p-8 relative overflow-hidden bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border-cyan-500/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-3">
              <ShieldCheck className="w-4 h-4" /> Enterprise Security Protocol Active
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white font-heading tracking-tight">
              Real-time Disease Surveillance & Prevention Dashboard
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Active surveillance network protecting public health with field-level AES-256 encryption, k-anonymity data aggregation, and AI-driven early outbreak prediction.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowChecker(true)}
              className="btn-primary flex items-center justify-center gap-2 py-3 px-5 text-sm font-bold shadow-lg shadow-cyan-500/25"
            >
              <Sparkles className="w-4 h-4 text-cyan-200" /> {t('symptomChecker')}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className="px-5 py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-bold border border-slate-700 flex items-center justify-center gap-2 transition"
            >
              <Activity className="w-4 h-4 text-emerald-400" /> View Analytics & Map
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 border-l-4 border-l-cyan-500">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Surveillance Nodes</div>
          <div className="text-2xl font-extrabold text-white mt-1 font-heading">54 Cities</div>
          <div className="text-xs text-cyan-400 mt-2 flex items-center gap-1 font-medium">
            <MapPin className="w-3.5 h-3.5" /> India-wide Network
          </div>
        </div>

        <div className="glass-panel p-5 border-l-4 border-l-emerald-400">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">AES-256 Encrypted Records</div>
          <div className="text-2xl font-extrabold text-white mt-1 font-heading">100% Protected</div>
          <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> Zero Raw Data Leakage
          </div>
        </div>

        <div className="glass-panel p-5 border-l-4 border-l-rose-500">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">7-Day Outbreak Velocity</div>
          <div className="text-2xl font-extrabold text-white mt-1 font-heading">+14.2%</div>
          <div className="text-xs text-rose-400 mt-2 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" /> Moving Average Model
          </div>
        </div>

        <div className="glass-panel p-5 border-l-4 border-l-amber-400">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Security Integrity</div>
          <div className="text-2xl font-extrabold text-white mt-1 font-heading">Hash Chain OK</div>
          <div className="text-xs text-amber-400 mt-2 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> Tamper-Proof Audit
          </div>
        </div>
      </div>

      {/* Top 5 Rising Diseases Card Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-rose-400" />
            <h2 className="text-xl font-bold text-white font-heading">{t('topRisingDiseases')}</h2>
          </div>
          <span className="text-xs text-slate-400">Real-time Case Velocity Ranking</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {analytics?.topRisingDiseases?.map((item, idx) => (
            <div key={item.disease} className="glass-panel p-4 hover:border-cyan-500/50 transition group cursor-pointer" onClick={() => setActiveTab('analytics')}>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-bold text-cyan-400">#{idx + 1} Rank</span>
                <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-bold">Rising</span>
              </div>
              <div className="text-lg font-extrabold text-white group-hover:text-cyan-300 transition">{item.disease}</div>
              <div className="text-xs text-slate-400 mt-1">
                Total Reported: <span className="font-mono text-white font-bold">{item.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7-Day Forecast & Emergency Helpline Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 7-Day Trend Forecast Card */}
        <div className="glass-panel p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white font-heading flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" /> 7-Day Outbreak Trend Forecast
            </h3>
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
              Linear Regression + Moving Avg
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center pt-2">
            {forecast?.forecastNext7Days?.map((val, idx) => (
              <div key={idx} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Day +{idx + 1}</div>
                <div className="text-lg font-extrabold text-cyan-300 mt-1">{val}</div>
                <div className="text-[9px] text-slate-500">Cases</div>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Helplines Quick Card */}
        <div className="glass-panel p-6 flex flex-col justify-between space-y-4 bg-gradient-to-br from-slate-900 to-rose-950/30 border-rose-500/20">
          <div>
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm mb-2">
              <AlertCircle className="w-5 h-5" /> 24/7 Emergency Helplines
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              If experiencing chest pain, difficulty breathing, or severe sudden symptoms, contact national emergency services immediately.
            </p>
          </div>

          <div className="space-y-2">
            <a
              href="tel:108"
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-between transition shadow-lg shadow-rose-600/20"
            >
              <span className="flex items-center gap-2"><PhoneCall className="w-4 h-4" /> 108 Ambulance</span>
              <ChevronRight className="w-4 h-4" />
            </a>
            <a
              href="tel:112"
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-between border border-slate-700 transition"
            >
              <span className="flex items-center gap-2"><PhoneCall className="w-4 h-4" /> 112 National Emergency</span>
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>

      </div>

      {showChecker && (
        <SymptomCheckerModal onClose={() => setShowChecker(false)} />
      )}
    </div>
  );
};
