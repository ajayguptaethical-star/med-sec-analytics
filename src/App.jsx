import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { EmergencyBanner } from './components/EmergencyBanner';
import { DoctorScrollVfx } from './components/DoctorScrollVfx';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { DoctorPortal } from './pages/DoctorPortal';
import { UserPortal } from './pages/UserPortal';
import { AdminDashboard } from './pages/AdminDashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { useAuth } from './context/AuthContext';
import { Usb, CheckCircle } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [usbNotice, setUsbNotice] = useState('');
  const { user, login } = useAuth();

  // Keep refs so the interval callback always reads the latest values
  // WITHOUT needing them as effect dependencies (which would restart the interval)
  const userRef = useRef(user);
  const activeTabRef = useRef(activeTab);
  const loginRef = useRef(login);
  const setActiveTabRef = useRef(setActiveTab);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { loginRef.current = login; }, [login]);

  // Flag: blocks USB auto-login for 30s after user manually logs out
  const loggedOutRef = useRef(false);

  // ✅ LOGOUT REDIRECT: When user becomes null (any logout), switch to login tab
  useEffect(() => {
    if (!user) {
      // Only redirect if currently on a protected tab
      const protectedTabs = ['doctor', 'admin', 'user'];
      if (protectedTabs.includes(activeTabRef.current)) {
        setActiveTab('login');
        loggedOutRef.current = true;
        setTimeout(() => { loggedOutRef.current = false; }, 30000);
      }
    }
  }, [user]); // runs every time user changes

  // Background USB Pendrive Passkey Auto-Detector — runs ONCE on mount only
  useEffect(() => {
    let isMounted = true;
    let detected = false; // stop polling as soon as USB login succeeds

    const checkUsbPasskey = async () => {
      if (detected) return;
      if (loggedOutRef.current) return; // user just logged out — don't auto re-login
      if (userRef.current) return;      // already logged in — skip
      try {
        const res = await fetch('/api/auth/usb-check');
        const data = await res.json();

        if (isMounted && data.detected && data.user) {
          const detectedRole = data.role || data.user.role;
          const targetTab = detectedRole === 'doctor' ? 'doctor' : 'admin';

          detected = true; // stop further polls
          clearInterval(interval);
          loginRef.current(data.user, data.accessToken);
          setActiveTabRef.current(targetTab);
          setUsbNotice(data.message || `🔌 USB Key Detected! ${targetTab.toUpperCase()} Login Successful.`);
          setTimeout(() => { if (isMounted) setUsbNotice(''); }, 5000);
        }
      } catch (err) {
        // Silent polling error
      }
    };

    checkUsbPasskey();
    const interval = setInterval(checkUsbPasskey, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []); // ← empty: runs only once, refs handle latest state

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 relative">
      <EmergencyBanner />

      {/* USB Auto-Detect Instant Notification Toast */}
      {usbNotice && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-xl border-b border-emerald-400/30 animate-bounce">
          <Usb className="w-4 h-4 text-emerald-200" />
          <span>{usbNotice}</span>
          <CheckCircle className="w-4 h-4 text-emerald-200" />
        </div>
      )}

      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1">
        {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'doctor' && <DoctorPortal />}
        {activeTab === 'user' && <UserPortal />}
        {activeTab === 'admin' && <AdminDashboard />}
        {activeTab === 'login' && <Login setActiveTab={setActiveTab} />}
        {activeTab === 'register' && <Register setActiveTab={setActiveTab} />}
        {activeTab === 'forgot-password' && <ForgotPassword setActiveTab={setActiveTab} />}
      </main>

      {/* Interactive Cartoon Doctor Surgery Operation Scroll VFX */}
      <DoctorScrollVfx />

      <footer className="glass-panel rounded-none border-x-0 border-b-0 py-6 px-4 text-center text-xs text-slate-400 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            &copy; 2026 Enterprise Health Security & Disease Surveillance Platform. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
            <span>AES-256 GCM Encrypted</span> • <span>SHA-256 Hash Chain</span> • <span>USB Hardware Passkey Enforced</span>
          </div>
        </div>
      </footer>
    </div>
  );
}


export default App;
