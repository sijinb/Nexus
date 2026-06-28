import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// API
import { getRiskScores } from '../api';

export default function Dashboard({ alerts, triggerToast }) {
  const mapContainerId = 'nexus-map';
  const mapInstanceRef = useRef(null);
  
  // Layer References
  const circlesRef = useRef({});
  const pulsingRingsRef = useRef({});
  const heatmapLayerRef = useRef(null);

  // Component States
  const [riskScores, setRiskScores] = useState({});
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [weatherIntel, setWeatherIntel] = useState([]);
  
  // Collapsible Panel States
  const [isThreatOpen, setIsThreatOpen] = useState(true);
  const [isWeatherOpen, setIsWeatherOpen] = useState(true);

  // Demo status
  const [isDemoRunning, setIsDemoRunning] = useState(false);

  // Helper: Convert score to color
  const riskToColor = (score) => {
    if (score >= 71) return '#ff2d55'; // critical red
    if (score >= 51) return '#ff6b00'; // high orange
    if (score >= 31) return '#ffd700'; // medium yellow
    return '#00ff88'; // low green
  };

  // Fetch risk scores from backend
  const fetchScores = async () => {
    try {
      const scores = await getRiskScores();
      setRiskScores(scores);
      
      // Update top weather intel list (top 5 highest risk cities)
      const sortedCities = Object.entries(scores)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      setWeatherIntel(sortedCities);

    } catch (err) {
      console.warn('Dashboard failed to fetch risk scores:', err.message);
    }
  };

  // 1. Initial Map Setup
  useEffect(() => {
    if (mapInstanceRef.current) return;

    // Initialize Map
    const map = L.map(mapContainerId, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: false,
      attributionControl: false
    });

    // Dark Tile Layer
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { attribution: '© OpenStreetMap © CartoDB', maxZoom: 19 }
    ).addTo(map);

    mapInstanceRef.current = map;
    
    // Fetch initial scores
    fetchScores();

    // Set map handlers globally for window popup calls
    window.nexusMapInstance = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      delete window.nexusMapInstance;
    };
  }, []);

  // 2. Poll Risk Scores (Every 15 seconds)
  useEffect(() => {
    const scoreInterval = setInterval(fetchScores, 15000);
    return () => clearInterval(scoreInterval);
  }, []);

  // 3. Render / Update Circle Markers In-place
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.entries(riskScores).forEach(([cityId, data]) => {
      const color = riskToColor(data.score);
      const population = data.pop || 2000000;
      const radius = Math.max(8, Math.sqrt(population / 500000));
      
      // Count alerts in this city
      const activeAlerts = alerts.filter(
        a => a.city.toLowerCase() === data.cityName.toLowerCase() ||
             a.city.toLowerCase() === cityId.toLowerCase()
      );
      const topAlert = activeAlerts.find(a => a.severity === 'Critical') || activeAlerts[0];

      // Custom styled HTML popup
      const popupHtml = `
        <div style="background:#0d1f35;color:#e2e8f0;padding:14px;border-radius:10px;border:1px solid #1a3a5c;min-width:220px; font-family:'Inter', sans-serif">
          <div style="font-size:18px;font-weight:700;color:#00d4ff">${data.cityName}</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:12px">${data.state || 'India'}</div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:13px">Risk Score</span>
            <span style="color:${color};font-weight:700">${data.score}/100</span>
          </div>
          <div style="background:#1a3a5c;border-radius:4px;height:6px;margin-bottom:12px">
            <div style="width:${data.score}%;background:${color};height:100%;border-radius:4px"></div>
          </div>
          <div style="font-size:13px;margin-bottom:4px">Active Alerts: <strong>${activeAlerts.length}</strong></div>
          <div style="font-size:13px;margin-bottom:4px">Top Threat: <strong style="color:${activeAlerts.length > 0 ? '#ff2d55' : '#64748b'}">${topAlert ? topAlert.type : 'None'}</strong></div>
          <div style="font-size:13px;margin-bottom:12px">
            🌧 ${data.rain !== undefined ? data.rain.toFixed(1) : 0}mm rain &nbsp;&nbsp; 🌬 ${data.windspeed !== undefined ? data.windspeed.toFixed(1) : 0}km/h wind
          </div>
          <button onclick="window.nexusPredict('${cityId}')"
            style="width:100%;padding:8px;background:#00d4ff;color:#050a14;
                   border:none;border-radius:6px;cursor:pointer;font-weight:600;
                   margin-bottom:6px;font-size:12px;transition:all 0.2s">
            📊 4-Hour Forecast
          </button>
          <button onclick="window.nexusIncidents('${cityId}')"
            style="width:100%;padding:8px;background:transparent;color:#00d4ff;
                   border:1px solid #00d4ff;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px">
            ⚡ View Incidents
          </button>
        </div>
      `;

      // Main Circle Marker
      if (circlesRef.current[cityId]) {
        // Update existing marker attributes in-place to preserve active popups
        const marker = circlesRef.current[cityId];
        marker.setStyle({
          fillColor: color,
          color: color,
          radius: radius
        });
        marker.setPopupContent(popupHtml);
      } else {
        // Create new marker
        const marker = L.circleMarker([data.lat, data.lng], {
          radius: radius,
          fillColor: color,
          fillOpacity: 0.65,
          color: color,
          weight: 2,
          opacity: 1
        }).addTo(map);

        marker.bindPopup(popupHtml, {
          closeButton: false,
          className: 'nexus-leaflet-popup'
        });
        
        circlesRef.current[cityId] = marker;
      }

      // Pulsing Critical Ring (Score > 70)
      if (data.score > 70) {
        if (!pulsingRingsRef.current[cityId]) {
          const pulsingRing = L.circleMarker([data.lat, data.lng], {
            radius: radius * 1.8,
            fillColor: color,
            fillOpacity: 0.1,
            color: color,
            weight: 1.5,
            opacity: 0.4,
            interactive: false
          }).addTo(map);
          pulsingRingsRef.current[cityId] = pulsingRing;
        } else {
          // Update ring position/radius in-place
          pulsingRingsRef.current[cityId].setStyle({
            radius: radius * 1.8,
            color: color,
            fillColor: color
          });
        }
      } else {
        // Remove ring if score falls below threshold
        if (pulsingRingsRef.current[cityId]) {
          map.removeLayer(pulsingRingsRef.current[cityId]);
          delete pulsingRingsRef.current[cityId];
        }
      }
    });
  }, [riskScores, alerts]);

  // 4. Pulse rings opacity interval
  useEffect(() => {
    let opacity = 0.1;
    const interval = setInterval(() => {
      opacity = opacity === 0.1 ? 0.35 : 0.1;
      Object.values(pulsingRingsRef.current).forEach(ring => {
        if (ring) ring.setStyle({ fillOpacity: opacity });
      });
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // 5. Update Heatmap layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (heatmapLayerRef.current) {
      map.removeLayer(heatmapLayerRef.current);
      heatmapLayerRef.current = null;
    }

    if (showHeatmap) {
      const heatPoints = alerts.map(a => {
        let weight = 0.2;
        if (a.severity === 'Critical') weight = 1.0;
        else if (a.severity === 'High') weight = 0.7;
        else if (a.severity === 'Medium') weight = 0.4;
        return [a.location.lat, a.location.lng, weight];
      });

      heatmapLayerRef.current = L.heatLayer(heatPoints, {
        radius: 40,
        blur: 25,
        maxZoom: 10
      }).addTo(map);
    }
  }, [showHeatmap, alerts]);

  // Map Controls Action Dispatchers
  const zoomIn = () => mapInstanceRef.current?.zoomIn();
  const zoomOut = () => mapInstanceRef.current?.zoomOut();

  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      triggerToast({ id: Math.random(), city: 'System', type: 'default', severity: 'Medium', description: 'Geolocation not supported by browser.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapInstanceRef.current?.flyTo([latitude, longitude], 10, { animate: true });
        L.marker([latitude, longitude]).addTo(mapInstanceRef.current)
          .bindPopup('<div style="color:#00d4ff;font-weight:700">You are here</div>')
          .openPopup();
      },
      (err) => {
        triggerToast({ id: Math.random(), city: 'System', type: 'default', severity: 'Medium', description: 'Location access denied.' });
      }
    );
  };

  // Threat calculations
  const totalCritical = alerts.filter(a => a.severity === 'Critical').length;
  const totalHigh = alerts.filter(a => a.severity === 'High').length;
  const totalMedium = alerts.filter(a => a.severity === 'Medium').length;
  const totalLow = alerts.filter(a => a.severity === 'Low').length;
  const totalIncidents = alerts.length;

  const pctCritical = totalIncidents ? (totalCritical / totalIncidents) * 100 : 0;
  const pctHigh = totalIncidents ? (totalHigh / totalIncidents) * 100 : 0;
  const pctMedium = totalIncidents ? (totalMedium / totalIncidents) * 100 : 0;
  const pctLow = totalIncidents ? (totalLow / totalIncidents) * 100 : 0;

  // Automated 11-step Demo Mode Sequencer
  const runDemoSequence = () => {
    if (isDemoRunning) return;
    setIsDemoRunning(true);
    
    let apiHost = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    if (apiHost && !apiHost.startsWith('http://') && !apiHost.startsWith('https://')) {
      apiHost = `https://${apiHost}`;
    }
    
    // Step 0: [0s] Activate
    triggerToast({
      id: 990,
      city: 'System',
      type: 'default',
      severity: 'Low',
      description: '🎬 NEXUS Demo Mode Activated'
    });

    // Step 1: [2s] POST Flood Alert Mumbai
    setTimeout(() => {
      fetch(`${apiHost}/api/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'Flood',
          city: 'Mumbai',
          state: 'Maharashtra',
          location: { lat: 19.0390, lng: 72.8550 },
          severity: 'Critical',
          description: 'Severe waterlogging in Dharavi. Mithi river overflowing. Local trains suspended. MCGM pumps overwhelmed.'
        })
      }).catch(err => console.error(err));
    }, 2000);

    // Step 2: [3s] Map FlyTo Mumbai
    setTimeout(() => {
      mapInstanceRef.current?.flyTo([19.0390, 72.8550], 11, { animate: true });
    }, 3000);

    // Step 3: [4s] Flash Mumbai & Trigger Toast
    setTimeout(() => {
      triggerToast({
        id: 991,
        city: 'Mumbai',
        type: 'Flood',
        severity: 'Critical',
        description: '🌊 CRITICAL: Flood alert — Mumbai, Maharashtra'
      });
      // Flash indicator via style updates
      if (circlesRef.current['mumbai']) {
        let toggle = true;
        const flash = setInterval(() => {
          if (circlesRef.current['mumbai']) {
            circlesRef.current['mumbai'].setStyle({
              fillOpacity: toggle ? 0.9 : 0.3
            });
            toggle = !toggle;
          }
        }, 400);
        setTimeout(() => {
          clearInterval(flash);
          circlesRef.current['mumbai']?.setStyle({ fillOpacity: 0.65 });
        }, 3000);
      }
    }, 4000);

    // Step 4: [6s] Navigate to Incidents
    setTimeout(() => {
      window.nexusIncidents('mumbai');
    }, 6000);

    // Step 5: [9s] Navigate to AI Command Page
    setTimeout(() => {
      window.nexusPredict('mumbai');
    }, 9000);

    // Step 6: [11s] Auto type query
    setTimeout(() => {
      const textarea = document.getElementById('ai-query-input');
      const forecastPill = document.getElementById('forecast-pill-24');
      if (forecastPill) forecastPill.click();
      
      if (textarea) {
        textarea.value = "";
        const queryText = "Mumbai Dharavi is showing critical flood levels with Mithi river overflowing. What immediate actions should NDRF and MCGM take in the next 24 hours?";
        let charIdx = 0;
        const typing = setInterval(() => {
          if (charIdx < queryText.length) {
            textarea.value += queryText[charIdx];
            charIdx++;
          } else {
            clearInterval(typing);
            // Submit Query
            setTimeout(() => {
              const analyzeBtn = document.getElementById('ai-analyze-submit');
              analyzeBtn?.click();
            }, 500);
          }
        }, 40);
      }
    }, 11000);

    // Step 7: [24s] POST Chennai Power Alert & Toast
    setTimeout(() => {
      fetch(`${apiHost}/api/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'Power',
          city: 'Chennai',
          state: 'Tamil Nadu',
          location: { lat: 13.0827, lng: 80.2707 },
          severity: 'High',
          description: 'Grid failure at Avadi substation. North Chennai blackout affecting 60,000 homes. TNEB crews deployed.'
        })
      })
      .then(() => {
        triggerToast({
          id: 992,
          city: 'Chennai',
          type: 'Power',
          severity: 'High',
          description: '⚡ HIGH: Power outage — Chennai, Tamil Nadu'
        });
      })
      .catch(err => console.error(err));
    }, 24000);

    // Step 8: [27s] Clear & Auto type second query
    setTimeout(() => {
      const textarea = document.getElementById('ai-query-input');
      if (textarea) {
        textarea.value = "";
        const queryText = "Given the Mumbai flood and Chennai power outage, what is the national risk picture for the next 24 hours and which cities should be put on standby alert?";
        let charIdx = 0;
        const typing = setInterval(() => {
          if (charIdx < queryText.length) {
            textarea.value += queryText[charIdx];
            charIdx++;
          } else {
            clearInterval(typing);
            setTimeout(() => {
              const analyzeBtn = document.getElementById('ai-analyze-submit');
              analyzeBtn?.click();
            }, 500);
          }
        }, 40);
      }
    }, 27000);

    // Step 9: [40s] Return to Dashboard
    setTimeout(() => {
      const navTabs = document.getElementsByTagName('button');
      for (let btn of navTabs) {
        if (btn.innerText.includes('Dashboard')) {
          btn.click();
          break;
        }
      }
    }, 40000);

    // Step 10: [41s] Reset Map flyTo India
    setTimeout(() => {
      mapInstanceRef.current?.flyTo([20.5937, 78.9629], 5, { animate: true });
    }, 41000);

    // Step 11: [44s] Final Toast & Complete
    setTimeout(() => {
      triggerToast({
        id: 993,
        city: 'System',
        type: 'default',
        severity: 'Low',
        description: '✅ DEMO COMPLETE — NEXUS monitoring 20 cities live'
      });
      setIsDemoRunning(false);
    }, 44000);
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] pt-[100px] overflow-hidden select-none">
      {/* 100% Viewport Map container */}
      <div id={mapContainerId} className="absolute inset-0 w-full h-full z-0" />

      {/* Floating Panels: Pointer-events auto container overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-10 p-4 pt-28 pb-10">
        
        {/* Floating Top panels row */}
        <div className="flex justify-between items-start w-full">
          {/* Top Left: Threat Overview Widget */}
          <div className="w-[240px] bg-bgCard/85 border border-borderGlow rounded-lg p-4 pointer-events-auto backdrop-blur-md shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-borderGlow pb-2">
              <span className="font-display font-bold text-xs text-accentCyan tracking-wider">
                🔴 THREAT OVERVIEW
              </span>
              <button 
                onClick={() => setIsThreatOpen(!isThreatOpen)}
                className="text-textMuted hover:text-white transition-colors cursor-pointer text-xs font-bold font-mono"
              >
                {isThreatOpen ? '−' : '+'}
              </button>
            </div>

            {isThreatOpen && (
              <div className="flex flex-col gap-2.5 animate-slide-in-top">
                {/* Critical */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-critical flex items-center gap-1.5 font-display">
                      <span className="w-1.5 h-1.5 rounded-full bg-critical animate-ping" /> CRITICAL
                    </span>
                    <span className="text-textPrimary">{totalCritical}</span>
                  </div>
                  <div className="w-full bg-bgPrimary/60 h-1.5 rounded overflow-hidden border border-borderGlow/40">
                    <div style={{ width: `${pctCritical}%` }} className="h-full bg-critical" />
                  </div>
                </div>

                {/* High */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-high font-display">● HIGH</span>
                    <span className="text-textPrimary">{totalHigh}</span>
                  </div>
                  <div className="w-full bg-bgPrimary/60 h-1.5 rounded overflow-hidden border border-borderGlow/40">
                    <div style={{ width: `${pctHigh}%` }} className="h-full bg-high" />
                  </div>
                </div>

                {/* Medium */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-medium font-display">● MEDIUM</span>
                    <span className="text-textPrimary">{totalMedium}</span>
                  </div>
                  <div className="w-full bg-bgPrimary/60 h-1.5 rounded overflow-hidden border border-borderGlow/40">
                    <div style={{ width: `${pctMedium}%` }} className="h-full bg-medium" />
                  </div>
                </div>

                {/* Low */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-low font-display">● LOW</span>
                    <span className="text-textPrimary">{totalLow}</span>
                  </div>
                  <div className="w-full bg-bgPrimary/60 h-1.5 rounded overflow-hidden border border-borderGlow/40">
                    <div style={{ width: `${pctLow}%` }} className="h-full bg-low" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Top Right: Weather Intel Widget */}
          <div className="w-[260px] bg-bgCard/85 border border-borderGlow rounded-lg p-4 pointer-events-auto backdrop-blur-md shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-borderGlow pb-2">
              <span className="font-display font-bold text-xs text-accentCyan tracking-wider">
                🌧 WEATHER INTEL (TOP 5)
              </span>
              <button 
                onClick={() => setIsWeatherOpen(!isWeatherOpen)}
                className="text-textMuted hover:text-white transition-colors cursor-pointer text-xs font-bold font-mono"
              >
                {isWeatherOpen ? '−' : '+'}
              </button>
            </div>

            {isWeatherOpen && (
              <div className="flex flex-col gap-2 animate-slide-in-top text-xs">
                {weatherIntel.length === 0 ? (
                  <span className="text-textMuted italic">Calculating telemetry...</span>
                ) : (
                  weatherIntel.map(city => (
                    <div key={city.id} className="flex justify-between items-center bg-bgPrimary/30 p-1.5 rounded border border-borderGlow/30 hover:border-borderGlow transition-colors">
                      <span className="font-medium text-textPrimary">{city.cityName}</span>
                      <div className="flex gap-2.5 items-center">
                        <span className="text-textMuted flex items-center gap-0.5">
                          🌧{city.rain !== undefined ? city.rain.toFixed(1) : 0}m
                        </span>
                        <span className="font-bold font-display" style={{ color: riskToColor(city.score) }}>
                          RISK {city.score}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Floating Bottom panels row */}
        <div className="flex justify-between items-end w-full">
          {/* Bottom Left: Recent Alerts Feed */}
          <div className="w-[280px] bg-bgCard/85 border border-borderGlow rounded-lg p-4 pointer-events-auto backdrop-blur-md shadow-2xl flex flex-col gap-2.5">
            <span className="font-display font-bold text-xs text-accentCyan tracking-wider border-b border-borderGlow pb-1.5">
              ⚡ RECENT ALERTS
            </span>
            <div className="flex flex-col gap-2">
              {alerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="flex flex-col bg-bgPrimary/40 border border-borderGlow/40 p-2 rounded relative">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-textPrimary truncate max-w-[130px]">
                      {alert.city} — {alert.type}
                    </span>
                    <span 
                      style={{ color: riskToColor(alert.severity === 'Critical' ? 90 : alert.severity === 'High' ? 60 : alert.severity === 'Medium' ? 40 : 10) }}
                      className="text-[9px] uppercase font-extrabold tracking-wide"
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-[10px] text-textMuted line-clamp-1 leading-tight mt-1">
                    {alert.description}
                  </p>
                </div>
              ))}
              {alerts.length === 0 && (
                <span className="text-textMuted text-xs italic">No active incidents.</span>
              )}
            </div>

            <button 
              onClick={() => {
                const navTabs = document.getElementsByTagName('button');
                for (let btn of navTabs) {
                  if (btn.innerText.includes('Incidents')) {
                    btn.click();
                    break;
                  }
                }
              }}
              className="w-full py-1 text-center bg-bgSecondary border border-borderGlow text-accentCyan text-xs rounded hover:bg-bgPrimary/60 transition-colors font-medium cursor-pointer"
            >
              View All Alerts →
            </button>
          </div>

          {/* Bottom Center: Demo Control Button */}
          <button 
            disabled={isDemoRunning}
            onClick={runDemoSequence}
            className={`w-[160px] h-10 rounded-full flex items-center justify-center gap-2 border font-bold text-sm tracking-wide cursor-pointer transition-all duration-300 pointer-events-auto ${
              isDemoRunning 
                ? 'bg-critical/30 border-critical text-critical cursor-not-allowed animate-pulse'
                : 'bg-critical/10 border-critical text-critical hover:bg-critical/30 animate-glow-pulse shadow-critical/20 shadow-lg'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-critical opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-critical"></span>
            </span>
            <span>{isDemoRunning ? 'RUNNING DEMO' : '● LIVE DEMO'}</span>
          </button>

          {/* Bottom Right: Map Controls Stack */}
          <div className="flex flex-col gap-2.5 pointer-events-auto">
            {/* Heatmap Toggle */}
            <button 
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`w-11 h-11 rounded-lg border flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xl ${
                showHeatmap 
                  ? 'bg-accentCyan border-accentCyan text-bgPrimary font-bold glow-cyan-border'
                  : 'bg-bgCard/90 border-borderGlow text-accentCyan hover:border-accentCyan/50'
              }`}
              title="Toggle Heatmap"
            >
              🌡
            </button>

            {/* Zoom In */}
            <button 
              onClick={zoomIn}
              className="w-11 h-11 rounded-lg border border-borderGlow bg-bgCard/90 text-accentCyan flex items-center justify-center hover:border-accentCyan/50 transition-all cursor-pointer shadow-xl text-lg font-bold"
              title="Zoom In"
            >
              +
            </button>

            {/* Zoom Out */}
            <button 
              onClick={zoomOut}
              className="w-11 h-11 rounded-lg border border-borderGlow bg-bgCard/90 text-accentCyan flex items-center justify-center hover:border-accentCyan/50 transition-all cursor-pointer shadow-xl text-lg font-bold"
              title="Zoom Out"
            >
              −
            </button>

            {/* My Location */}
            <button 
              onClick={handleMyLocation}
              className="w-11 h-11 rounded-lg border border-borderGlow bg-bgCard/90 text-accentCyan flex items-center justify-center hover:border-accentCyan/50 transition-all cursor-pointer shadow-xl"
              title="My Location"
            >
              📍
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
