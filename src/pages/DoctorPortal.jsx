import React, { useEffect, useState } from 'react';
import { Users, Lock, Plus, Edit, Trash2, Clock, ThumbsUp, ThumbsDown, MessageSquare, AlertCircle, Sparkles, CheckCircle, Send, Mail, Phone, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DoctorPortal = () => {
  const { user, accessToken, logout } = useAuth();
  const [patients, setPatients] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'add', 'followups', 'ai'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New Patient Form
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    age: 30,
    gender: 'male',
    disease: 'Dengue',
    city: 'Delhi',
    status: 'under_treatment'
  });

  const [reminderStatus, setReminderStatus] = useState('');
  const [selectedReminderPatient, setSelectedReminderPatient] = useState(null);

  // Doctor AI Chat
  const [aiQuery, setAiQuery] = useState('');
  const [aiHistory, setAiHistory] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchPatients();
    fetchFollowUps();
    fetchAiHistory();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/patients', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.status === 401) {
        logout();
        return;
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setPatients(data);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowUps = async () => {
    try {
      const res = await fetch('/api/patients/follow-ups', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setFollowUps(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAiHistory = async () => {
    try {
      const res = await fetch('/api/ai/history', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setAiHistory(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    setError('');

    let finalLat = 28.6139; // Default fallback to Delhi
    let finalLng = 77.2090;

    const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (googleMapsApiKey && googleMapsApiKey !== 'YOUR_API_KEY_HERE') {
      try {
        const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formData.city + ', India')}&key=${googleMapsApiKey}`);
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          finalLat = geoData.results[0].geometry.location.lat;
          finalLng = geoData.results[0].geometry.location.lng;
        }
      } catch (err) {
        console.error("Geocoding failed:", err);
      }
    }

    const payload = { ...formData, lat: finalLat, lng: finalLng };

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : {};

      if (!res.ok) {
        if (res.status === 401) {
          alert('Session Expired: Please log in again.');
          logout();
          return;
        }
        if (data.code === 'DUPLICATE_PATIENT') {
          setError(data.error);
        } else {
          setError(data.error || 'Failed to add patient.');
        }
      } else {
        alert(data.message || 'Patient added successfully');
        setFormData({ name: '', phone: '', email: '', address: '', age: 30, gender: 'male', disease: 'Dengue', city: 'Delhi', status: 'under_treatment' });
        setActiveTab('list');
        fetchPatients();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReminderChoice = async (channel) => {
    if (!selectedReminderPatient) return;
    const p = selectedReminderPatient;
    setSelectedReminderPatient(null);
    setError('');
    setReminderStatus('');

    try {
      const res = await fetch(`/api/patients/${p.id}/reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      });
      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : {};

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reminder');
      }

      if (channel === 'whatsapp') {
        const rawPhone = p.phone || '8369791943';
        let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
        const msgText = encodeURIComponent(`Hello ${p.name},\n\nThis is an automated health follow-up reminder from your attending doctor regarding your diagnosis of ${p.disease}.\n\nPlease ensure you follow your prescribed medication routine, drink clean water, and schedule a follow-up visit if your symptoms persist.\n\nTake care & stay healthy!\n- HealthSec Medical Team`);
        const targetUrl = data.whatsappUrl || `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${msgText}`;
        window.open(targetUrl, '_blank');
        setReminderStatus(`✅ WhatsApp Web opened for ${p.name} (+${cleanPhone})! Direct messaging enabled via your logged-in WhatsApp account.`);
      } else if (channel === 'email') {
        if (p.email) {
          const subject = encodeURIComponent(`🏥 Health Follow-up Reminder: ${p.disease} Care Plan`);
          const body = encodeURIComponent(`Hello ${p.name},\n\nThis is an automated follow-up reminder from your attending doctor regarding your diagnosis of ${p.disease}.\n\nPlease ensure you follow your prescribed medication routine and schedule a follow-up visit if your symptoms persist.\n\nTake care & stay healthy!\n- HealthSec Medical Team`);
          window.open(`mailto:${p.email}?subject=${subject}&body=${body}`, '_self');
          setReminderStatus(`✅ Doctor email client opened & automated email queued to ${p.email}!`);
        } else {
          alert('Email unavailable: No email address provided for this patient.');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to trigger reminder');
    }
  };

  const handleDeletePatient = async (patientId) => {
    if (!confirm('Are you sure you want to delete this patient record? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : {};

      if (res.ok) {
        alert(data.message || 'Patient record deleted successfully.');
        fetchPatients();
        fetchFollowUps();
      } else {
        alert('Delete failed: ' + (data.error || 'Permission denied'));
      }
    } catch (e) {
      alert('Delete error: ' + e.message);
    }
  };

  const handleAiAsk = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    const currentQuery = aiQuery;
    setAiLoading(true);

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ queryText: currentQuery })
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : {};

      if (!res.ok) {
        if (res.status === 401 || data.code === 'TOKEN_EXPIRED' || data.code === 'IDLE_TIMEOUT' || data.code === 'SESSION_TERMINATED') {
          alert('Session Expired: Your security token has expired or is invalid. Redirecting to login page to refresh token...');
          logout();
          return;
        }
        alert('Doctor AI Error: ' + (data.error || 'Failed to get response from AI'));
        return;
      }

      setAiQuery('');

      // Update UI state immediately with new AI response
      const newEntry = {
        id: data.chatId || Date.now(),
        query: currentQuery,
        response: data.answer,
        created_at: new Date().toISOString()
      };

      setAiHistory((prev) => [newEntry, ...prev.filter(item => item.id !== newEntry.id)]);
      fetchAiHistory();
    } catch (err) {
      alert('Doctor AI Connection Error: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiFeedback = async (chatId, rating) => {
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ chatId, rating })
      });
      fetchAiHistory();
    } catch (e) {
      alert('Feedback failed');
    }
  };

  const handleDeleteAiEntry = async (chatId) => {
    if (!chatId || chatId === 'undefined') {
      setAiHistory((prev) => prev.filter((item) => item.id !== chatId));
      return;
    }

    if (!confirm('Are you sure you want to delete this AI query entry from history?')) return;

    try {
      const res = await fetch(`/api/ai/history/${encodeURIComponent(chatId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setAiHistory((prev) => prev.filter((item) => String(item.id) !== String(chatId)));
      } else {
        if (res.status === 401) {
          alert('Session Expired: Please log in again.');
          logout();
          return;
        }
        // Fallback optimistic cleanup
        setAiHistory((prev) => prev.filter((item) => String(item.id) !== String(chatId)));
      }
    } catch (e) {
      setAiHistory((prev) => prev.filter((item) => String(item.id) !== String(chatId)));
    }
  };

  const handleClearAllAiHistory = async () => {
    if (!confirm('Are you sure you want to clear ALL Doctor AI chat history?')) return;

    try {
      const res = await fetch('/api/ai/history', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setAiHistory([]);
      } else {
        if (res.status === 401) {
          alert('Session Expired: Please log in again.');
          logout();
          return;
        }
        alert('Failed to clear history: ' + (data.error || 'Server error'));
      }
    } catch (e) {
      alert('Clear history error: ' + e.message);
    }
  };

  const renderFormattedAiResponse = (text) => {
    if (!text) return null;

    const sectionRegex = /(🏥|✅|❌|💊|🚨)\s*([^\n]+)/g;
    const matches = [...text.matchAll(sectionRegex)];

    if (matches.length < 2) {
      return (
        <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed font-sans bg-slate-950/60 p-4 rounded-xl border border-slate-800/60">
          {text}
        </div>
      );
    }

    const sections = [];
    for (let i = 0; i < matches.length; i++) {
      const icon = matches[i][1];
      const headerTitle = matches[i][2];
      const startIndex = matches[i].index + matches[i][0].length;
      const endIndex = (i + 1 < matches.length) ? matches[i + 1].index : text.length;
      const content = text.slice(startIndex, endIndex).trim();
      sections.push({ icon, headerTitle, content });
    }

    return (
      <div className="space-y-3">
        {sections.map((sec, idx) => {
          let cardStyle = "bg-slate-900/90 border-slate-800 text-slate-200";
          let badgeText = "";

          if (sec.icon === '✅' || sec.headerTitle.includes('WHAT TO DO') || sec.headerTitle.includes('RECOMMENDED')) {
            cardStyle = "bg-emerald-950/40 border-emerald-500/40 text-emerald-100 shadow-sm";
            badgeText = "क्या करें / What to Do";
          } else if (sec.icon === '❌' || sec.headerTitle.includes('NOT TO DO') || sec.headerTitle.includes('CONTRAINDICATIONS')) {
            cardStyle = "bg-rose-950/40 border-rose-500/40 text-rose-100 shadow-sm";
            badgeText = "क्या न करें / Strictly Avoid";
          } else if (sec.icon === '💊' || sec.headerTitle.includes('MEDICATIONS') || sec.headerTitle.includes('DOSAGES')) {
            cardStyle = "bg-indigo-950/40 border-indigo-500/40 text-indigo-100 shadow-sm";
            badgeText = "💊 Medicines & Dosages (For Doctor Review)";
          } else if (sec.icon === '🏥' || sec.headerTitle.includes('DIAGNOSIS')) {
            cardStyle = "bg-cyan-950/40 border-cyan-500/40 text-cyan-100";
            badgeText = "Diagnostic Workup";
          } else if (sec.icon === '🚨' || sec.headerTitle.includes('RED FLAGS')) {
            cardStyle = "bg-amber-950/40 border-amber-500/40 text-amber-100";
            badgeText = "Emergency Signals";
          }

          return (
            <div key={idx} className={`p-4 rounded-xl border ${cardStyle} space-y-2`}>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold font-heading flex items-center gap-1.5 uppercase tracking-wide">
                  <span className="text-base">{sec.icon}</span> {sec.headerTitle}
                </h4>
                {badgeText && (
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-current opacity-90">
                    {badgeText}
                  </span>
                )}
              </div>
              <p className="text-xs whitespace-pre-line leading-relaxed pl-1 opacity-95">
                {sec.content}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-heading flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-400" /> Medical Doctor Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-emerald-400" /> All Patient Name, Phone, and Address fields are AES-256 Encrypted & Access Audited
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${activeTab === 'list' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Patient Records ({patients.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${activeTab === 'add' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            + New Case Entry
          </button>
          <button
            onClick={() => setActiveTab('followups')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${activeTab === 'followups' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Follow-up Reminders ({followUps.length})
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${activeTab === 'ai' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Doctor AI Assistant
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/15 border border-rose-500/30 p-3.5 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Patient Records List */}
      {activeTab === 'list' && (
        <div className="glass-panel p-6 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Patient Name (Decrypted)</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Age / Gender</th>
                  <th className="p-3">Disease</th>
                  <th className="p-3">City</th>
                  <th className="p-3">Treatment Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/50">
                    <td className="p-3 font-mono text-slate-500">#{p.id}</td>
                    <td className="p-3 font-bold text-white flex items-center gap-1.5">
                      <span>{p.name}</span>
                      <Lock className="w-3 h-3 text-emerald-400" title="AES-256 Field Level Encrypted" />
                    </td>
                    <td className="p-3 font-mono text-slate-300">{p.phone}</td>
                    <td className="p-3">{p.age} yrs / {p.gender}</td>
                    <td className="p-3 font-bold text-cyan-300">{p.disease}</td>
                    <td className="p-3">{p.city}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        p.status === 'under_treatment' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        p.status === 'recovered' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {p.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDeletePatient(p.id)}
                        className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg border border-rose-500/30 transition text-xs font-bold inline-flex items-center gap-1 active:scale-95"
                        title="Delete Patient Record"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Add New Patient Entry Form */}
      {activeTab === 'add' && (
        <div className="glass-panel max-w-2xl mx-auto p-6 space-y-4">
          <h2 className="text-lg font-bold text-white font-heading">Register New Patient Case (With Duplicate Detection)</h2>

          <form onSubmit={handleAddPatient} className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Patient Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Rohan Sharma"
                  className="glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Email (WhatsApp/Mail)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="patient@example.com"
                  className="glass-input text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-semibold">Residential Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Connaught Place, Delhi"
                className="glass-input text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Age</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                  className="glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="glass-input text-xs"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">City</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="glass-input text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Diagnosed Disease</label>
                <input
                  type="text"
                  required
                  value={formData.disease}
                  onChange={(e) => setFormData({ ...formData, disease: e.target.value })}
                  placeholder="Dengue"
                  className="glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Treatment Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="glass-input text-xs"
                >
                  <option value="under_treatment">Under Treatment</option>
                  <option value="recovered">Recovered</option>
                  <option value="referred">Referred</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button type="submit" className="btn-primary py-2 px-6 text-sm">
                Save & Encrypt Case
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Follow-up Reminders Tab */}
      {activeTab === 'followups' && (
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white font-heading">Active Patient Follow-up Reminders</h2>
            <span className="text-xs text-slate-400">Auto WhatsApp + Email Dispatch Enabled</span>
          </div>

          {reminderStatus && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center justify-between">
              <span>{reminderStatus}</span>
              <button onClick={() => setReminderStatus('')} className="text-emerald-400 hover:text-white font-bold ml-2">✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {followUps.map(f => (
              <div key={f.id} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-bold text-white text-sm">{f.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                    {f.status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs text-slate-400">Disease: <span className="text-cyan-300 font-bold">{f.disease}</span></div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-emerald-400" /> Phone: <span className="text-slate-200 font-mono">{f.phone || 'N/A'}</span>
                </div>
                {f.email ? (
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-cyan-400" /> Email: <span className="text-slate-200 font-mono">{f.email}</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic">No email provided</div>
                )}
                <div className="text-xs text-slate-400">City: {f.city}</div>

                <div className="pt-2">
                  <button
                    onClick={() => setSelectedReminderPatient(f)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 px-3 rounded-lg border border-emerald-500 font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" /> Send Reminder (WhatsApp / Email)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Doctor AI Assistant Tab */}
      {activeTab === 'ai' && (
        <div className="glass-panel p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white font-heading flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" /> Google Gemini Clinical AI Consultant
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Doctor GenAI Support: Recommends <b>What to Do (क्या करें)</b>, <b>What NOT to Do (क्या न करें)</b>, and <b>Rx Medicines & Dosages (दवाइयाँ)</b>.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 self-start sm:self-auto">
              Doctor Clinical Mode Active
            </span>
          </div>

          {/* Quick Clinical Query Shortcuts */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Quick Clinical Shortcuts (Hindi / Hinglish / English):</span>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => setAiQuery('Dengue fever patient me kya kare aur kya nahi kare, platelet aur paracetamol dosage suggest kare')}
                className="bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-lg font-medium transition"
              >
                🦟 Dengue Fever: What to do / Not to do & Medicines
              </button>
              <button
                type="button"
                onClick={() => setAiQuery('Malaria P. vivax vs P. falciparum antimalarial drug dosages and G6PD warning')}
                className="bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-medium transition"
              >
                🔬 Malaria Diagnosis & Antimalarial Dosages
              </button>
              <button
                type="button"
                onClick={() => setAiQuery('Typhoid enteric fever empirical antibiotics and perforation prevention')}
                className="bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg font-medium transition"
              >
                💊 Typhoid Antibiotics & Contraindications
              </button>
              <button
                type="button"
                onClick={() => setAiQuery('Viral cough, fever, cold - kya karein aur kya na karein')}
                className="bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg font-medium transition"
              >
                🫁 Viral Cough & Cold Advisory
              </button>
            </div>
          </div>

          <form onSubmit={handleAiAsk} className="flex gap-2">
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Ask Doctor AI (e.g. Dengue bukhar me kya kare aur konsi medicine de)..."
              className="glass-input text-sm"
            />
            <button type="submit" disabled={aiLoading} className="btn-primary py-2 px-6 text-sm font-bold whitespace-nowrap">
              {aiLoading ? 'Consulting Gemini AI...' : 'Ask Doctor AI'}
            </button>
          </form>

          {/* AI History */}
          <div className="space-y-4 pt-2">
            {aiHistory.length > 0 && (
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs text-slate-400 font-semibold font-mono">
                  Consultation History ({aiHistory.length} saved)
                </span>
                <button
                  type="button"
                  onClick={handleClearAllAiHistory}
                  className="px-3 py-1 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All AI History
                </button>
              </div>
            )}

            {aiLoading && (
              <div className="bg-slate-900/90 p-5 rounded-2xl border border-cyan-500/40 space-y-3 animate-pulse shadow-lg">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                  <Sparkles className="w-4 h-4 animate-spin" /> Consulting Google Gemini AI for Clinical Protocol...
                </div>
                <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                <div className="h-4 bg-slate-800 rounded w-1/2"></div>
              </div>
            )}
            {aiHistory.length === 0 && !aiLoading && (
              <div className="text-center py-8 text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                No clinical queries yet. Type a query above or click a shortcut to consult Google Gemini AI.
              </div>
            )}
            {aiHistory.map((item) => (
              <div key={item.id} className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-lg">
                <div className="text-xs font-bold text-cyan-300 flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="truncate">Clinical Query: {item.query}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {item.created_at ? new Date(item.created_at).toLocaleTimeString() : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteAiEntry(item.id)}
                      className="text-slate-500 hover:text-rose-400 transition p-1 rounded-md hover:bg-rose-500/10"
                      title="Delete this query from history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {renderFormattedAiResponse(item.response)}

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[11px] text-slate-500 font-mono">Google Gemini Clinical AI Decision Support</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Helpful?</span>
                    <button
                      onClick={() => handleAiFeedback(item.id, 1)}
                      className={`p-1.5 rounded-lg border transition ${item.feedback === 1 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'}`}
                      title="Helpful"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleAiFeedback(item.id, -1)}
                      className={`p-1.5 rounded-lg border transition ${item.feedback === -1 ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'}`}
                      title="Not Helpful"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Reminder Channel Choice Modal */}
      {selectedReminderPatient && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 space-y-5 border-emerald-500/30 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-400" /> Choose Reminder Channel
              </h3>
              <button
                onClick={() => setSelectedReminderPatient(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed">
              Select how you would like to send the follow-up reminder for <span className="font-bold text-white">{selectedReminderPatient.name}</span> (<span className="text-cyan-300 font-bold">{selectedReminderPatient.disease}</span>):
            </div>

            <div className="grid grid-cols-1 gap-3 pt-1">
              <button
                onClick={() => handleReminderChoice('whatsapp')}
                className="p-4 bg-emerald-900/30 hover:bg-emerald-800/50 border border-emerald-500/40 rounded-xl text-left flex items-start gap-3 transition group shadow-lg"
              >
                <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-lg group-hover:scale-110 transition shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm group-hover:text-emerald-300">1. Send via WhatsApp Messenger</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Automatically opens WhatsApp chat with patient's number ({selectedReminderPatient.phone || 'N/A'}).
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleReminderChoice('email')}
                className="p-4 bg-cyan-900/30 hover:bg-cyan-800/50 border border-cyan-500/40 rounded-xl text-left flex items-start gap-3 transition group shadow-lg"
              >
                <div className="p-2.5 bg-cyan-500/20 text-cyan-300 rounded-lg group-hover:scale-110 transition shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm group-hover:text-cyan-300">2. Send via Doctor Email Client</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Opens your email application (mailto) with patient email ({selectedReminderPatient.email || 'N/A'}) & queues automated email.
                  </div>
                </div>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedReminderPatient(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

