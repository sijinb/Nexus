import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function MapView({ apiHost, alerts, onDeployToast, mapRef: externalMapRef }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const circlesRef = useRef({}); // cityId -> L.circle
  const heatmapLayerRef = useRef(null);
  
  const [riskScores, setRiskScores] = useState({});
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Resolution helper for risk circle colors
  const getScoreColor = (score) => {
    if (score <= 30) return '#00ff88'; // green
    if (score <= 50) return '#ffff00'; // yellow
    if (score <= 70) return '#ffaa00'; // orange
    return '#ff3b3b'; // red
  };

  const fetchRiskScores = async () => {
    try {
      const response = await fetch(`${apiHost}/api/risk-scores`);
      if (response.ok) {
        const data = await response.json();
        setRiskScores(data);
      }
    } catch (err) {
      console.error('Failed to fetch maps risk scores:', err.message);
    }
  };

  // Leaflet Heatmap Plugin Loader
  const loadLeafletHeat = () => {
    return new Promise((resolve) => {
      if (L.heatLayer) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js';
      script.onload = resolve;
      document.body.appendChild(script);
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Leaflet map centered on India
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false
    }).setView([20.5937, 78.9629], 5);

    mapInstanceRef.current = map;
    
    if (externalMapRef) {
      externalMapRef.current = map;
    }

    // Add standard OpenStreetMap tiles (fully colored and bright)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    fetchRiskScores();

    // Risk Scores Polling (15 seconds)
    const interval = setInterval(fetchRiskScores, 15000);

    // Bind popup click events to the map
    map.on('popupopen', (e) => {
      const popup = e.popup;
      const cityId = popup.options.cityId;
      if (!cityId) return;

      const fetchPrediction = async (hoursVal) => {
        const displayDiv = document.getElementById(`predict-text-${cityId}`);
        if (displayDiv) {
          displayDiv.style.display = "block";
          displayDiv.innerHTML = `<em>Calculating ${hoursVal}h forecast...</em>`;
        }
        
        try {
          const res = await fetch(`${apiHost}/api/ai/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cityId, hours: hoursVal })
          });
          if (res.ok) {
            const pred = await res.json();
            if (displayDiv) {
              displayDiv.innerHTML = pred.prediction.replace(/\n/g, '<br/>');
            }
          }
        } catch (err) {
          if (displayDiv) displayDiv.innerHTML = "Forecast link failure.";
        }
      };

      document.getElementById(`btn-predict-${cityId}-4`)?.addEventListener('click', () => fetchPrediction(4));
      document.getElementById(`btn-predict-${cityId}-12`)?.addEventListener('click', () => fetchPrediction(12));
      document.getElementById(`btn-predict-${cityId}-24`)?.addEventListener('click', () => fetchPrediction(24));
      document.getElementById(`btn-predict-${cityId}-48`)?.addEventListener('click', () => fetchPrediction(48));

      document.getElementById(`btn-deploy-${cityId}`)?.addEventListener('click', () => {
        const data = riskScores[cityId];
        if (data) {
          onDeployToast(data.cityName);
        }
        map.closePopup();
      });
    });

    return () => {
      clearInterval(interval);
      map.remove();
    };
  }, []);

  // Update circles when riskScores or alerts change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Render / update city circles in-place
    Object.entries(riskScores).forEach(([cityId, data]) => {
      const cityAlerts = alerts.filter(
        a => a.city.toLowerCase() === data.cityName.toLowerCase() || 
             a.city.toLowerCase() === cityId.toLowerCase()
      );

      const color = getScoreColor(data.score);
      const radius = Math.max(60000, data.score * 1200);

      const contentString = `
        <div style="color: #f3f4f6; padding: 4px; font-family: 'Inter', sans-serif; min-width: 200px;">
          <h3 style="font-weight: 800; text-transform: uppercase; color: #00d4ff; font-size: 13px; margin: 0 0 6px 0;">${data.cityName}</h3>
          <p style="font-size: 11px; margin: 3px 0; color: #d1d5db;"><strong>Risk Score:</strong> <span style="color: ${color}; font-weight: 800;">${data.score}/100</span></p>
          <p style="font-size: 11px; margin: 3px 0; color: #d1d5db;"><strong>Active Incidents:</strong> ${cityAlerts.length}</p>
          <p style="font-size: 11px; margin: 3px 0; color: #d1d5db;"><strong>Primary Alert:</strong> ${cityAlerts[0] ? cityAlerts[0].type : 'None'}</p>
          
          <div style="font-size: 10px; color: #9ca3af; font-weight: 800; margin-top: 10px; margin-bottom: 4px; text-transform: uppercase; tracking-wider;">AI Risk Prognosis:</div>
          <div style="display: flex; gap: 4px; margin-bottom: 10px;">
            <button id="btn-predict-${cityId}-4" style="background-color: rgba(0, 212, 255, 0.15); border: 1px solid rgba(0, 212, 255, 0.4); color: #00d4ff; padding: 2px 5px; font-size: 9px; font-weight: bold; border-radius: 4px; cursor: pointer;">4h</button>
            <button id="btn-predict-${cityId}-12" style="background-color: rgba(0, 212, 255, 0.15); border: 1px solid rgba(0, 212, 255, 0.4); color: #00d4ff; padding: 2px 5px; font-size: 9px; font-weight: bold; border-radius: 4px; cursor: pointer;">12h</button>
            <button id="btn-predict-${cityId}-24" style="background-color: rgba(0, 212, 255, 0.15); border: 1px solid rgba(0, 212, 255, 0.4); color: #00d4ff; padding: 2px 5px; font-size: 9px; font-weight: bold; border-radius: 4px; cursor: pointer;">24h</button>
            <button id="btn-predict-${cityId}-48" style="background-color: rgba(0, 212, 255, 0.15); border: 1px solid rgba(0, 212, 255, 0.4); color: #00d4ff; padding: 2px 5px; font-size: 9px; font-weight: bold; border-radius: 4px; cursor: pointer;">48h</button>
          </div>

          <div style="margin-top: 10px; display: flex;">
            <button id="btn-deploy-${cityId}" style="background-color: rgba(255, 59, 59, 0.15); border: 1px solid rgba(255, 59, 59, 0.5); color: #ff3b3b; padding: 4px 8px; font-size: 10px; font-weight: bold; border-radius: 4px; cursor: pointer; width: 100%;">🚨 Deploy NDRF Team</button>
          </div>
          
          <div id="predict-text-${cityId}" style="margin-top: 10px; font-size: 10px; color: #e5e7eb; line-height: 1.4; max-height: 120px; overflow-y: auto; background-color: rgba(0,0,0,0.4); padding: 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05); font-family: monospace; display: none;"></div>
        </div>
      `;

      let circle = circlesRef.current[cityId];
      if (circle) {
        // Update circle in-place (Popup stays open!)
        circle.setStyle({
          color: color,
          fillColor: color
        });
        circle.setRadius(radius);

        // ONLY update popup contents if it is closed so we don't wipe out prediction outputs while user reads
        if (!circle.isPopupOpen()) {
          circle.getPopup().setContent(contentString);
        }
      } else {
        // Create new circle
        circle = L.circle([data.lat, data.lng], {
          color: color,
          weight: 1.5,
          fillColor: color,
          fillOpacity: 0.4,
          radius: radius
        }).addTo(map);

        circle.bindPopup(L.popup({
          cityId,
          className: 'custom-leaflet-popup'
        }).setContent(contentString));

        circlesRef.current[cityId] = circle;
      }
    });

  }, [riskScores, alerts]);

  // Flash city circle red on new alert
  useEffect(() => {
    if (alerts.length === 0) return;
    const latestAlert = alerts[0];
    
    // Find matching city
    const match = Object.entries(riskScores).find(
      ([_, c]) => c.cityName.toLowerCase() === latestAlert.city.toLowerCase()
    );

    if (match) {
      const cityId = match[0];
      const circle = circlesRef.current[cityId];
      if (circle) {
        let flashCount = 0;
        const interval = setInterval(() => {
          const color = flashCount % 2 === 0 ? '#ff3b3b' : getScoreColor(riskScores[cityId].score);
          circle.setStyle({
            color: color,
            fillColor: color,
            fillOpacity: flashCount % 2 === 0 ? 0.85 : 0.4
          });
          flashCount++;
          if (flashCount >= 6) {
            clearInterval(interval);
            // Reset style
            circle.setStyle({
              color: getScoreColor(riskScores[cityId].score),
              fillColor: getScoreColor(riskScores[cityId].score),
              fillOpacity: 0.4
            });
          }
        }, 500); // flash every 500ms
      }
    }
  }, [alerts.length]);

  // Handle Heatmap Layer Toggle
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.remove();
      heatmapLayerRef.current = null;
    }

    if (showHeatmap && alerts.length > 0) {
      loadLeafletHeat().then(() => {
        // Weight points based on severity
        const getWeight = (sev) => {
          switch (sev?.toLowerCase()) {
            case 'critical': return 1.0;
            case 'high': return 0.8;
            case 'medium': return 0.6;
            case 'low': return 0.3;
            default: return 0.3;
          }
        };

        const points = alerts.map(a => [
          a.location.lat,
          a.location.lng,
          getWeight(a.severity)
        ]);

        heatmapLayerRef.current = L.heatLayer(points, {
          radius: 25,
          blur: 15,
          maxZoom: 10
        }).addTo(map);
      });
    }
  }, [showHeatmap, alerts]);

  // Circle Pulsing Loop for Critical Zones
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      Object.entries(riskScores).forEach(([cityId, data]) => {
        const circle = circlesRef.current[cityId];
        if (circle && data.score > 70) {
          const currentOpacity = circle.options.fillOpacity;
          circle.setStyle({
            fillOpacity: currentOpacity > 0.3 ? 0.2 : 0.55
          });
        }
      });
    }, 850);

    return () => clearInterval(pulseInterval);
  }, [riskScores]);

  return (
    <div className="flex flex-col h-full bg-cardBg/40 backdrop-blur-md rounded-xl p-4 glow-cyan relative overflow-hidden">
      <div className="absolute inset-0 scan-line pointer-events-none opacity-20"></div>

      {/* Inject styling rules for Leaflet popup dark theming */}
      <style>{`
        .leaflet-popup-content-wrapper {
          background: #111827 !important;
          color: #f3f4f6 !important;
          border: 1px solid rgba(0, 212, 255, 0.25) !important;
          box-shadow: 0 0 15px rgba(0, 212, 255, 0.15) !important;
        }
        .leaflet-popup-tip {
          background: #111827 !important;
          border-left: 1px solid rgba(0, 212, 255, 0.2) !important;
          border-bottom: 1px solid rgba(0, 212, 255, 0.2) !important;
        }
      `}</style>

      <div className="flex items-center justify-between mb-4 border-b border-cyanAccent/10 pb-3 z-10">
        <h2 className="text-sm font-semibold tracking-wider text-cyanAccent uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyanAccent animate-pulse-slow"></span>
          City Risk Map (OpenStreetMap)
        </h2>
        
        {/* Toggle Heatmap */}
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`px-3 py-1 text-[10px] font-black rounded-lg border uppercase tracking-wider transition-all duration-300 ${
            showHeatmap
              ? 'bg-cyanAccent/20 border-cyanAccent text-cyanAccent shadow-cyanGlow'
              : 'bg-darkBg/60 border-gray-800 text-gray-400 hover:text-gray-200'
          }`}
        >
          Heatmap Overlay
        </button>
      </div>

      {/* Map Container */}
      <div className="flex-1 rounded-lg border border-cyanAccent/5 min-h-[360px] relative z-10 overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '360px', background: '#0a0e1a' }} />
      </div>
    </div>
  );
}
