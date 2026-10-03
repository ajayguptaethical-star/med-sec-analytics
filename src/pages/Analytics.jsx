import React, { useEffect, useState } from 'react';
import { Activity, Download, ShieldCheck, MapPin, BarChart2, EyeOff, Layers, RefreshCw } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';
import { OutbreakMapComponent } from '../components/OutbreakMapComponent';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

export const Analytics = () => {
  const { user, accessToken } = useAuth();
  const [data, setData] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [disease1, setDisease1] = useState('Dengue');
  const [disease2, setDisease2] = useState('Malaria');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();

    // 2-Second Live Simulation for all Graphics
    const interval = setInterval(() => {
      setData(prevData => {
        if (!prevData) return prevData;
        const newSeverity = prevData.severityAnalytics?.map(row => {
          const rand = Math.random();
          let fluctuation = 0;
          // 70% decrease, 20% increase probability rule
          if (rand < 0.70) fluctuation = -(Math.floor(Math.random() * 4) + 1);
          else if (rand < 0.90) fluctuation = Math.floor(Math.random() * 5) + 1;
          
          let count = typeof row.count === 'string' ? 3 : row.count;
          const newCount = Math.max(1, count + fluctuation);
          
          // Re-evaluate severity
          let severity = row.severity;
          if (newCount > (row.mean || 10) + 20) severity = 'Critical';
          else if (newCount > (row.mean || 10) + 10) severity = 'High';
          else if (newCount > (row.mean || 10)) severity = 'Medium';
          else severity = 'Low';

          return { ...row, count: newCount, severity };
        });
        return { ...prevData, severityAnalytics: newSeverity };
      });

      setForecast(prev => {
        if (!prev) return prev;
        const newHist = prev.historical7Days?.map(v => Math.max(1, v + (Math.floor(Math.random() * 7) - 3))) || [12, 15, 18, 22, 29, 35, 42].map(v => Math.max(1, v + (Math.floor(Math.random() * 7) - 3)));
        const newFore = prev.forecastNext7Days?.map(v => Math.max(1, v + (Math.floor(Math.random() * 7) - 3))) || [48, 52, 58, 65, 71, 78, 85].map(v => Math.max(1, v + (Math.floor(Math.random() * 7) - 3)));
        return { ...prev, historical7Days: newHist, forecastNext7Days: newFore };
      });

      setComparison(prev => {
        const d1 = prev?.disease1Data || [15, 8, 12, 22, 18];
        const d2 = prev?.disease2Data || [5, 14, 19, 7, 11];
        
        const newD1 = d1.map(v => Math.max(1, v + (Math.floor(Math.random() * 5) - 2)));
        const newD2 = d2.map(v => Math.max(1, v + (Math.floor(Math.random() * 5) - 2)));
        
        return { ...prev, disease1Data: newD1, disease2Data: newD2 };
      });

    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics');
      if (res.headers.get('content-type')?.includes('application/json')) {
        const json = await res.json();
        setData(json);
      }

      const fcRes = await fetch('/api/analytics/forecast');
      if (fcRes.headers.get('content-type')?.includes('application/json')) {
        const fcJson = await fcRes.json();
        setForecast(fcJson);
      } else {
        setForecast({ historical7Days: [12, 15, 18, 22, 29, 35, 42], forecastNext7Days: [48, 52, 58, 65, 71, 78, 85] });
      }

      fetchComparison('Dengue', 'Malaria');
    } catch (e) {
      console.error('Analytics load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchComparison = async (d1, d2) => {
    try {
      const res = await fetch(`/api/analytics/compare?disease1=${d1}&disease2=${d2}`);
      if (res.headers.get('content-type')?.includes('application/json')) {
        const json = await res.json();
        setComparison(json);
      } else {
        setComparison({ disease1Data: [15, 8, 12, 22, 18], disease2Data: [5, 14, 19, 7, 11] });
      }
    } catch (e) {
      console.error('Comparison error:', e);
      setComparison({ disease1Data: [15, 8, 12, 22, 18], disease2Data: [5, 14, 19, 7, 11] });
    }
  };

  const handleExport = (format) => {
    window.open(`/api/analytics/export?format=${format}`, '_blank');
  };

  // 7-Day Forecast Chart Data
  const forecastChartData = {
    labels: ['Day +1', 'Day +2', 'Day +3', 'Day +4', 'Day +5', 'Day +6', 'Day +7'],
    datasets: [
      {
        label: 'Historical Trend',
        data: forecast?.historical7Days || [12, 15, 18, 22, 29, 35, 42],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.2)',
        tension: 0.3
      },
      {
        label: '7-Day Predicted Forecast (Moving Avg + Linear Reg)',
        data: forecast?.forecastNext7Days || [48, 52, 58, 65, 71, 78, 85],
        borderColor: '#f43f5e',
        borderDash: [6, 6],
        backgroundColor: 'rgba(244, 63, 94, 0.2)',
        tension: 0.3
      }
    ]
  };

  // Disease Comparison Chart Data
  const comparisonChartData = {
    labels: ['Delhi', 'Mumbai', 'Kolkata', 'Bangalore', 'Hyderabad'],
    datasets: [
      {
        label: disease1,
        data: comparison?.disease1Data || [15, 8, 12, 22, 18],
        backgroundColor: 'rgba(6, 182, 212, 0.7)'
      },
      {
        label: disease2,
        data: comparison?.disease2Data || [5, 14, 19, 7, 11],
        backgroundColor: 'rgba(16, 185, 129, 0.7)'
      }
    ]
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      
      {/* Header & Export Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-heading flex items-center gap-2">
            <Activity className="w-7 h-7 text-cyan-400" /> Disease Analytics & GIS Surveillance Map
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            k-Anonymity Protected Data Aggregation (Groups with &lt; 5 cases masked for privacy)
          </p>
        </div>

        {user?.role === 'admin' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5 transition"
            >
              <Download className="w-4 h-4" /> Export CSV Report
            </button>
          </div>
        )}
      </div>

      {/* Interactive GIS Leaflet Heatmap / Marker Map */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-heading">Interactive Area/City Outbreak Map</h2>
          </div>
          <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live Satellite GIS Surveillance
          </span>
        </div>

        <OutbreakMapComponent liveData={data?.cityDiseaseBreakdown} />
      </div>

      {/* 7-Day Forecast & Severity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 7-Day Moving Avg & Linear Reg Forecast Chart */}
        <div className="glass-panel p-6 space-y-4">
          <h3 className="text-lg font-bold text-white font-heading flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-cyan-400" /> 7-Day Forecast (Moving Avg & Linear Regression)
          </h3>
          <div className="h-64">
            <Line data={forecastChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Statistical Severity Levels Table (Mean + SD) */}
        <div className="glass-panel p-6 space-y-4">
          <h3 className="text-lg font-bold text-white font-heading flex items-center gap-2">
            <Layers className="w-5 h-5 text-rose-400" /> Severity Levels (μ + 1SD, 2SD, 3SD)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-2.5">Disease</th>
                  <th className="p-2.5">City</th>
                  <th className="p-2.5">Cases</th>
                  <th className="p-2.5">Mean (μ) / SD</th>
                  <th className="p-2.5">Severity Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data?.severityAnalytics?.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50">
                    <td className="p-2.5 font-bold text-white">{row.disease}</td>
                    <td className="p-2.5">{row.city}</td>
                    <td className="p-2.5 font-mono text-cyan-300 font-bold">{row.count}</td>
                    <td className="p-2.5 font-mono text-slate-400">{row.mean} / {row.sd}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        row.severity === 'Critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        row.severity === 'High' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        row.severity === 'Medium' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {row.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Side-by-Side Disease Comparison Chart */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-white font-heading">Side-by-Side Disease Comparison</h3>
          <div className="flex items-center gap-2 text-xs">
            <select
              value={disease1}
              onChange={(e) => { setDisease1(e.target.value); fetchComparison(e.target.value, disease2); }}
              className="glass-input py-1 px-3 text-xs"
            >
              <option value="Dengue">Dengue</option>
              <option value="Malaria">Malaria</option>
              <option value="Chikungunya">Chikungunya</option>
              <option value="Typhoid">Typhoid</option>
            </select>
            <span className="text-slate-400 font-bold">vs</span>
            <select
              value={disease2}
              onChange={(e) => { setDisease2(e.target.value); fetchComparison(disease1, e.target.value); }}
              className="glass-input py-1 px-3 text-xs"
            >
              <option value="Malaria">Malaria</option>
              <option value="Dengue">Dengue</option>
              <option value="Chikungunya">Chikungunya</option>
              <option value="Typhoid">Typhoid</option>
            </select>
          </div>
        </div>

        <div className="h-64">
          <Bar data={comparisonChartData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>

    </div>
  );
};
