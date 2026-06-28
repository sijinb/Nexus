import React, { useEffect, useState } from 'react';
import { Activity, Cpu, Clock, Map, CheckCircle } from 'lucide-react';

export default function MetricsBar({ apiHost, activeIncidentsCount }) {
  const [stats, setStats] = useState({
    totalAlerts: activeIncidentsCount,
    aiDecisions: 0,
    activeCities: 0,
    avgResponseTime: 4.2
  });

  const fetchStats = async () => {
    try {
      const response = await fetch(`${apiHost}/api/ai/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch metrics stats:', err.message);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // poll every 10 seconds
    return () => clearInterval(interval);
  }, [apiHost]);

  // Keep totalAlerts reactive to immediate props updates
  const displayAlerts = activeIncidentsCount !== undefined ? activeIncidentsCount : stats.totalAlerts;

  const items = [
    {
      label: "Active Incidents",
      value: displayAlerts,
      icon: <Activity className="w-4 h-4 text-cyanAccent animate-pulse-slow" />,
    },
    {
      label: "AI Decisions Made",
      value: stats.aiDecisions,
      icon: <Cpu className="w-4 h-4 text-cyanAccent" />,
    },
    {
      label: "Avg Response Time",
      value: `${stats.avgResponseTime} min`,
      icon: <Clock className="w-4 h-4 text-cyanAccent" />,
    },
    {
      label: "Cities Monitored",
      value: "20",
      icon: <Map className="w-4 h-4 text-cyanAccent" />,
    },
    {
      label: "Resolution Rate",
      value: "94%",
      icon: <CheckCircle className="w-4 h-4 text-safeGreen" />,
    }
  ];

  return (
    <div className="w-full bg-cardBg/40 backdrop-blur-md rounded-xl p-4 glow-cyan flex flex-wrap items-center justify-between gap-6">
      <div className="flex flex-wrap gap-8 md:gap-16 w-full md:w-auto justify-between md:justify-start">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="p-2 bg-darkBg/60 border border-cyanAccent/10 rounded-lg">
              {item.icon}
            </div>
            <div>
              <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black block mb-0.5">
                {item.label}
              </span>
              <span className="text-base font-black text-gray-200 tracking-tight">
                {item.value}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="text-[9px] text-gray-600 font-mono tracking-widest uppercase w-full md:w-auto text-right mt-2 md:mt-0">
        NEXUS India Operations Console • Telemetry Secured
      </div>
    </div>
  );
}
