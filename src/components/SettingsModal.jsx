import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Globe, 
  Sun, 
  Moon, 
  Monitor, 
  Sparkles, 
  User, 
  Usb, 
  CheckCircle2, 
  ShieldCheck, 
  Key, 
  AlertCircle,
  Stethoscope,
  ShieldAlert,
  Sliders,
  Check
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

export function SettingsModal({ onClose }) {
  const { lang, setLanguage, theme, setTheme, vfx, setVfx } = useSettings();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'theme' | 'account' | 'usb'
  const [usbStatus, setUsbStatus] = useState(null);
  const [usbLoading, setUsbLoading] = useState(false);

  // Setup / Provision USB Passkey for Doctor or Admin
  const handleSetupUsb = async (role) => {
    setUsbLoading(true);
    setUsbStatus(null);
    try {
      const res = await fetch('/api/auth/setup-usb-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      if (res.ok) {
        setUsbStatus({
          type: 'success',
          message: data.message || `🔑 ${role.toUpperCase()} USB Passkey saved successfully to USB drive!`
        });
      } else {
        setUsbStatus({
          type: 'error',
          message: data.error || 'Failed to setup USB Passkey. Ensure a USB Pendrive is attached.'
        });
      }
    } catch (err) {
      setUsbStatus({
        type: 'error',
        message: 'Network error communicating with USB setup service.'
      });
    } finally {
      setUsbLoading(false);
    }
  };

  const isHindi = lang === 'hi';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-2xl bg-slate-900/95 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Settings className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
                {isHindi ? 'सिस्टम सेटिंग्स' : 'System Settings'}
              </h2>
              <p className="text-xs text-slate-400">
                {isHindi ? 'भाषा, थीम, VFX एनीमेशन और USB पेनड्राइव लॉगिन प्रबंधित करें' : 'Manage language, theme, VFX animations & USB Pendrive Login'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'general' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" /> {isHindi ? 'सामान्य / भाषा' : 'General & Language'}
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'theme' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" /> {isHindi ? 'थीम & VFX' : 'Theme & VFX'}
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'account' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" /> {isHindi ? 'अकाउंट (Account)' : 'Account'}
          </button>
          <button
            onClick={() => setActiveTab('usb')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'usb' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Usb className="w-4 h-4 text-emerald-400" /> {isHindi ? 'पेनड्राइव लॉगिन (USB)' : 'Pendrive Login (USB)'}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-sm">
          
          {/* TAB 1: GENERAL / LANGUAGE */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  {isHindi ? 'सिस्टम इंटरफ़ेस भाषा (Language Preference)' : 'System Interface Language'}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setLanguage('hi')}
                    className={`p-4 rounded-xl border flex items-center justify-between transition ${
                      lang === 'hi' 
                        ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-lg shadow-cyan-500/10' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🇮🇳</span>
                      <div className="text-left">
                        <div className="font-bold text-sm text-white">हिंदी (Hindi)</div>
                        <div className="text-xs text-slate-400">भारतीय भाषा इंटरफ़ेस</div>
                      </div>
                    </div>
                    {lang === 'hi' && <Check className="w-5 h-5 text-cyan-400" />}
                  </button>

                  <button
                    onClick={() => setLanguage('en')}
                    className={`p-4 rounded-xl border flex items-center justify-between transition ${
                      lang === 'en' 
                        ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-lg shadow-cyan-500/10' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🌐</span>
                      <div className="text-left">
                        <div className="font-bold text-sm text-white">English</div>
                        <div className="text-xs text-slate-400">Standard English Interface</div>
                      </div>
                    </div>
                    {lang === 'en' && <Check className="w-5 h-5 text-cyan-400" />}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs text-slate-300">
                💡 <span className="font-semibold">{isHindi ? 'नोट:' : 'Note:'}</span> {isHindi 
                  ? 'भाषा बदलने पर डैशबोर्ड, नेविगेशन और सभी संदेश तुरंत चुनी हुई भाषा में अपडेट हो जाएंगे।' 
                  : 'Changing language instantly updates navigation titles, buttons, and alerts across the portal.'}
              </div>
            </div>
          )}

          {/* TAB 2: THEME & ANIMATIONS / VFX */}
          {activeTab === 'theme' && (
            <div className="space-y-6">
              
              {/* Theme Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  {isHindi ? 'विजुअल थीम (Visual Theme)' : 'Visual Theme'}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Cyber Default */}
                  <button
                    onClick={() => setTheme('cyber')}
                    className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition text-center ${
                      theme === 'cyber'
                        ? 'bg-cyan-950/50 border-cyan-500 text-white shadow-md shadow-cyan-500/20'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                    }`}
                  >
                    <Monitor className="w-6 h-6 text-cyan-400" />
                    <div>
                      <div className="text-xs font-bold text-white">{isHindi ? 'डिफ़ॉल्ट (साइबर)' : 'Cyber Default'}</div>
                      <div className="text-[10px] text-slate-400">Cyan / Emerald</div>
                    </div>
                  </button>

                  {/* Dark Mode */}
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition text-center ${
                      theme === 'dark'
                        ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                    }`}
                  >
                    <Moon className="w-6 h-6 text-indigo-400" />
                    <div>
                      <div className="text-xs font-bold text-white">{isHindi ? 'डार्क मोड' : 'Dark Obsidian'}</div>
                      <div className="text-[10px] text-slate-400">Deep Indigo</div>
                    </div>
                  </button>

                  {/* Light Mode */}
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition text-center ${
                      theme === 'light'
                        ? 'bg-slate-200 border-cyan-600 text-slate-900 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                    }`}
                  >
                    <Sun className="w-6 h-6 text-amber-500" />
                    <div>
                      <div className="text-xs font-bold">{isHindi ? 'लाइट मोड' : 'Light Theme'}</div>
                      <div className="text-[10px] opacity-80">Clean Bright</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* VFX & Micro-animations Toggle */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      {isHindi ? 'एनीमेशन एवं विजुअल इफेक्ट्स (Animation & VFX)' : 'Animations & VFX'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {isHindi ? 'ग्लास प्रभाव, चमक और माइक्रो-एनीमेशन सक्षम या अक्षम करें' : 'Enable pulse glow, glassmorphism blur and smooth transitions'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setVfx(!vfx)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    vfx ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      vfx ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: ACCOUNT DETAILS */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {isHindi ? 'उपयोगकर्ता प्रोफाइल विवरण' : 'User Account Details'}
              </label>

              {user ? (
                <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center font-bold text-slate-950 text-xl shadow-lg">
                      {user.name ? user.name[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="font-bold text-base text-white">{user.name}</div>
                      <div className="text-xs text-slate-400">{user.email}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 text-xs">
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                      <div className="text-slate-400 font-medium mb-1">{isHindi ? 'खाता भूमिका (Role)' : 'Account Role'}</div>
                      <div className={`font-bold uppercase tracking-wider ${
                        user.role === 'admin' ? 'text-rose-400' :
                        user.role === 'doctor' ? 'text-emerald-400' :
                        'text-cyan-400'
                      }`}>
                        {user.role}
                      </div>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                      <div className="text-slate-400 font-medium mb-1">{isHindi ? 'सुरक्षा स्तर' : 'Security Level'}</div>
                      <div className="font-bold text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" /> 
                        {isHindi ? 'उच्च सुरक्षा (Encrypted)' : 'High Security Tier'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-xs">
                    <div className="text-slate-400 font-medium mb-1">{isHindi ? 'सक्रिय सत्र ID' : 'Active Session Token ID'}</div>
                    <div className="font-mono text-cyan-300 text-[11px] truncate">
                      {user.sessionId || 'SEC-SESSION-7369-ACTIVE-TOKEN'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <User className="w-10 h-10 text-slate-600 mx-auto" />
                  <div className="text-slate-300 font-semibold">
                    {isHindi ? 'आप वर्तमान में किसी भी खाते में लॉग इन नहीं हैं।' : 'You are currently not logged in.'}
                  </div>
                  <div className="text-xs text-slate-400">
                    {isHindi ? 'अकाउंट सेटिंग्स का पूर्ण उपयोग करने के लिए लॉग इन करें।' : 'Log in to view complete account security credentials.'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PENDRIVE (USB) LOGIN / KEY MANAGEMENT */}
          {activeTab === 'usb' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-3">
                <Usb className="w-6 h-6 text-emerald-400 shrink-0 mt-1" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-white text-sm">
                    {isHindi ? 'पेनड्राइव (USB) पासवर्ड ऑटो-लॉगिन सिस्टम' : 'Pendrive (USB) Hardware Passkey Auto-Login'}
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {isHindi
                      ? 'डॉक्टर और एडमिन अपनी पेनड्राइव (USB Drive) में अपना पासवर्ड सहेज सकते हैं। जब भी आप पेनड्राइव सिस्टम में लगाएंगे, बिना पासवर्ड टाइप किए अकाउंट ऑटोमैटिक लॉगिन हो जाएगा।'
                      : 'Doctors and Admins can write their secure hardware passkey directly into any connected USB Pendrive. Inserting the drive will automatically log you in without requiring a password.'}
                  </p>
                </div>
              </div>

              {/* Status Alert Banner */}
              {usbStatus && (
                <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
                  usbStatus.type === 'success' 
                    ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-200' 
                    : 'bg-rose-900/40 border-rose-500/50 text-rose-200'
                }`}>
                  {usbStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{usbStatus.message}</span>
                </div>
              )}

              {/* Action Buttons for Doctor and Admin USB setup */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Doctor USB Pendrive Registration */}
                <div className="p-5 rounded-xl bg-slate-950/60 border border-emerald-500/30 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                      <Stethoscope className="w-5 h-5" />
                      <span>{isHindi ? 'डॉक्टर पेनड्राइव सेव करें' : 'Doctor USB Passkey'}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-normal">
                      {isHindi 
                        ? 'डॉक्टर अपनी पेनड्राइव में पासवर्ड सहेजेंगे (doctor_key.sec)। पेनड्राइव लगाते ही क्लिनिकल पोर्टल ऑटोमैटिक खुल जाएगा।' 
                        : 'Saves Doctor passkey to USB. When inserted, automatically logs in and opens Doctor Clinical Portal.'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSetupUsb('doctor')}
                    disabled={usbLoading}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition"
                  >
                    <Key className="w-4 h-4" />
                    {usbLoading ? (isHindi ? 'प्रोसेसिंग...' : 'Writing Key...') : (isHindi ? 'डॉक्टर पेनड्राइव में सेव करें' : 'Save Doctor Key to USB')}
                  </button>
                </div>

                {/* Admin USB Pendrive Registration */}
                <div className="p-5 rounded-xl bg-slate-950/60 border border-rose-500/30 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-rose-400 font-bold mb-1">
                      <ShieldAlert className="w-5 h-5" />
                      <span>{isHindi ? 'एडमिन पेनड्राइव सेव करें' : 'Admin USB Passkey'}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-normal">
                      {isHindi 
                        ? 'एडमिन अपनी पेनड्राइव में पासवर्ड सहेजेंगे (admin_key.sec)। पेनड्राइव लगाते ही एडमिन सुरक्षा डैशबोर्ड ऑटोमैटिक खुल जाएगा।' 
                        : 'Saves Admin passkey to USB. When inserted, automatically logs in and opens Admin Security Panel.'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSetupUsb('admin')}
                    disabled={usbLoading}
                    className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 disabled:opacity-50 transition"
                  >
                    <Key className="w-4 h-4" />
                    {usbLoading ? (isHindi ? 'प्रोसेसिंग...' : 'Writing Key...') : (isHindi ? 'एडमिन पेनड्राइव में सेव करें' : 'Save Admin Key to USB')}
                  </button>
                </div>

              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 font-mono">
                🔍 {isHindi ? 'सिस्टम स्थिति:' : 'System Auto-Detect:'} <span className="text-emerald-400 font-semibold">Active (Scanning every 2.5s)</span>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
          >
            {isHindi ? 'बंद करें (Close)' : 'Close Settings'}
          </button>
        </div>

      </div>
    </div>
  );
}
