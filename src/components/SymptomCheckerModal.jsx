import React, { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, ChevronRight, X, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SymptomCheckerModal = ({ onClose }) => {
  const { accessToken, setEmergencyAlert } = useAuth();
  const [step, setStep] = useState(1);
  const [queryText, setQueryText] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const commonSymptomsList = [
    'Chest Pain', 'Shortness of breath (Saans nahi)', 'High Fever', 
    'Severe Cough', 'Dizziness / Loss of consciousness', 'Heavy Bleeding',
    'Abdominal Pain', 'Vomiting / Nausea', 'Joint Pain / Rash'
  ];

  const handleSymptomToggle = (symptom) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    const combinedQuery = `${queryText} Symptoms selected: ${selectedSymptoms.join(', ')}`;

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ queryText: combinedQuery })
      });

      const data = await res.json();
      setAiResult(data);

      if (data.isEmergency) {
        setEmergencyAlert(data.emergencyMessage);
      }
      setStep(3);
    } catch (e) {
      alert('AI query failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel max-w-xl w-full p-6 relative overflow-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
          <h2 className="text-xl font-bold text-white font-heading">AI Step-by-Step Symptom Checker</h2>
        </div>

        {/* Wizard Steps Progress */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-cyan-500' : 'bg-slate-800'}`}></div>
          <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-cyan-500' : 'bg-slate-800'}`}></div>
          <div className={`flex-1 h-1.5 rounded-full ${step >= 3 ? 'bg-cyan-500' : 'bg-slate-800'}`}></div>
        </div>

        {/* Step 1: Select Symptoms */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">Step 1: Select all symptoms you are currently experiencing</h3>
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {commonSymptomsList.map((symp) => {
                const isSelected = selectedSymptoms.includes(symp);
                return (
                  <button
                    key={symp}
                    onClick={() => handleSymptomToggle(symp)}
                    className={`p-3 rounded-xl border text-left text-xs font-medium transition flex items-center justify-between ${
                      isSelected 
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>{symp}</span>
                    {isSelected && <CheckCircle className="w-4 h-4 text-cyan-400" />}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-3">
              <button
                disabled={selectedSymptoms.length === 0}
                onClick={() => setStep(2)}
                className="btn-primary flex items-center gap-1 text-sm disabled:opacity-50"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Describe Symptoms */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">Step 2: Describe your condition in your own words (English / Hindi)</h3>
            <textarea
              rows={4}
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="e.g. 2 din se bukhar aur saans lene me takleef ho rahi hai..."
              className="glass-input text-sm"
            />

            <div className="flex items-center justify-between pt-3">
              <button onClick={() => setStep(1)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-semibold">
                Back
              </button>
              <button onClick={handleAnalyze} disabled={loading} className="btn-primary flex items-center gap-1 text-sm">
                {loading ? 'Analyzing with AI Safety Guard...' : 'Analyze Symptoms'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: AI Diagnosis Results */}
        {step === 3 && aiResult && (
          <div className="space-y-4">
            {aiResult.isEmergency ? (
              <div className="bg-rose-950/80 border-2 border-rose-500 p-4 rounded-xl text-rose-200">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-base mb-1">
                  <AlertTriangle className="w-6 h-6 animate-bounce" /> EMERGENCY RED FLAG TRIGGERED
                </div>
                <p className="text-sm font-semibold">{aiResult.emergencyMessage}</p>
                <div className="mt-3">
                  <a href="tel:112" className="inline-block bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg font-bold text-xs">
                    CALL EMERGENCY 112 / 108 NOW
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/90 border border-cyan-500/30 p-4 rounded-xl">
                <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" /> AI Health Analysis
                </div>
                <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">{aiResult.answer}</p>
              </div>
            )}

            <div className="flex justify-end pt-3">
              <button onClick={onClose} className="btn-primary text-sm">
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
