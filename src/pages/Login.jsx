import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Lock, Mail, AlertCircle, CheckCircle, Usb, RefreshCw, KeyRound, ShieldCheck, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login = ({ setActiveTab }) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isOtpFallback, setIsOtpFallback] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // USB Auto-Detect Status
  const [usbScanning, setUsbScanning] = useState(false);
  const [usbStatusMessage, setUsbStatusMessage] = useState('');

  // Store login/setActiveTab in refs so the interval never needs to re-create
  // when those function references change (avoids infinite re-render loop)
  const loginRef = useRef(login);
  const setActiveTabRef = useRef(setActiveTab);
  useEffect(() => { loginRef.current = login; }, [login]);
  useEffect(() => { setActiveTabRef.current = setActiveTab; }, [setActiveTab]);

  // Auto-scan for USB Pendrive on mount and every 3 seconds
  useEffect(() => {
    let interval = null;
    let isMounted = true;
    let detected = false; // stop polling once USB is found

    const checkUsb = async () => {
      if (detected) return; // already logged in, skip
      try {
        setUsbScanning(true);
        const res = await fetch('/api/auth/usb-check');
        const data = await res.json();

        if (isMounted && data.detected && data.user) {
          detected = true; // stop future polls
          clearInterval(interval);
          setUsbStatusMessage(data.message || '🔌 USB Pendrive Key Detected!');
          loginRef.current(data.user, data.accessToken);
          const role = data.user.role;
          if (role === 'admin') setActiveTabRef.current('admin');
          else if (role === 'doctor') setActiveTabRef.current('doctor');
          else setActiveTabRef.current('user');
        } else if (isMounted) {
          setUsbStatusMessage(data.message || 'No registered USB Pendrive detected on system.');
        }
      } catch (err) {
        // Silent background check — network errors are ignored
      } finally {
        if (isMounted) setUsbScanning(false);
      }
    };

    checkUsb();
    interval = setInterval(checkUsb, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []); // ← empty deps: only runs once on mount, refs handle latest values

  // Standard Email & Password Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          isOtpFallback
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Please check your email and password.');
        return;
      }

      if (data.user) {
        login(data.user, data.accessToken);
        
        if (data.user.role === 'admin') {
          setActiveTab('admin');
        } else if (data.user.role === 'doctor') {
          setActiveTab('doctor');
        } else {
          setActiveTab('user');
        }
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Manual USB Check
  const handleManualUsbCheck = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/usb-check');
      const data = await res.json();
      if (data.detected && data.user) {
        setMessage(data.message || 'USB Pendrive Key Verified!');
        login(data.user, data.accessToken);
        if (data.user.role === 'admin') setActiveTab('admin');
        else if (data.user.role === 'doctor') setActiveTab('doctor');
        else setActiveTab('user');
      } else {
        setError('USB Pendrive not detected. Insert USB Pendrive into PC or register it via Navbar key button.');
      }
    } catch (err) {
      setError('USB Scan error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Register Connected USB Pendrive as Key
  const handleProvisionUsbKey = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/setup-usb-key', { method: 'POST' });
      const data = await res.json();
      setMessage(data.message || 'USB Passkey setup complete!');
    } catch (err) {
      setError('USB Provision error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10">
      <div className="glass-panel max-w-md w-full p-8 relative overflow-hidden">
        
        {/* Top Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-emerald-400 to-teal-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/30">
            <Shield className="w-8 h-8 text-slate-950 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold text-white font-heading">Healthcare Security Portal</h1>
          <p className="text-xs text-slate-400 mt-1 mb-6">Admin USB Auto-Login & Email Authentication</p>
          
          {/* Custom Doctor Operation Animation */}
          <div className="w-full h-40 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative shadow-inner mb-2">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/30 via-slate-950 to-slate-950"></div>
            
            {/* Surgery Light */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 origin-top animate-swing z-10">
              <div className="w-1 h-8 bg-slate-600 mx-auto"></div>
              <div className="w-16 h-3 bg-slate-300 rounded-b-full shadow-[0_20px_40px_rgba(34,211,238,0.7)] flex justify-center">
                <div className="w-12 h-1 bg-cyan-100 mt-1 rounded-full opacity-80 shadow-[0_5px_15px_rgba(255,255,255,1)]"></div>
              </div>
            </div>

            {/* Heartbeat Monitor */}
            <div className="absolute top-3 left-4 w-12 h-8 bg-slate-900 border border-slate-700 rounded p-1 shadow-lg flex items-center justify-center">
              <Activity className="w-full h-full text-emerald-500 animate-pulse" />
            </div>

            {/* IV Drip */}
            <div className="absolute top-6 right-8 w-1 h-20 bg-slate-600">
              <div className="absolute -top-4 -left-1.5 w-4 h-6 border-2 border-slate-400 rounded-lg bg-cyan-400/20"></div>
              <div className="absolute top-3 -left-1 w-3 h-3 bg-cyan-300/50 rounded-full animate-bounce"></div>
            </div>

            {/* Operation Bed & Patient */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-40 h-5 bg-slate-700 rounded shadow-lg z-0">
              <div className="absolute -top-3 left-6 w-28 h-6 bg-emerald-600/40 rounded-t-lg backdrop-blur-sm border-t border-emerald-500/30"></div> {/* Blanket */}
              <div className="absolute -top-3 right-4 w-7 h-7 bg-amber-100 rounded-full shadow-inner"></div> {/* Patient Head */}
            </div>

            {/* Doctor Operating */}
            <div className="absolute bottom-3 left-1/3 w-10 h-24 bg-cyan-600 rounded-t-xl animate-doctorMove z-20 shadow-[-5px_0_15px_rgba(0,0,0,0.5)]">
              {/* Doctor Head */}
              <div className="absolute -top-6 left-1.5 w-7 h-7 bg-amber-200 rounded-full">
                {/* Mask */}
                <div className="absolute bottom-0 left-0 w-full h-4 bg-cyan-100 rounded-b-full border-t border-cyan-200"></div>
              </div>
              {/* Surgical Cap */}
              <div className="absolute -top-8 left-1 w-8 h-4 bg-cyan-700 rounded-t-full shadow-sm"></div>
              
              {/* Operating Arm */}
              <div className="absolute top-4 -right-6 w-8 h-3 bg-cyan-500 rounded-full origin-left animate-operate shadow-md flex justify-end items-center pr-1">
                {/* Scalpel/Tool */}
                <div className="w-3 h-0.5 bg-slate-300 transform rotate-45"></div>
              </div>
              
              {/* Second Static Arm */}
              <div className="absolute top-6 -right-2 w-6 h-3 bg-cyan-700 rounded-full origin-left transform rotate-12 z-[-1]"></div>
            </div>
            
            {/* Blood particles / abstract medical symbols floating */}
            <div className="absolute top-1/2 right-1/4 text-rose-500 opacity-20 text-xs animate-ping">✚</div>
          </div>
        </div>

        {/* METHOD 1: USB Pendrive Hardware Auto-Detect Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/90 to-slate-900 border border-cyan-500/40 shadow-inner">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                <Usb className={`w-5 h-5 ${usbScanning ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 font-heading">
                  1. USB Pendrive Auto-Login (Full Privilege)
                  {usbScanning && <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {usbStatusMessage || 'Plug in USB Pendrive for instant password-less login'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleManualUsbCheck}
              disabled={loading}
              className="flex-1 py-2 text-xs bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold rounded-xl shadow transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Usb className="w-4 h-4" /> Auto-Login with USB
            </button>
            <button
              type="button"
              onClick={handleProvisionUsbKey}
              disabled={loading}
              title="Register current connected USB drive"
              className="px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl font-bold transition"
            >
              + Register USB
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="bg-rose-500/15 border border-rose-500/30 p-3 rounded-xl text-rose-300 text-xs flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 p-3 rounded-xl text-emerald-300 text-xs flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* METHOD 2: Standard Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-heading">
            <Lock className="w-3.5 h-3.5 text-cyan-400" /> 2. Login with Email & Password
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ajay.gupta.ethical@gmail.com"
                className="glass-input pl-9 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••••••"
                className="glass-input pl-9 text-sm"
              />
            </div>
          </div>

          {/* USB Security / OTP Fallback toggle */}
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold">OTP Fallback Mode (Without USB)</span>
              </div>
              <input
                type="checkbox"
                checked={isOtpFallback}
                onChange={(e) => setIsOtpFallback(e.target.checked)}
                className="rounded accent-cyan-500 w-4 h-4"
              />
            </div>

            {isOtpFallback ? (
              <p className="text-[11px] text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 leading-relaxed">
                ⚠️ Note: Logging in via OTP Fallback sets session to <strong>Limited Privilege</strong> (Blocks delete/export actions until USB Key is attached).
              </p>
            ) : (
              <p className="text-[11px] text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Full Admin Privilege Mode Active.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => setActiveTab('forgot-password')}
              className="text-cyan-400 hover:text-cyan-300 font-medium"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>



      </div>
    </div>
  );
};



