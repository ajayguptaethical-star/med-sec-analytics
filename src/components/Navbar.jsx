import React, { useState } from 'react';
import { Shield, Activity, Users, User, Lock, PhoneCall, Globe, LogOut, KeyRound, Sparkles, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ActiveSessionsModal } from './ActiveSessionsModal';
import { SettingsModal } from './SettingsModal';

export const Navbar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const { toggleLanguage, t } = useLanguage();
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  return (
    <>
      <nav className="glass-panel rounded-none border-x-0 border-t-0 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-heading font-extrabold text-lg text-white tracking-wide flex items-center gap-2">
                SecureHealth <span className="bg-cyan-500/20 text-cyan-400 text-xs px-2 py-0.5 rounded-full font-sans font-semibold border border-cyan-500/30">v2.5 Security</span>
              </div>
              <div className="text-xs text-slate-400">Enterprise Healthcare & Surveillance</div>
            </div>
          </div>

          {/* Navigation Links Segregated by Role */}
          <div className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'dashboard' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Activity className="w-4 h-4" /> Overview
            </button>

            {/* Patient Role Dedicated Navigation */}
            {(!user || user.role === 'patient') && (
              <button
                onClick={() => setActiveTab('user')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'user' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <User className="w-4 h-4 text-cyan-400" /> Patient Portal
              </button>
            )}

            {/* Doctor Role Dedicated Navigation */}
            {user?.role === 'doctor' && (
              <button
                onClick={() => setActiveTab('doctor')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'doctor' ? 'bg-emerald-400 text-slate-950 shadow' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-950" /> Doctor Clinical Portal
              </button>
            )}

            {/* Admin Role Dedicated Navigation */}
            {user?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'admin' ? 'bg-rose-500 text-white shadow' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Lock className="w-4 h-4" /> Admin Security Panel
              </button>
            )}

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'analytics' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Activity className="w-4 h-4" /> Analytics & Map
            </button>
          </div>

          {/* Quick Helplines, Settings, Lang & User Menu */}
          <div className="flex items-center gap-3">
            <a
              href="tel:108"
              className="hidden lg:flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-rose-500/20 transition"
            >
              <PhoneCall className="w-3.5 h-3.5" /> Emergency 108 / 112
            </a>

            {/* Settings Modal Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              title="Settings (सेटिंग्स)"
              className="flex items-center gap-1.5 bg-slate-800 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 hover:bg-slate-700 transition"
            >
              <Settings className="w-3.5 h-3.5 text-cyan-400" />
              <span>Settings</span>
            </button>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 bg-slate-800 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              {t('languageToggle')}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSessionsModal(true)}
                  title="View Active Sessions"
                  className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
                >
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                </button>

                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-white">{user.name}</div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${
                    user.role === 'admin' ? 'text-rose-400' :
                    user.role === 'doctor' ? 'text-emerald-400' :
                    'text-cyan-400'
                  }`}>
                    {user.role} Account
                  </div>
                </div>

                <button
                  onClick={logout}
                  title="Logout"
                  className="p-2 text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-rose-950/40 rounded-lg border border-slate-800 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('login')}
                  className="px-3 py-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300"
                >
                  {t('login')}
                </button>
                <button
                  onClick={() => setActiveTab('register')}
                  className="btn-primary text-xs py-1.5 px-4 font-bold"
                >
                  {t('register')}
                </button>
              </div>
            )}
          </div>

        </div>
      </nav>

      {/* Active Sessions Modal */}
      {showSessionsModal && (
        <ActiveSessionsModal onClose={() => setShowSessionsModal(false)} />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </>
  );
};

