import React, { useEffect, useState } from 'react';
import { ShieldAlert, Laptop, Smartphone, Trash2, X, RefreshCw, Usb, CheckCircle, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ActiveSessionsModal = ({ onClose }) => {
  const { user, accessToken } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usbStatusMsg, setUsbStatusMsg] = useState('');
  const [usbLoading, setUsbLoading] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/sessions', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setSessions(data);
      }
    } catch (e) {
      console.error('Failed to load active sessions:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterUsbKey = async () => {
    setUsbLoading(true);
    setUsbStatusMsg('');
    try {
      const res = await fetch('/api/auth/setup-usb-key', { method: 'POST' });
      const data = await res.json();
      setUsbStatusMsg(data.message || '🔌 USB Pendrive Security Key Provisioned Successfully!');
    } catch (e) {
      setUsbStatusMsg('USB Setup Error: ' + e.message);
    } finally {
      setUsbLoading(false);
    }
  };

  const handleRemoteLogout = async (sessionId) => {
    try {
      await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      fetchSessions();
    } catch (e) {
      alert('Failed to revoke session: ' + e.message);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel max-w-xl w-full p-6 relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <KeyRound className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-bold text-white font-heading">Security & USB Key Management</h2>
        </div>

        {/* USB Pendrive Key Provisioning Section for Admin */}
        {user?.role === 'admin' && (
          <div className="mb-6 p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-3">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm font-heading">
              <Usb className="w-5 h-5 text-emerald-400" /> 🔌 Set Connected USB Pendrive as Master Login Key
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              System me jo bhi USB Pendrive abhi lagi hai use Admin Auto-Login Key set karne ke liye niche button dabaen. Next time jab bhi ye Pendrive PC me lagaenge, Admin Dashboard bina password type kiye automatically khul jaega!
            </p>

            {usbStatusMsg && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2 font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{usbStatusMsg}</span>
              </div>
            )}

            <button
              onClick={handleRegisterUsbKey}
              disabled={usbLoading}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
            >
              {usbLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" /> Installing Passkey to USB Drive...
                </>
              ) : (
                <>
                  <Usb className="w-4 h-4" /> 🔌 Register Attached USB Pendrive as Master Auto-Login Passkey
                </>
              )}
            </button>
          </div>
        )}

        {/* Active Logged-in Sessions Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white font-heading flex items-center gap-2">
            <ShieldAlert className="w-4.5 h-4.5 text-rose-400" /> Active Logged-in Sessions
          </h3>

          <p className="text-xs text-slate-400">
            Devices & IPs currently logged into your account. Unrecognized devices can be revoked immediately.
          </p>

          {loading ? (
            <div className="py-6 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" /> Loading active sessions...
            </div>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {sessions.map((sess) => (
                <div key={sess.id} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {sess.device.includes('iPhone') || sess.device.includes('Android') ? (
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Laptop className="w-4 h-4 text-cyan-400" />
                    )}
                    <div>
                      <div className="text-xs font-semibold text-white truncate max-w-xs">{sess.device}</div>
                      <div className="text-[11px] text-slate-400">
                        IP: <span className="font-mono text-cyan-300">{sess.ip_address}</span> • {new Date(sess.last_active).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoteLogout(sess.id)}
                    className="px-2.5 py-1 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded-lg text-[11px] font-bold border border-rose-500/30 flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3 h-3" /> Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 text-right border-t border-slate-800 pt-3">
          <button onClick={onClose} className="px-5 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-xs font-bold transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
