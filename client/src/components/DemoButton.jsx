import React, { useState } from 'react';
import { Play } from 'lucide-react';

export default function DemoButton({ 
  mapRef, 
  apiHost, 
  onSimulateAlert, 
  onAutoTypeQuery, 
  onShowToast 
}) {
  const [isDemoRunning, setIsDemoRunning] = useState(false);

  const runDemoSequence = async () => {
    if (isDemoRunning) return;
    setIsDemoRunning(true);
    
    // Helper to log steps
    const logStep = (step, msg) => console.log(`[DEMO STEP ${step}] ${msg}`);

    // --- STEP 1: POST Mumbai Flood (Critical) [0s] ---
    logStep(1, "Simulating Mumbai flood alert...");
    await onSimulateAlert({
      type: "Flood",
      city: "Mumbai",
      lat: 19.0390,
      lng: 72.8550,
      severity: "Critical",
      description: "Critical monsoonal flooding in Dharavi and Kurla. Mithi River overflow threatening residential corridors. High-intensity dewatering needed."
    });

    // --- STEP 2: Map flies to Mumbai [2s] ---
    setTimeout(() => {
      logStep(2, "Map panning and zooming to Mumbai...");
      if (mapRef && mapRef.current) {
        mapRef.current.panTo({ lat: 19.0760, lng: 72.8777 });
        mapRef.current.setZoom(10);
      }
    }, 2000);

    // --- STEP 3: Mumbai circle flashes red [3s] ---
    setTimeout(() => {
      logStep(3, "Triggering Mumbai circle alert flash...");
      // MapView automatically flashes circles on new alerts, which starts at Step 1/2.
    }, 3000);

    // --- STEP 4: Auto-type query in AI Console [4s] ---
    setTimeout(() => {
      logStep(4, "Auto-typing flood mitigation query...");
      onAutoTypeQuery("Mumbai is showing critical flood levels in Dharavi. What immediate actions should NDRF and MCGM take?");
    }, 4000);

    // --- STEP 5: Trigger AI stream [5s] ---
    // AI Console auto-submits when typing finishes. (Typing takes ~3-4 seconds, submits around 7-8s).

    // --- STEP 6: POST Chennai Power Failure (High) [14s] ---
    setTimeout(async () => {
      logStep(6, "Simulating Chennai power grid failure...");
      await onSimulateAlert({
        type: "Power",
        city: "Chennai",
        lat: 13.0569,
        lng: 80.2425,
        severity: "High",
        description: "Power grid failure affecting Salt Lake sector and Adyar substation. Municipal pumps offline. Wind speeds rising."
      });
    }, 14000);

    // --- STEP 7: Map flies to Chennai [16s] ---
    setTimeout(() => {
      logStep(7, "Map panning and zooming to Chennai...");
      if (mapRef && mapRef.current) {
        mapRef.current.panTo({ lat: 13.0827, lng: 80.2707 });
        mapRef.current.setZoom(10);
      }
    }, 16000);

    // --- STEP 8: Auto-type prediction query [18s] ---
    setTimeout(() => {
      logStep(8, "Auto-typing Eastern corridor risk forecast...");
      onAutoTypeQuery("Predict risk across the eastern coastal corridor for the next 4 hours given the active incidents");
    }, 18000);

    // --- STEP 9: Trigger AI prediction stream [19s] ---
    // Handled by AI Console typing submission.

    // --- STEP 10: Map zooms back to India view [28s] ---
    setTimeout(() => {
      logStep(10, "Map returning to overview zoom of India...");
      if (mapRef && mapRef.current) {
        mapRef.current.panTo({ lat: 20.5937, lng: 78.9629 });
        mapRef.current.setZoom(5);
      }
    }, 28000);

    // --- STEP 11: Show toast [30s] ---
    setTimeout(() => {
      logStep(11, "Demo sequence successfully completed.");
      onShowToast("DEMO COMPLETE — NEXUS operational across 20 Indian cities");
      setIsDemoRunning(false);
    }, 30000);
  };

  return (
    <button
      onClick={runDemoSequence}
      disabled={isDemoRunning}
      className={`fixed bottom-24 right-8 z-30 flex items-center justify-center gap-2 px-5 py-3 rounded-full text-white font-bold text-xs uppercase tracking-widest shadow-2xl transition-all duration-300 transform hover:scale-[1.03] border ${
        isDemoRunning
          ? 'bg-gray-800 border-gray-700 cursor-not-allowed opacity-50'
          : 'bg-criticalRed hover:bg-red-600 border-red-500 shadow-red-500/20'
      }`}
    >
      <span className={`w-2.5 h-2.5 rounded-full bg-white ${isDemoRunning ? '' : 'animate-ping'}`}></span>
      <Play className="w-3.5 h-3.5 fill-white" />
      {isDemoRunning ? 'Running Demo...' : '● Demo Mode'}
    </button>
  );
}
