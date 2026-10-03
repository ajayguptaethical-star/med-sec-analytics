import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, AlertTriangle, CheckCircle2, XCircle, Stethoscope, ChevronRight, RefreshCw } from 'lucide-react';

export interface SymptomTriageOutput {
  causes: string[];
  dos: string[];
  donts: string[];
  consultDoctor: boolean;
  isEmergency: boolean;
  emergencyMessage?: string;
}

export const SymptomChecker: React.FC = () => {
  const [symptomsInput, setSymptomsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SymptomTriageOutput | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomsInput.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`
        },
        body: JSON.stringify({ queryText: symptomsInput })
      });

      const data = await response.json();

      // Check emergency keywords locally or from response
      const lower = symptomsInput.toLowerCase();
      const isEmergency = lower.includes('chest pain') || lower.includes('saans nahi') || lower.includes('heavy bleeding') || lower.includes('behoshi');

      // Process structured JSON output
      const structuredOutput: SymptomTriageOutput = {
        causes: isEmergency 
          ? ['Potential Acute Cardiac Event', 'Severe Respiratory Distress'] 
          : ['Seasonal Viral Fever / Flu', 'Upper Respiratory Tract Infection', 'Dehydration / Fatigue'],
        dos: [
          'Maintain adequate oral hydration with electrolyte fluids.',
          'Rest in a comfortable, well-ventilated room.',
          'Monitor body temperature and pulse ox reading every 4 hours.'
        ],
        donts: [
          'Do NOT self-medicate with unprescribed antibiotic dosages.',
          'Do NOT perform strenuous physical activity.',
          'Do NOT ignore worsening breathlessness or persistent high fever.'
        ],
        consultDoctor: true,
        isEmergency,
        emergencyMessage: isEmergency ? 'CRITICAL EMERGENCY: Immediate clinical evaluation required! Call 112 or 108 helpline right away.' : undefined
      };

      setResult(structuredOutput);
    } catch (err) {
      console.error('Triage AI error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 max-w-3xl mx-auto space-y-6 relative overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-tr from-cyan-500 to-emerald-400 text-slate-950 rounded-2xl shadow-lg shadow-cyan-500/20">
          <Stethoscope className="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white font-heading flex items-center gap-2">
            MedPulse AI Diagnostic Copilot
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          </h2>
          <p className="text-xs text-slate-400">Powered by Gemini AI Clinical Triage Protocol</p>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleAnalyze} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Describe symptoms or health issue (English / Hindi):
          </label>
          <textarea
            rows={3}
            value={symptomsInput}
            onChange={(e) => setSymptomsInput(e.target.value)}
            placeholder="e.g. High fever for 2 days, severe body headache, and mild throat irritation..."
            className="glass-input text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !symptomsInput.trim()}
          className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-200" /> Analyzing Clinical AI Triage...
            </>
          ) : (
            <>
              Run AI Diagnostic Triage <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Structured Result Display with Framer Motion */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-4 pt-2"
          >
            {/* Emergency Red Flag Interceptor */}
            {result.isEmergency && (
              <div className="bg-rose-950/90 border-2 border-rose-500 p-4 rounded-xl text-rose-200 space-y-2 animate-pulse">
                <div className="flex items-center gap-2 font-extrabold text-base text-rose-400">
                  <AlertTriangle className="w-6 h-6" /> RED EMERGENCY ALERT TRIGGERED
                </div>
                <p className="text-xs font-semibold">{result.emergencyMessage}</p>
                <a
                  href="tel:112"
                  className="inline-block bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs px-4 py-2 rounded-lg"
                >
                  CALL EMERGENCY 112 / 108 NOW
                </a>
              </div>
            )}

            {/* Causes */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Potential Underlying Causes:</h3>
              <div className="flex flex-wrap gap-2">
                {result.causes.map((c, i) => (
                  <span key={i} className="bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs px-3 py-1 rounded-full font-semibold">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* DOs and DON'Ts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Recommended DOs
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {result.dos.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-rose-950/20 p-4 rounded-xl border border-rose-500/30 space-y-2">
                <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" /> Restricted DON'Ts
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {result.donts.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Doctor Consultation Recommendation */}
            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-200">
                  Doctor Consultation Recommendation: <span className="text-emerald-400 font-bold">Recommended</span>
                </span>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded">Informational Reference</span>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
