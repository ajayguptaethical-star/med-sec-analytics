import React, { useState } from 'react';
import { Shield, Lock, Mail, User, Check, AlertCircle, Award } from 'lucide-react';

export const Register = ({ setActiveTab }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'patient',
    medicalLicense: '',
    consentGiven: false
  });

  const [message, setMessage] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Live password policy checks
  const pass = formData.password;
  const checks = {
    length: pass.length >= 10,
    upper: /[A-Z]/.test(pass),
    lower: /[a-z]/.test(pass),
    number: /[0-9]/.test(pass),
    symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)
  };

  const isPasswordValid = Object.values(checks).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage(null);

    if (!isPasswordValid) {
      setError('Password does not satisfy security policy requirements.');
      return;
    }

    if (!formData.consentGiven) {
      setError('You must accept the Privacy Policy & Data Use consent terms.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed.');
      } else {
        setMessage(data.message);
        setTimeout(() => setActiveTab('login'), 2500);
      }
    } catch (err) {
      setError('Registration error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="glass-panel max-w-lg w-full p-8 relative">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/30">
            <Shield className="w-7 h-7 text-slate-950 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold text-white font-heading">Create Account</h1>
          <p className="text-xs text-slate-400 mt-1">Enterprise Health Security & Surveillance Registration</p>
        </div>

        {error && (
          <div className="bg-rose-500/15 border border-rose-500/30 p-3 rounded-xl text-rose-300 text-xs flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 p-3 rounded-xl text-emerald-300 text-xs flex items-center gap-2 mb-4">
            <Check className="w-4 h-4 shrink-0" />
            <span>{message} Redirecting to login...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Dr. Rajesh Kumar"
                className="glass-input pl-9 text-sm"
              />
            </div>
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
                placeholder="rajesh@healthsec.gov.in"
                className="glass-input pl-9 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'patient' })}
                className={`py-2 rounded-lg text-xs font-bold border transition ${
                  formData.role === 'patient' 
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                Patient / User
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'doctor' })}
                className={`py-2 rounded-lg text-xs font-bold border transition ${
                  formData.role === 'doctor' 
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                Medical Doctor
              </button>
            </div>
          </div>

          {formData.role === 'doctor' && (
            <div>
              <label className="block text-xs font-semibold text-emerald-400 mb-1">Medical License Number (MCI / State Board)</label>
              <div className="relative">
                <Award className="w-4 h-4 absolute left-3 top-3 text-emerald-400" />
                <input
                  type="text"
                  required
                  value={formData.medicalLicense}
                  onChange={(e) => setFormData({ ...formData, medicalLicense: e.target.value })}
                  placeholder="MCI-12345678"
                  className="glass-input pl-9 text-sm border-emerald-500/30"
                />
              </div>
            </div>
          )}

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

            {/* Live Password Policy Checklist */}
            <div className="mt-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 grid grid-cols-2 gap-1 text-[11px]">
              <div className={checks.length ? 'text-emerald-400 flex items-center gap-1' : 'text-slate-500 flex items-center gap-1'}>
                {checks.length ? '✓' : '•'} Min 10 Chars
              </div>
              <div className={checks.upper ? 'text-emerald-400 flex items-center gap-1' : 'text-slate-500 flex items-center gap-1'}>
                {checks.upper ? '✓' : '•'} Uppercase (A-Z)
              </div>
              <div className={checks.lower ? 'text-emerald-400 flex items-center gap-1' : 'text-slate-500 flex items-center gap-1'}>
                {checks.lower ? '✓' : '•'} Lowercase (a-z)
              </div>
              <div className={checks.number ? 'text-emerald-400 flex items-center gap-1' : 'text-slate-500 flex items-center gap-1'}>
                {checks.number ? '✓' : '•'} Number (0-9)
              </div>
              <div className={`col-span-2 ${checks.symbol ? 'text-emerald-400 flex items-center gap-1' : 'text-slate-500 flex items-center gap-1'}`}>
                {checks.symbol ? '✓' : '•'} Special Symbol (!@#$%^&*)
              </div>
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="flex items-start gap-2 pt-2">
            <input
              type="checkbox"
              id="consent"
              checked={formData.consentGiven}
              onChange={(e) => setFormData({ ...formData, consentGiven: e.target.checked })}
              className="mt-1 rounded accent-cyan-500 w-4 h-4"
            />
            <label htmlFor="consent" className="text-xs text-slate-300 leading-snug">
              I agree to the <span className="text-cyan-400 underline">Privacy Policy</span> and grant explicit consent for processing encrypted health surveillance data under security protocols.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !isPasswordValid || !formData.consentGiven}
            className="btn-primary w-full py-2.5 text-sm font-bold disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <button onClick={() => setActiveTab('login')} className="text-cyan-400 font-bold hover:underline">
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
