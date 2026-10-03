import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMap } from 'react-leaflet';
import { MapPin, Search, Filter, AlertTriangle, ShieldCheck, Activity, Zap, Building2, Flame, Lock, ShieldAlert, Octagon, CheckCircle2 } from 'lucide-react';

// Preset Major Indian Cities & Outbreak Telemetry Data with Access Block Containment Metadata
const CITIES_OUTBREAK_DATA = [
  { 
    city: 'Delhi', 
    state: 'Delhi NCR', 
    lat: 28.6139, 
    lng: 77.2090, 
    disease: 'Dengue', 
    cases: 142, 
    risk: 'High', 
    hospitalBeds: '22% Open', 
    quarantine: 'Active Zone',
    accessBlocked: true,
    containmentRadius: 35000,
    blockedGates: '8 Sector Checkpoints Blocked',
    accessBlockReason: 'Severe Dengue Outbreak Density - Emergency Quarantine Active'
  },
  { 
    city: 'Mumbai', 
    state: 'Maharashtra', 
    lat: 19.0760, 
    lng: 72.8777, 
    disease: 'Malaria', 
    cases: 98, 
    risk: 'Medium', 
    hospitalBeds: '45% Open', 
    quarantine: 'Monitored',
    accessBlocked: true,
    containmentRadius: 28000,
    blockedGates: '5 Ward Checkpoints Restricted',
    accessBlockReason: 'Vector Control Containment Order In Effect'
  },
  { 
    city: 'Kolkata', 
    state: 'West Bengal', 
    lat: 22.5726, 
    lng: 88.3639, 
    disease: 'Dengue', 
    cases: 115, 
    risk: 'High', 
    hospitalBeds: '18% Open', 
    quarantine: 'Active Zone',
    accessBlocked: true,
    containmentRadius: 32000,
    blockedGates: '7 Zone Gates Blocked',
    accessBlockReason: 'High Transmission Red Alert Zone - Public Transit Suspended'
  },
  { 
    city: 'Bangalore', 
    state: 'Karnataka', 
    lat: 12.9716, 
    lng: 77.5946, 
    disease: 'Typhoid', 
    cases: 64, 
    risk: 'Medium', 
    hospitalBeds: '60% Open', 
    quarantine: 'Monitored',
    accessBlocked: false,
    containmentRadius: 15000,
    blockedGates: '0 Gates Blocked',
    accessBlockReason: 'Normal Monitoring - No Road Blockades'
  },
  { 
    city: 'Hyderabad', 
    state: 'Telangana', 
    lat: 17.3850, 
    lng: 78.4867, 
    disease: 'Chikungunya', 
    cases: 82, 
    risk: 'Medium', 
    hospitalBeds: '52% Open', 
    quarantine: 'Monitored',
    accessBlocked: false,
    containmentRadius: 18000,
    blockedGates: '2 Advisory Checkpoints',
    accessBlockReason: 'Health Screening Advisory Active'
  },
  { 
    city: 'Chennai', 
    state: 'Tamil Nadu', 
    lat: 13.0827, 
    lng: 80.2707, 
    disease: 'Dengue', 
    cases: 128, 
    risk: 'High', 
    hospitalBeds: '15% Open', 
    quarantine: 'Active Zone',
    accessBlocked: true,
    containmentRadius: 30000,
    blockedGates: '6 Coastal Gates Blocked',
    accessBlockReason: 'Severe Cluster Containment - Restricted Entrance'
  },
  { 
    city: 'Jaipur', 
    state: 'Rajasthan', 
    lat: 26.9124, 
    lng: 75.7873, 
    disease: 'Malaria', 
    cases: 45, 
    risk: 'Safe', 
    hospitalBeds: '78% Open', 
    quarantine: 'Clear',
    accessBlocked: false,
    containmentRadius: 10000,
    blockedGates: '0 Blockades',
    accessBlockReason: 'Green Zone - Free Unrestricted Entry'
  },
  { 
    city: 'Lucknow', 
    state: 'Uttar Pradesh', 
    lat: 26.8467, 
    lng: 80.9462, 
    disease: 'Typhoid', 
    cases: 89, 
    risk: 'Medium', 
    hospitalBeds: '38% Open', 
    quarantine: 'Monitored',
    accessBlocked: false,
    containmentRadius: 20000,
    blockedGates: '3 Thermal Screening Gates',
    accessBlockReason: 'Monitored Transit Area'
  },
  { 
    city: 'Ahmedabad', 
    state: 'Gujarat', 
    lat: 23.0225, 
    lng: 72.5714, 
    disease: 'Dengue', 
    cases: 104, 
    risk: 'High', 
    hospitalBeds: '29% Open', 
    quarantine: 'Active Zone',
    accessBlocked: true,
    containmentRadius: 26000,
    blockedGates: '6 Highway Checkpoints Blocked',
    accessBlockReason: 'Epidemic Control Containment Barrier'
  },
  { 
    city: 'Pune', 
    state: 'Maharashtra', 
    lat: 18.5204, 
    lng: 73.8567, 
    disease: 'Malaria', 
    cases: 53, 
    risk: 'Medium', 
    hospitalBeds: '65% Open', 
    quarantine: 'Monitored',
    accessBlocked: false,
    containmentRadius: 16000,
    blockedGates: '0 Blockades',
    accessBlockReason: 'Routine Surveillance'
  },
  { 
    city: 'Patna', 
    state: 'Bihar', 
    lat: 25.5941, 
    lng: 85.1376, 
    disease: 'Chikungunya', 
    cases: 96, 
    risk: 'High', 
    hospitalBeds: '20% Open', 
    quarantine: 'Active Zone',
    accessBlocked: true,
    containmentRadius: 29000,
    blockedGates: '5 District Entry Gates Blocked',
    accessBlockReason: 'High Vector Outbreak Blockade Order'
  },
  { 
    city: 'Chandigarh', 
    state: 'Punjab/Haryana', 
    lat: 30.7333, 
    lng: 76.7794, 
    disease: 'Safe Zone', 
    cases: 12, 
    risk: 'Safe', 
    hospitalBeds: '88% Open', 
    quarantine: 'Clear',
    accessBlocked: false,
    containmentRadius: 8000,
    blockedGates: '0 Blockades',
    accessBlockReason: 'Green Zone - Fully Open'
  }
];

// Helper Component to smoothly re-center map view when user selects a city
function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

export function OutbreakMapComponent({ liveData }) {
  const [selectedCity, setSelectedCity] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [diseaseFilter, setDiseaseFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [showAccessBlockedOnly, setShowAccessBlockedOnly] = useState(false);
  const [mapStyle, setMapStyle] = useState('dark'); // 'dark' | 'street' | 'satellite'
  const [mapCenter, setMapCenter] = useState([23.473324, 77.947998]); // Default MP Center
  const [mapZoom, setMapZoom] = useState(6);
  const markerRefs = useRef({});

  // Use live data if provided, otherwise fallback to preset major Indian cities
  const getCityCoords = (cityName) => {
    const defaultData = CITIES_OUTBREAK_DATA.find(c => c.city.toLowerCase() === (cityName || '').toLowerCase());
    if (defaultData) return { lat: defaultData.lat, lng: defaultData.lng };
    
    const cityLow = (cityName || '').toLowerCase().trim();
    
    // Comprehensive Mapping for Indian States and Major Cities
    const geoMap = {
      'andhra pradesh': { lat: 15.9129, lng: 79.7400 },
      'arunachal pradesh': { lat: 28.2180, lng: 94.7278 },
      'assam': { lat: 26.2006, lng: 92.9376 },
      'bihar': { lat: 25.0961, lng: 85.3131 },
      'chhattisgarh': { lat: 21.2787, lng: 81.8661 },
      'goa': { lat: 15.2993, lng: 74.1240 },
      'gujarat': { lat: 22.2587, lng: 71.1924 },
      'haryana': { lat: 29.0588, lng: 76.0856 },
      'himachal pradesh': { lat: 31.1048, lng: 77.1665 },
      'jharkhand': { lat: 23.6102, lng: 85.2799 },
      'karnataka': { lat: 15.3173, lng: 75.7139 },
      'kerala': { lat: 10.8505, lng: 76.2711 },
      'madhya pradesh': { lat: 23.4733, lng: 77.9479 },
      'maharashtra': { lat: 19.7515, lng: 75.7139 },
      'manipur': { lat: 24.6637, lng: 93.9063 },
      'meghalaya': { lat: 25.4670, lng: 91.3662 },
      'mizoram': { lat: 23.1645, lng: 92.9376 },
      'nagaland': { lat: 26.1584, lng: 94.5624 },
      'odisha': { lat: 20.9517, lng: 85.0985 },
      'punjab': { lat: 31.1471, lng: 75.3412 },
      'rajasthan': { lat: 27.0238, lng: 74.2179 },
      'sikkim': { lat: 27.5330, lng: 88.5122 },
      'tamil nadu': { lat: 11.1271, lng: 78.6569 },
      'telangana': { lat: 18.1124, lng: 79.0193 },
      'tripura': { lat: 23.9408, lng: 91.9882 },
      'uttar pradesh': { lat: 26.8467, lng: 80.9462 },
      'utter pradesh': { lat: 26.8467, lng: 80.9462 }, // Typo handling
      'uttarakhand': { lat: 30.0668, lng: 79.0193 },
      'west bengal': { lat: 22.9868, lng: 87.8550 },
      'jammu and kashmir': { lat: 33.7782, lng: 76.5762 },
      'mubai': { lat: 19.0760, lng: 72.8777 },
      'mumbai': { lat: 19.0760, lng: 72.8777 },
      'hyderabad': { lat: 17.3850, lng: 78.4867 },
      'pune': { lat: 18.5204, lng: 73.8567 },
      'chennai': { lat: 13.0827, lng: 80.2707 },
      'lucknow': { lat: 26.8467, lng: 80.9462 },
      'ahmedabad': { lat: 23.0225, lng: 72.5714 },
      'surat': { lat: 21.1702, lng: 72.8311 },
      'jaipur': { lat: 26.9124, lng: 75.7873 },
      'kanpur': { lat: 26.4499, lng: 80.3319 },
      'nagpur': { lat: 21.1458, lng: 79.0882 },
      'indore': { lat: 22.7196, lng: 75.8577 },
      'bhopal': { lat: 23.2599, lng: 77.4126 },
      'patna': { lat: 25.5941, lng: 85.1376 },
      'chandigarh': { lat: 30.7333, lng: 76.7794 }
    };

    if (geoMap[cityLow]) {
      return geoMap[cityLow];
    }

    // Default MP Center for unknown locations
    return { lat: 23.473324, lng: 77.947998 };
  };

  const initialBaseData = (liveData && liveData.length > 0) ? liveData.map(d => {
    let lat = d.lat;
    let lng = d.lng;

    // If liveData is missing coordinates (from old DB records), map them locally
    if (!lat || !lng) {
      const coords = getCityCoords(d.city);
      lat = coords.lat;
      lng = coords.lng;
    }

    return {
      city: d.city,
      state: 'Live Data',
      lat: lat,
      lng: lng,
      disease: d.disease,
      cases: typeof d.count === 'string' ? 3 : d.count,
      risk: d.count > 15 ? 'High' : (d.count > 5 ? 'Medium' : 'Safe'),
      hospitalBeds: 'N/A',
      quarantine: d.count > 15 ? 'Active Zone' : 'Clear',
      accessBlocked: d.count > 30,
      containmentRadius: typeof d.count === 'number' ? d.count * 1000 : 5000,
      blockedGates: d.count > 30 ? 'Restricted' : '0 Blockades',
      accessBlockReason: d.count > 30 ? 'High Outbreak Density' : 'Normal Monitoring'
    };
  }) : CITIES_OUTBREAK_DATA;

  const [simulatedData, setSimulatedData] = useState([]);

  useEffect(() => {
    setSimulatedData(initialBaseData);
  }, [liveData]);

  // Simulate Live Data Telemetry every 2 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      setSimulatedData(prevData => prevData.map(item => {
        // 70% chance to decrease, 20% chance to increase, 10% chance to stay the same
        const rand = Math.random();
        let fluctuation = 0;
        
        if (rand < 0.70) {
          // Decrease cases
          fluctuation = -(Math.floor(Math.random() * 4) + 1); // decrease by 1 to 4
        } else if (rand < 0.90) {
          // Increase cases
          fluctuation = Math.floor(Math.random() * 5) + 1; // increase by 1 to 5
        } else {
          fluctuation = 0;
        }

        const newCases = Math.max(1, item.cases + fluctuation); // Never drop below 1
        
        // Dynamic Hospital Bed Availability
        const beds = Math.max(5, Math.floor(Math.random() * 85)) + '% Open';
        
        // Dynamic Quarantine Status based on cases
        const quarantine = newCases > 25 ? (Math.random() > 0.4 ? 'Strict Lockdown' : 'Active Zone') : 'Monitored';
        
        // Dynamic Risk & Blockades
        const risk = newCases > 35 ? 'Critical' : (newCases > 20 ? 'High' : (newCases > 10 ? 'Medium' : 'Safe'));
        const accessBlocked = newCases > 30;

        return {
          ...item,
          cases: newCases,
          hospitalBeds: beds,
          quarantine: quarantine,
          risk: risk,
          accessBlocked: accessBlocked,
          containmentRadius: newCases * 1200,
          blockedGates: accessBlocked ? `${Math.floor(newCases / 4)} Sector Checkpoints Blocked` : '0 Blockades',
          accessBlockReason: accessBlocked ? 'Severe Outbreak Density - Emergency Quarantine Active' : 'Normal Monitoring'
        };
      }));
    }, 2000);

    return () => clearInterval(intervalId);
  }, []);

  // Use simulated data instead of baseData
  const baseData = simulatedData.length > 0 ? simulatedData : initialBaseData;

  // Filtered Cities list based on user selections
  const filteredCities = baseData.filter(item => {
    const matchesSearch = item.city.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.state.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDisease = diseaseFilter === 'All' || item.disease === diseaseFilter;
    const matchesRisk = riskFilter === 'All' || item.risk === riskFilter;
    const matchesAccessBlocked = !showAccessBlockedOnly || item.accessBlocked;
    return matchesSearch && matchesDisease && matchesRisk && matchesAccessBlocked;
  });

  const handleCitySelect = (cityObj) => {
    setSelectedCity(cityObj);
    setMapCenter([cityObj.lat, cityObj.lng]);
    setMapZoom(9);
    
    // Auto-open the popup marker when a city KPI chip is clicked
    setTimeout(() => {
      const marker = markerRefs.current[cityObj.city];
      if (marker) {
        marker.openPopup();
      }
    }, 1600); // Wait 1.6s to let the map finish flying to the location first
  };

  const totalCases = baseData.reduce((acc, curr) => acc + curr.cases, 0);
  const highRiskCount = baseData.filter(c => c.risk === 'High').length;
  const blockedZonesCount = baseData.filter(c => c.accessBlocked).length;

  return (
    <div className="space-y-4">
      
      {/* HUD Outbreak & Access Block Statistics Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 p-3 rounded-xl border border-cyan-500/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cities Tracked</div>
            <div className="text-base font-extrabold text-white font-mono">{baseData.length} Major Hubs</div>
          </div>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-xl border border-rose-500/40 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
            <Lock className="w-5 h-5 text-rose-400 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] text-rose-300 font-bold uppercase tracking-wider">Access Blocked Zones</div>
            <div className="text-base font-extrabold text-rose-400 font-mono">{blockedZonesCount} Quarantine Red Zones</div>
          </div>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-xl border border-amber-500/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Outbreak Cases</div>
            <div className="text-base font-extrabold text-amber-300 font-mono">{totalCases} Confirmed</div>
          </div>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-xl border border-emerald-500/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Surveillance Telemetry</div>
            <div className="text-base font-extrabold text-emerald-400 font-mono">100% Live GIS</div>
          </div>
        </div>
      </div>

      {/* Interactive Search, Filter & Access Block Toggle Control Bar */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search City / State */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search City, State or Containment Zone (e.g. Delhi, Mumbai, Patna)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input pl-10 text-xs py-2"
          />
        </div>

        {/* Access Block Toggle Button */}
        <button
          onClick={() => setShowAccessBlockedOnly(!showAccessBlockedOnly)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border shadow-lg ${
            showAccessBlockedOnly
              ? 'bg-rose-600 text-white border-rose-400 shadow-rose-600/30 animate-pulse'
              : 'bg-slate-800/90 text-rose-300 border-rose-500/30 hover:bg-slate-800'
          }`}
        >
          <Lock className="w-4 h-4 text-rose-300" />
          <span>{showAccessBlockedOnly ? 'Showing Access Blocked Zones Only' : 'Filter Access Blocked Zones (एक्सेस ब्लॉक)'}</span>
        </button>

        {/* Filter by Disease */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-bold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" /> Disease:
          </span>
          <select
            value={diseaseFilter}
            onChange={(e) => setDiseaseFilter(e.target.value)}
            className="glass-input py-1.5 px-3 text-xs w-auto"
          >
            <option value="All">All Diseases</option>
            <option value="Dengue">Dengue</option>
            <option value="Malaria">Malaria</option>
            <option value="Typhoid">Typhoid</option>
            <option value="Chikungunya">Chikungunya</option>
          </select>

          {/* Filter by Risk */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="glass-input py-1.5 px-3 text-xs w-auto"
          >
            <option value="All">All Risk Levels</option>
            <option value="High">🔴 High Risk Only</option>
            <option value="Medium">🟠 Medium Risk</option>
            <option value="Safe">🟢 Safe Zone</option>
          </select>

          {/* Map Layer Style */}
          <select
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value)}
            className="glass-input py-1.5 px-3 text-xs w-auto font-bold text-cyan-300 border-cyan-500/40"
          >
            <option value="dark">🌙 Dark Cyber Map</option>
            <option value="street">🗺️ Street Map</option>
            <option value="satellite">🛰️ Satellite GIS</option>
          </select>
        </div>

      </div>

      {/* City Chips for Instant Focus */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-bold shrink-0">Quick Focus:</span>
        {baseData.map((c, i) => (
          <button
            key={`${c.city}-${i}`}
            onClick={() => handleCitySelect(c)}
            className={`px-3 py-1 rounded-lg shrink-0 transition flex items-center gap-1.5 font-bold ${
              selectedCity?.city === c.city
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : c.accessBlocked
                ? 'bg-rose-950/40 text-rose-300 border border-rose-500/40 hover:bg-rose-900/50'
                : 'bg-slate-900/80 text-slate-300 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            {c.accessBlocked ? (
              <Lock className="w-3 h-3 text-rose-400" />
            ) : (
              <MapPin className="w-3 h-3 text-cyan-400" />
            )}
            <span>{c.city}</span>
            {c.accessBlocked && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>}
          </button>
        ))}
      </div>

      {/* Leaflet Interactive GIS Map Container with Access Block Overlays & VFX */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-cyan-500/40 shadow-2xl">
        
        <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom={true}>
          <ChangeMapView center={mapCenter} zoom={mapZoom} />
          
          <TileLayer
            attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
            url={
              mapStyle === 'satellite'
                ? 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
                : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
            }
            className={mapStyle === 'dark' ? 'map-tiles-dark' : ''}
          />

          {/* Render Access Blocked Red Pulsing Containment Radius Circles for Blocked Cities */}
          {filteredCities.map((item, idx) => {
            if (!item.accessBlocked) return null;
            return (
              <Circle
                key={`block-radius-${idx}`}
                center={[item.lat, item.lng]}
                radius={item.containmentRadius}
                pathOptions={{
                  color: '#f43f5e',
                  fillColor: '#f43f5e',
                  fillOpacity: 0.18,
                  dashArray: '8, 8',
                  weight: 2
                }}
              />
            );
          })}

          {/* Render City Circle Markers */}
          {filteredCities.map((item, idx) => {
            const circleColor = item.accessBlocked ? '#f43f5e' : item.risk === 'Medium' ? '#f59e0b' : '#10b981';
            return (
              <CircleMarker
                key={idx}
                ref={(ref) => {
                  if (ref) markerRefs.current[item.city] = ref;
                }}
                center={[item.lat, item.lng]}
                radius={item.accessBlocked ? 20 : item.risk === 'Medium' ? 14 : 10}
                pathOptions={{
                  color: circleColor,
                  fillColor: circleColor,
                  fillOpacity: item.accessBlocked ? 0.8 : 0.65,
                  weight: item.accessBlocked ? 4 : 2
                }}
                eventHandlers={{
                  click: () => handleCitySelect(item)
                }}
              >
                <Popup>
                  <div className="text-xs font-sans text-slate-100 p-2 space-y-2.5 min-w-[210px]">
                    
                    {/* Header with Access Blocked Notification */}
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                      <div>
                        <div className="font-extrabold text-sm text-cyan-300">{item.city}</div>
                        <div className="text-[10px] text-slate-400">{item.state}</div>
                      </div>

                      {item.accessBlocked ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-rose-600 text-white shadow-md flex items-center gap-1 border border-rose-400 animate-pulse">
                          <Lock className="w-3 h-3" /> ACCESS BLOCKED
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          item.risk === 'Medium' ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50' :
                          'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                        }`}>
                          {item.risk} Risk
                        </span>
                      )}
                    </div>

                    {/* Access Block Warning Banner if Blocked */}
                    {item.accessBlocked && (
                      <div className="p-2 rounded-lg bg-rose-950/80 border border-rose-500/50 text-[10px] text-rose-200 leading-tight space-y-1">
                        <div className="font-bold text-rose-400 flex items-center gap-1">
                          <Octagon className="w-3.5 h-3.5 text-rose-400" />
                          <span>⛔ CONTAINMENT BLOCKADE ACTIVE</span>
                        </div>
                        <div>{item.accessBlockReason}</div>
                        <div className="font-mono text-cyan-300 font-semibold pt-0.5">🔒 {item.blockedGates}</div>
                      </div>
                    )}

                    <div className="space-y-1 text-slate-300 text-[11px] pt-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Outbreak Disease:</span>
                        <span className="font-bold text-cyan-400">{item.disease}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Confirmed Cases:</span>
                        <span className="font-mono font-bold text-amber-400">{item.cases}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Hospital Beds:</span>
                        <span className="font-semibold text-emerald-400">{item.hospitalBeds}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Quarantine Status:</span>
                        <span className={`font-bold ${item.accessBlocked ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {item.quarantine}
                        </span>
                      </div>
                    </div>

                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Cyber Outbreak & Access Block HUD Watermark VFX Badge */}
        <div className="absolute top-3 right-3 z-[1000] bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-rose-500/40 text-[10px] font-mono text-rose-300 flex items-center gap-2 shadow-xl">
          <Lock className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          <span>ACCESS BLOCKADE & GIS TELEMETRY ACTIVE</span>
        </div>

      </div>

    </div>
  );
}
