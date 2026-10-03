import React, { useEffect, useState } from 'react';
import { Lock, ShieldAlert, Users, FileSpreadsheet, RefreshCw, KeyRound, CheckCircle, AlertTriangle, Eye, ShieldCheck, Trash2, Ban, UploadCloud, FileText, Download, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ColumnMapperModal } from '../components/ColumnMapperModal';

export const AdminDashboard = () => {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditVerification, setAuditVerification] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'audit', 'users', 'usb'
  const [showKaggleModal, setShowKaggleModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters for Audit Log
  const [auditFilter, setAuditFilter] = useState({ user_id: '', action: '', ip_address: '' });

  // CSV & PDF File Upload State
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchSecurityDashboard();
    fetchAuditLogs();
    fetchUsers();
    fetchUploadedFiles();
  }, []);

  const fetchSecurityDashboard = async () => {
    try {
      const res = await fetch('/api/admin/security-dashboard', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(auditFilter).toString();
      const res = await fetch(`/api/admin/audit-logs?${query}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setAuditLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const verifyAuditHashChain = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs/verify', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      setAuditVerification(data);
    } catch (e) {
      alert('Verification failed: ' + e.message);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUploadedFiles = async () => {
    try {
      const res = await fetch('/api/admin/uploaded-files', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setUploadedFiles(data);
    } catch (e) {
      console.error('Failed to fetch uploaded files:', e);
    }
  };

  const handleAdminFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/admin/upload-file', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : {};

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadSuccess(data.message || 'File uploaded successfully!');
      setSelectedFile(null);
      if (e.target.fileInput) e.target.fileInput.value = '';
      fetchUploadedFiles();
      fetchAuditLogs();
    } catch (err) {
      setUploadError(err.message || 'File upload error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteUploadedFile = async (id, fileName) => {
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;

    try {
      const res = await fetch(`/api/admin/uploaded-files/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchUploadedFiles();
        fetchAuditLogs();
      } else {
        alert('Delete failed: ' + (data.error || 'Permission denied'));
      }
    } catch (e) {
      alert('Delete error: ' + e.message);
    }
  };

  const updateUserStatus = async (userId, status) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchUsers();
      } else {
        alert('Action error: ' + data.error);
      }
    } catch (e) {
      alert('Failed: ' + e.message);
    }
  };

  const handleRevokeUsb = async (userId, keyFingerprint) => {
    if (!confirm('Are you sure you want to revoke this USB Security Key?')) return;
    try {
      const res = await fetch('/api/admin/usb/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ userId, keyFingerprint })
      });
      const data = await res.json();
      alert(data.message);
      fetchUsers();
    } catch (e) {
      alert('Revocation error: ' + e.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-heading flex items-center gap-2">
            <Lock className="w-7 h-7 text-rose-500" /> Admin Security Dashboard & Audit Control
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-Proof SHA-256 Audit Log Ledger, Suspicious Anomaly Detector & Kaggle Importer
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKaggleModal(true)}
            className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 shadow-lg shadow-cyan-500/20"
          >
            <FileSpreadsheet className="w-4 h-4" /> Import Kaggle CSV Dataset
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'overview' ? 'bg-rose-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Security Overview & Anomalies
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'audit' ? 'bg-rose-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Audit Log Ledger & Hash Chain
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'users' ? 'bg-rose-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          User & Doctor Management ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'files' ? 'bg-rose-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          CSV & PDF Files ({uploadedFiles.length})
        </button>
        <button
          onClick={() => setActiveTab('usb')}
          className={`px-4 py-2 rounded-lg font-bold transition ${activeTab === 'usb' ? 'bg-rose-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          🔌 USB Authorization & Keys
        </button>
      </div>

      {/* 1. Security Overview & Anomalies Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 border-l-4 border-l-rose-500">
              <div className="text-xs text-slate-400 font-semibold uppercase">Currently Locked Accounts</div>
              <div className="text-2xl font-extrabold text-white mt-1 font-heading">{stats?.lockedAccounts || 0}</div>
              <div className="text-[11px] text-rose-400 mt-2 font-medium">5 Failed Attempts Lockout</div>
            </div>

            <div className="glass-panel p-5 border-l-4 border-l-amber-500">
              <div className="text-xs text-slate-400 font-semibold uppercase">Total Lockouts Triggered</div>
              <div className="text-2xl font-extrabold text-white mt-1 font-heading">{stats?.totalLockouts || 0}</div>
              <div className="text-[11px] text-amber-400 mt-2 font-medium">Automated Email Alerts Sent</div>
            </div>

            <div className="glass-panel p-5 border-l-4 border-l-cyan-500">
              <div className="text-xs text-slate-400 font-semibold uppercase">Active Logged-in Sessions</div>
              <div className="text-2xl font-extrabold text-white mt-1 font-heading">{stats?.activeSessions || 0}</div>
              <div className="text-[11px] text-cyan-400 mt-2 font-medium">Single Active Session Enforced</div>
            </div>

            <div className="glass-panel p-5 border-l-4 border-l-emerald-500">
              <div className="text-xs text-slate-400 font-semibold uppercase">Suspicious Night Logins</div>
              <div className="text-2xl font-extrabold text-white mt-1 font-heading">{stats?.suspiciousLogins?.length || 0}</div>
              <div className="text-[11px] text-emerald-400 mt-2 font-medium">Flagged 2 AM - 4 AM Logins</div>
            </div>
          </div>

          {/* Suspicious Anomaly Alert Panel */}
          {stats?.suspiciousLogins?.length > 0 && (
            <div className="glass-panel p-6 border-2 border-rose-500/40 space-y-3 bg-rose-950/20">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 animate-pulse" /> Suspicious Login Anomaly Detected (2 AM - 4 AM Window)
              </div>
              <div className="space-y-2">
                {stats.suspiciousLogins.map(log => (
                  <div key={log.id} className="bg-slate-900/80 p-3 rounded-xl border border-rose-500/30 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white">User ID #{log.user_id}</span> • IP: <span className="font-mono text-cyan-300">{log.ip_address}</span>
                    </div>
                    <div className="text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Audit Log Ledger & Tamper-Proof Hash Chain */}
      {activeTab === 'audit' && (
        <div className="glass-panel p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white font-heading flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Tamper-Proof Audit Log Ledger
            </h2>

            <button
              onClick={verifyAuditHashChain}
              className="px-4 py-2 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5 transition"
            >
              <CheckCircle className="w-4 h-4" /> Verify SHA-256 Hash Chain Integrity
            </button>
          </div>

          {/* Verification Result Banner */}
          {auditVerification && (
            <div className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-2 ${
              auditVerification.isValid 
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            }`}>
              <ShieldCheck className="w-5 h-5" />
              <span>
                {auditVerification.isValid 
                  ? `HASH CHAIN VERIFIED: All ${auditVerification.count} audit log entries are 100% cryptographic untampered.` 
                  : `TAMPER DETECTED! Cryptographic hash chain broken at record ID #${auditVerification.brokenAtId}. Reason: ${auditVerification.reason}`}
              </span>
            </div>
          )}

          {/* Filter Form */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <input
              type="text"
              placeholder="Filter by Action (e.g. LOGIN_SUCCESS)"
              value={auditFilter.action}
              onChange={(e) => setAuditFilter({ ...auditFilter, action: e.target.value })}
              className="glass-input text-xs"
            />
            <input
              type="text"
              placeholder="Filter by IP Address"
              value={auditFilter.ip_address}
              onChange={(e) => setAuditFilter({ ...auditFilter, ip_address: e.target.value })}
              className="glass-input text-xs"
            />
            <button onClick={fetchAuditLogs} className="btn-primary py-2 text-xs">
              Apply Filters
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-2.5">ID</th>
                  <th className="p-2.5">User ID</th>
                  <th className="p-2.5">Action</th>
                  <th className="p-2.5">Details</th>
                  <th className="p-2.5">IP Address</th>
                  <th className="p-2.5">SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/50">
                    <td className="p-2.5 font-mono text-slate-500">#{log.id}</td>
                    <td className="p-2.5 font-bold text-white">#{log.user_id || 'SYS'}</td>
                    <td className="p-2.5 font-bold text-cyan-300">{log.action}</td>
                    <td className="p-2.5 max-w-xs truncate text-slate-400">{log.details}</td>
                    <td className="p-2.5 font-mono text-slate-300">{log.ip_address}</td>
                    <td className="p-2.5 font-mono text-[10px] text-emerald-400 truncate max-w-[120px]" title={log.hash}>
                      {log.hash?.slice(0, 16)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. User & Doctor Management */}
      {activeTab === 'users' && (
        <div className="glass-panel p-6 space-y-4">
          <h2 className="text-lg font-bold text-white font-heading">Registered Users & Medical Doctor Verification</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Name & Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Medical License</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3">USB Keys</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/50">
                    <td className="p-3 font-mono text-slate-500">#{u.id}</td>
                    <td className="p-3">
                      <div className="font-bold text-white">{u.name}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'admin' ? 'bg-rose-500/20 text-rose-300' :
                        u.role === 'doctor' ? 'bg-emerald-500/20 text-emerald-300' :
                        'bg-cyan-500/20 text-cyan-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-300">{u.medical_license || 'N/A'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' :
                        u.status === 'pending_approval' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-rose-500/20 text-rose-400'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">
                      {u.registeredUsbs?.length || 0} / 2 Keys
                    </td>
                    <td className="p-3 flex items-center gap-1.5">
                      {u.status === 'pending_approval' && (
                        <button
                          onClick={() => updateUserStatus(u.id, 'active')}
                          className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded font-bold text-[10px] border border-emerald-500/30"
                        >
                          Approve Doctor
                        </button>
                      )}
                      {u.status === 'active' ? (
                        <button
                          onClick={() => updateUserStatus(u.id, 'suspended')}
                          className="px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded font-bold text-[10px] border border-amber-500/30"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => updateUserStatus(u.id, 'active')}
                          className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded font-bold text-[10px] border border-emerald-500/30"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. CSV & PDF File Upload & Document Center */}
      {activeTab === 'files' && (
        <div className="glass-panel p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white font-heading flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-cyan-400" /> Admin Document & Dataset Repository
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Upload CSV datasets or PDF medical reports. Files are securely encrypted, stored, and audit logged.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-full text-[10px] font-bold">
                Max 15MB (.CSV, .PDF)
              </span>
            </div>
          </div>

          {/* Upload Form Box */}
          <form onSubmit={handleAdminFileUpload} className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white font-heading flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" /> Upload New Document (CSV / PDF)
            </h3>

            {uploadError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" /> {uploadSuccess}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                name="fileInput"
                type="file"
                accept=".csv, .pdf, text/csv, application/pdf"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 glass-input"
              />

              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="w-full sm:w-auto px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 whitespace-nowrap active:scale-95"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" /> Upload Document
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Uploaded Files Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white font-heading">
              Uploaded CSV & PDF Files ({uploadedFiles.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">File Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Uploaded By</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {uploadedFiles.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-6 text-center text-slate-500 italic">
                        No CSV or PDF files uploaded yet. Use the upload form above to add document files.
                      </td>
                    </tr>
                  ) : (
                    uploadedFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-slate-900/50">
                        <td className="p-3 font-bold text-white flex items-center gap-2">
                          {file.file_type === 'PDF' ? (
                            <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                          <span className="truncate max-w-xs" title={file.original_name}>{file.original_name}</span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            file.file_type === 'PDF' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {file.file_type}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-400">
                          {(file.file_size / 1024).toFixed(1)} KB
                        </td>
                        <td className="p-3 text-slate-300">{file.uploader_name || 'Admin'}</td>
                        <td className="p-3 font-mono text-slate-400 text-[11px]">
                          {file.created_at ? new Date(file.created_at).toLocaleString() : 'N/A'}
                        </td>
                        <td className="p-3 text-right flex items-center justify-end gap-2">
                          <a
                            href={`/uploads/${file.filename}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 rounded-lg border border-cyan-500/30 text-xs font-bold flex items-center gap-1 transition"
                            title="View / Download File"
                          >
                            <Download className="w-3 h-3" /> Open / Download
                          </a>
                          <button
                            onClick={() => handleDeleteUploadedFile(file.id, file.original_name)}
                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg border border-rose-500/30 text-xs font-bold flex items-center gap-1 transition"
                            title="Delete File"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. USB Security & Hardware Authorization Control */}
      {activeTab === 'usb' && (
        <div className="glass-panel p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white font-heading flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-cyan-400" /> Admin USB Hardware Authorization & Security Tokens
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Manage hardware USB security credentials, provision new Pendrive keys, and control high-privilege access rules.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-full text-[10px] font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Hardware USB Authorization Active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Card 1 */}
            <div className="bg-slate-900/90 p-5 rounded-2xl border border-cyan-500/30 space-y-3">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm font-heading">
                🔌 Physical USB Pendrive Authorization
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Physical USB drives plugged into the PC contain SHA-256 encrypted token files (<code className="text-emerald-400">admin_key.sec</code>). System automatically validates hardware tokens during Admin login.
              </p>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/auth/setup-usb-key', { method: 'POST' });
                    const data = await res.json();
                    alert(data.message);
                  } catch (e) {
                    alert('Error: ' + e.message);
                  }
                }}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
              >
                + Register / Provision Connected USB Drive
              </button>
            </div>

            {/* Status Card 2 */}
            <div className="bg-slate-900/90 p-5 rounded-2xl border border-rose-500/30 space-y-3">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-sm font-heading">
                🛡️ High-Risk Action Privilege Control
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                When Admin logs in via OTP Fallback (without physical USB attached), session is set to <span className="text-amber-400 font-bold">Limited Privilege</span>. Destructive actions (user suspension, bulk delete) require USB Authorization.
              </p>
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] text-rose-300 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> Strict USB Key Enforcement is currently enabled for all Admin accounts.
              </div>
            </div>
          </div>

          {/* Authorized Users & Keys Table */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-white font-heading">
              Registered Hardware USB Devices ({users.filter(u => u.registeredUsbs?.length > 0).length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Registered USB Keys</th>
                    <th className="p-3">Privilege Level</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-900/50">
                      <td className="p-3 font-bold text-white">
                        <div>{u.name}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{u.email}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'admin' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-cyan-300">
                        {u.registeredUsbs?.length || 0} Connected Drive(s)
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">
                          Full USB Privileged
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {u.registeredUsbs?.length > 0 && (
                          <button
                            onClick={() => handleRevokeUsb(u.id, u.registeredUsbs[0]?.fingerprint || 'default')}
                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded border border-rose-500/30 text-[11px] font-bold"
                          >
                            Revoke USB Authorization
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showKaggleModal && (
        <ColumnMapperModal onClose={() => setShowKaggleModal(false)} onSuccess={() => alert('Dataset imported!')} />
      )}
    </div>
  );
};
