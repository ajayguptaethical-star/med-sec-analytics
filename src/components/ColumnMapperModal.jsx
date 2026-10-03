import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ColumnMapperModal = ({ onClose, onSuccess }) => {
  const { accessToken } = useAuth();
  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [mappings, setMappings] = useState({
    diseaseCol: '',
    cityCol: '',
    ageCol: '',
    genderCol: ''
  });
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (!selected.name.endsWith('.csv')) {
      alert('Only .csv files are supported!');
      return;
    }

    setFile(selected);

    // Read header line to extract column names
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const firstLine = text.split('\n')[0];
      const cols = firstLine.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      setColumns(cols);

      // Auto-suggest column names
      setMappings({
        diseaseCol: cols.find(c => /disease|condition|label|target/i.test(c)) || cols[0] || '',
        cityCol: cols.find(c => /city|location|area|region|district/i.test(c)) || cols[1] || '',
        ageCol: cols.find(c => /age|years/i.test(c)) || cols[2] || '',
        genderCol: cols.find(c => /gender|sex/i.test(c)) || cols[3] || ''
      });
    };
    reader.readAsText(selected);
  };

  const handleUpload = async () => {
    if (!file) return alert('Please choose a CSV file first.');

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('diseaseCol', mappings.diseaseCol);
    formData.append('cityCol', mappings.cityCol);
    formData.append('ageCol', mappings.ageCol);
    formData.append('genderCol', mappings.genderCol);

    try {
      const res = await fetch('/api/admin/kaggle-import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        onSuccess && onSuccess();
        onClose();
      } else {
        alert('Import Error: ' + data.error);
      }
    } catch (e) {
      alert('Upload failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel max-w-lg w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-bold text-white font-heading">Kaggle Dataset Column Mapper</h2>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Upload any Kaggle disease dataset (.csv up to 10MB). Map the dataset columns to system fields below:
        </p>

        {/* File Select */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Kaggle CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer"
          />
        </div>

        {/* Column Mapping Fields */}
        {columns.length > 0 && (
          <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Map Columns to Database Fields</h3>
            
            <div>
              <label className="block text-xs text-slate-400 mb-1">Disease Column:</label>
              <select
                value={mappings.diseaseCol}
                onChange={(e) => setMappings({ ...mappings, diseaseCol: e.target.value })}
                className="glass-input text-xs"
              >
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">City / Region Column:</label>
              <select
                value={mappings.cityCol}
                onChange={(e) => setMappings({ ...mappings, cityCol: e.target.value })}
                className="glass-input text-xs"
              >
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Age Column:</label>
                <select
                  value={mappings.ageCol}
                  onChange={(e) => setMappings({ ...mappings, ageCol: e.target.value })}
                  className="glass-input text-xs"
                >
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Gender Column:</label>
                <select
                  value={mappings.genderCol}
                  onChange={(e) => setMappings({ ...mappings, genderCol: e.target.value })}
                  className="glass-input text-xs"
                >
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-5">
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-semibold">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50"
          >
            <UploadCloud className="w-4 h-4" />
            {loading ? 'Importing Dataset...' : 'Import Dataset'}
          </button>
        </div>

      </div>
    </div>
  );
};
