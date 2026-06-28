import { useState, useEffect } from 'react';
import PageTransition from '../components/PageTransition';

// API
import { simulateAlert, resolveAlert, analyzeAI } from '../api';

const CITIES_LIST = [
  {id:"delhi",       name:"Delhi NCR",    lat:28.6139,lng:77.2090,state:"Delhi"},
  {id:"mumbai",      name:"Mumbai",       lat:19.0760,lng:72.8777,state:"Maharashtra"},
  {id:"bengaluru",   name:"Bengaluru",    lat:12.9716,lng:77.5946,state:"Karnataka"},
  {id:"hyderabad",   name:"Hyderabad",    lat:17.3850,lng:78.4867,state:"Telangana"},
  {id:"chennai",     name:"Chennai",      lat:13.0827,lng:80.2707,state:"Tamil Nadu"},
  {id:"kolkata",     name:"Kolkata",      lat:22.5726,lng:88.3639,state:"West Bengal"},
  {id:"pune",        name:"Pune",         lat:18.5204,lng:73.8567,state:"Maharashtra"},
  {id:"ahmedabad",   name:"Ahmedabad",    lat:23.0225,lng:72.5714,state:"Gujarat"},
  {id:"jaipur",      name:"Jaipur",       lat:26.9124,lng:75.7873,state:"Rajasthan"},
  {id:"lucknow",     name:"Lucknow",      lat:26.8467,lng:80.9462,state:"Uttar Pradesh"},
  {id:"kochi",       name:"Kochi",        lat:9.9312, lng:76.2673,state:"Kerala"},
  {id:"chandigarh",  name:"Chandigarh",   lat:30.7333,lng:76.7794,state:"Punjab"},
  {id:"bhopal",      name:"Bhopal",       lat:23.2599,lng:77.4126,state:"Madhya Pradesh"},
  {id:"nagpur",      name:"Nagpur",       lat:21.1458,lng:79.0882,state:"Maharashtra"},
  {id:"patna",       name:"Patna",        lat:25.5941,lng:85.1376,state:"Bihar"},
  {id:"bhubaneswar", name:"Bhubaneswar",  lat:20.2961,lng:85.8245,state:"Odisha"},
  {id:"guwahati",    name:"Guwahati",     lat:26.1445,lng:91.7362,state:"Assam"},
  {id:"surat",       name:"Surat",        lat:21.1702,lng:72.8311,state:"Gujarat"},
  {id:"amritsar",    name:"Amritsar",     lat:31.6340,lng:74.8723,state:"Punjab"},
  {id:"coimbatore",  name:"Coimbatore",   lat:11.0168,lng:76.9558,state:"Tamil Nadu"}
];

export default function Incidents({ initialFilterCityId, clearCityFilter, alerts, setAlerts, triggerToast }) {
  // Filters
  const [selectedType, setSelectedType] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [searchCity, setSearchCity] = useState('');
  
  // Expandable AI Drawer states
  const [analyzingIncidentId, setAnalyzingIncidentId] = useState(null);
  const [aiReport, setAiReport] = useState({});
  const [isSimulating, setIsSimulating] = useState(false);

  // Sync initial city filter from map popup clicks
  useEffect(() => {
    if (initialFilterCityId) {
      const city = CITIES_LIST.find(c => c.id === initialFilterCityId);
      if (city) {
        setSearchCity(city.name);
      }
    }
  }, [initialFilterCityId]);

  // Handle Location click -> flyTo coordinates on dashboard
  const handleLocationClick = (alert) => {
    const matchedCity = CITIES_LIST.find(
      c => c.name.toLowerCase() === alert.city.toLowerCase() ||
           c.id.toLowerCase() === alert.city.toLowerCase()
    );
    const lat = matchedCity ? matchedCity.lat : alert.location.lat;
    const lng = matchedCity ? matchedCity.lng : alert.location.lng;

    if (window.nexusMapInstance) {
      window.nexusMapInstance.flyTo([lat, lng], 10, { animate: true });
      // Click dashboard nav tab
      const navTabs = document.getElementsByTagName('button');
      for (let btn of navTabs) {
        if (btn.innerText.includes('Dashboard')) {
          btn.click();
          break;
        }
      }
    } else {
      triggerToast({
        id: Math.random(),
        city: alert.city,
        type: alert.type,
        severity: 'Low',
        description: `📍 Map target center: [${lat.toFixed(4)}, ${lng.toFixed(4)}]`
      });
    }
  };

  // Trigger alert simulation
  const handleSimulateAlert = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    try {
      const newAlert = await simulateAlert();
      triggerToast(newAlert);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Mark Alert as Resolved
  const handleResolveAlert = async (id) => {
    try {
      await resolveAlert(id);
      
      // Update locally to stamp resolved status
      setAlerts(prev => prev.map(alert => {
        if (alert.id === id) {
          return { ...alert, status: 'resolved' };
        }
        return alert;
      }));

      triggerToast({
        id: Math.random(),
        city: 'System',
        type: 'default',
        severity: 'Low',
        description: `✓ Alert #${id} marked as Resolved.`
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Dispatch emergency unit
  const handleDeployResource = (city, type, agency) => {
    triggerToast({
      id: Math.random(),
      city: city,
      type: type,
      severity: 'Low',
      description: `🚨 Dispatched ${agency} emergency units to ${city}.`
    });
  };

  // AI Incident Analysis Streamer
  const handleAIAnalyze = (id, description) => {
    if (analyzingIncidentId === id) {
      setAnalyzingIncidentId(null);
      return;
    }

    setAnalyzingIncidentId(id);
    setAiReport(prev => ({ ...prev, [id]: '' }));

    analyzeAI(
      `Analyze this incident in detail and recommend immediate responses: ${description}`,
      4, // 4-hour window context
      'all',
      id,
      (chunk) => {
        setAiReport(prev => ({
          ...prev,
          [id]: (prev[id] || '') + chunk
        }));
      },
      () => console.log('AI analysis completed for alert:', id),
      (err) => {
        console.error(err);
        setAiReport(prev => ({
          ...prev,
          [id]: 'Error running Generative AI analysis. Fallback offline metrics stable.'
        }));
      }
    );
  };

  // Format relative timestamp
  const formatTimeAgo = (timestamp) => {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  // Filter Logic
  const filteredAlerts = alerts.filter(alert => {
    // Hide resolved alerts from standard listing unless requested
    const matchesStatus = alert.status !== 'resolved';
    const matchesType = selectedType === 'All' || alert.type === selectedType;
    const matchesSeverity = selectedSeverity === 'All' || alert.severity === selectedSeverity;
    const matchesCity = !searchCity || alert.city.toLowerCase().includes(searchCity.toLowerCase());
    return matchesStatus && matchesType && matchesSeverity && matchesCity;
  });

  const severityBorders = {
    Critical: 'border-l-4 border-l-[#ff2d55]',
    High: 'border-l-4 border-l-[#ff6b00]',
    Medium: 'border-l-4 border-l-[#ffd700]',
    Low: 'border-l-4 border-l-[#00ff88]'
  };

  const severityBadgeColors = {
    Critical: 'bg-[#ff2d55]/15 text-[#ff2d55] border-[#ff2d55]/30',
    High: 'bg-[#ff6b00]/15 text-[#ff6b00] border-[#ff6b00]/30',
    Medium: 'bg-[#ffd700]/15 text-[#ffd700] border-[#ffd700]/30',
    Low: 'bg-[#00ff88]/15 text-[#00ff88] border-[#00ff88]/30'
  };

  const typeIcons = {
    Flood: '🌊',
    Fire: '🔥',
    Medical: '🚑',
    Accident: '🚗',
    Power: '⚡',
    Structure: '🏗',
    default: '🚨'
  };

  return (
    <PageTransition>
      <div className="w-full max-w-6xl flex flex-col gap-6 text-left">
        
        {/* Header row */}
        <div className="flex justify-between items-center border-b border-borderGlow pb-4">
          <div className="flex flex-col">
            <h1 className="font-display font-bold text-3xl tracking-wide text-accentCyan flex items-center gap-2">
              ⚡ ACTIVE INCIDENTS
            </h1>
            <span className="text-sm text-textMuted mt-1 font-medium">
              {filteredAlerts.length} incidents across {new Set(filteredAlerts.map(a => a.city)).size} cities currently monitored
            </span>
          </div>

          <button
            onClick={handleSimulateAlert}
            disabled={isSimulating}
            className="px-4 py-2 border border-accentCyan text-accentCyan font-bold rounded-lg bg-accentCyan/5 hover:bg-accentCyan/25 transition-all text-xs tracking-wider cursor-pointer font-display disabled:opacity-50"
          >
            {isSimulating ? 'SIMULATING...' : '+ SIMULATE ALERT'}
          </button>
        </div>

        {/* Filter Bar (Sticky) */}
        <div className="bg-bgCard border border-borderGlow rounded-lg p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center shadow-lg">
          {/* Types Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-textMuted uppercase mr-1">Type:</span>
            {['All', 'Flood', 'Fire', 'Medical', 'Accident', 'Power'].map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-all ${
                  selectedType === type
                    ? 'bg-accentCyan text-bgPrimary font-bold shadow'
                    : 'bg-bgPrimary border border-borderGlow/40 text-textMuted hover:text-white'
                }`}
              >
                {typeIcons[type] || ''} {type}
              </button>
            ))}
          </div>

          {/* Severity Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-textMuted uppercase mr-1">Severity:</span>
            {['All', 'Critical', 'High', 'Medium', 'Low'].map(sev => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-all ${
                  selectedSeverity === sev
                    ? 'bg-accentCyan text-bgPrimary font-bold shadow'
                    : 'bg-bgPrimary border border-borderGlow/40 text-textMuted hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              value={searchCity}
              onChange={(e) => {
                setSearchCity(e.target.value);
                if (initialFilterCityId) clearCityFilter();
              }}
              placeholder="Search by city..."
              className="w-full h-9 bg-bgPrimary border border-borderGlow rounded-lg pl-9 pr-4 text-xs text-textPrimary placeholder:text-textMuted focus:outline-none focus:border-accentCyan"
            />
            <span className="absolute left-3 top-2.5 text-textMuted text-xs select-none">
              🔍
            </span>
            {searchCity && (
              <button
                onClick={() => {
                  setSearchCity('');
                  clearCityFilter();
                }}
                className="absolute right-3 top-2.5 text-textMuted hover:text-white cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips */}
        {(selectedType !== 'All' || selectedSeverity !== 'All' || searchCity) && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-textMuted">Active filters:</span>
            {selectedType !== 'All' && (
              <span className="bg-bgCard border border-borderGlow text-accentCyan text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-medium">
                Type: {selectedType}
                <button onClick={() => setSelectedType('All')} className="text-textMuted hover:text-white cursor-pointer">×</button>
              </span>
            )}
            {selectedSeverity !== 'All' && (
              <span className="bg-bgCard border border-borderGlow text-accentCyan text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-medium">
                Severity: {selectedSeverity}
                <button onClick={() => setSelectedSeverity('All')} className="text-textMuted hover:text-white cursor-pointer">×</button>
              </span>
            )}
            {searchCity && (
              <span className="bg-bgCard border border-borderGlow text-accentCyan text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-medium">
                City: {searchCity}
                <button onClick={() => { setSearchCity(''); clearCityFilter(); }} className="text-textMuted hover:text-white cursor-pointer">×</button>
              </span>
            )}
          </div>
        )}

        {/* Incidents Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAlerts.map(alert => {
            const borderClass = severityBorders[alert.severity] || 'border-l-4 border-l-borderGlow';
            const badgeColor = severityBadgeColors[alert.severity] || 'bg-bgPrimary text-textMuted';
            const isResolved = alert.status === 'resolved';

            return (
              <div
                key={alert.id}
                className={`nexus-card ${borderClass} relative p-4 flex flex-col gap-3.5 transition-all duration-300 ${
                  isResolved ? 'opacity-40 select-none' : ''
                }`}
              >
                {/* Stamp RESOLVED if appropriate */}
                {isResolved && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-green-500 text-green-500 font-extrabold text-2xl tracking-widest px-4 py-2 rounded-lg rotate-12 bg-bgCard/90 z-20 select-none">
                    ✓ RESOLVED
                  </div>
                )}

                {/* Top Row: Details */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{typeIcons[alert.type] || '🚨'}</span>
                    <span className="text-xs uppercase font-extrabold tracking-wider text-textPrimary">
                      {alert.type}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-textMuted">
                    {formatTimeAgo(alert.timestamp)}
                  </span>
                </div>

                {/* Body Details */}
                <div className="flex flex-col">
                  <span className="font-display font-bold text-lg text-textPrimary leading-none">
                    {alert.city}
                  </span>
                  <span className="text-[11px] font-semibold text-textMuted mt-1 uppercase tracking-wider">
                    {alert.state || 'India'}
                  </span>
                  <p className="text-xs text-textPrimary leading-relaxed mt-2.5 line-clamp-3">
                    {alert.description}
                  </p>
                </div>

                {/* Interactive Location Link */}
                <div 
                  onClick={() => !isResolved && handleLocationClick(alert)}
                  className="flex items-center gap-1.5 text-xs text-accentCyan hover:text-white cursor-pointer select-none font-medium mt-1 w-fit"
                >
                  <span>📍</span>
                  <span className="underline">{alert.city}, {alert.state}</span>
                </div>

                {/* Bottom Actions Row */}
                {!isResolved && (
                  <div className="flex flex-wrap items-center justify-between border-t border-borderGlow/50 pt-3 gap-2">
                    <div className="flex items-center gap-2">
                      {/* AI Analyze */}
                      <button
                        onClick={() => handleAIAnalyze(alert.id, alert.description)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer border transition-colors flex items-center gap-1 ${
                          analyzingIncidentId === alert.id
                            ? 'bg-accentCyan border-accentCyan text-bgPrimary font-bold'
                            : 'bg-bgPrimary border-borderGlow hover:border-accentCyan text-accentCyan'
                        }`}
                      >
                        <span>🤖</span>
                        <span>AI Analyze</span>
                      </button>

                      {/* Mark Resolved */}
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-bgPrimary border border-borderGlow hover:border-green-500 hover:text-green-500 text-textMuted transition-colors cursor-pointer"
                      >
                        ✓ Resolve
                      </button>
                    </div>

                    {/* Deploy dropdown selector */}
                    <div className="relative group">
                      <button className="px-3 py-1.5 text-xs font-semibold rounded bg-bgPrimary border border-borderGlow text-textMuted hover:border-accentPurple hover:text-accentPurple transition-colors cursor-pointer flex items-center gap-1">
                        <span>🚨</span>
                        <span>Deploy Resources</span>
                      </button>
                      <div className="absolute right-0 bottom-full mb-1 w-40 bg-bgCard border border-borderGlow rounded-md shadow-2xl overflow-hidden hidden group-hover:block group-focus-within:block z-30">
                        {['NDRF Team', 'State Fire Service', '108 Ambulance', 'Police Patrol'].map(agency => (
                          <button
                            key={agency}
                            onClick={() => handleDeployResource(alert.city, alert.type, agency)}
                            className="w-full text-left px-4 py-2 text-xs text-textMuted hover:bg-accentPurple/25 hover:text-white transition-colors cursor-pointer"
                          >
                            Deploy {agency.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Inline AI Drawers */}
                {analyzingIncidentId === alert.id && (
                  <div className="w-full bg-bgPrimary/60 border border-borderGlow rounded-lg p-3 text-xs flex flex-col gap-2 relative overflow-hidden animate-slide-in-top">
                    {/* Scan bar if loading */}
                    {!aiReport[alert.id] && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-accentCyan animate-pulse shadow-md" />
                    )}

                    <div className="flex items-center justify-between text-textMuted font-bold border-b border-borderGlow/40 pb-1 uppercase tracking-wider">
                      <span>🤖 NEXUS Dispatch Advisor</span>
                      {!aiReport[alert.id] && <span className="animate-pulse">Analyzing...</span>}
                    </div>

                    <div className="text-textPrimary leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto scrollbar-thin">
                      {aiReport[alert.id] || 'NEXUS dispatch systems processing alert metadata. Querying Gemini 1.5 Flash stream...'}
                    </div>
                  </div>
                )}

              </div>
            );
          })}

          {filteredAlerts.length === 0 && (
            <div className="col-span-1 md:col-span-2 bg-bgCard border border-borderGlow rounded-lg p-10 flex flex-col items-center justify-center gap-3 text-center shadow-lg">
              <span className="text-4xl text-low">✓</span>
              <h3 className="font-display font-bold text-lg text-textPrimary">No incidents match current filters</h3>
              <p className="text-xs text-textMuted max-w-sm leading-relaxed">
                NEXUS command dashboard shows standard operating parameters across selected nodes.
              </p>
            </div>
          )}
        </div>

      </div>
    </PageTransition>
  );
}
