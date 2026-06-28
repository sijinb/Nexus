import { useState, useEffect } from 'react';

export default function StatusBar({ activeAlertsCount, aiDecisionsCount }) {
  const [uptimeSeconds, setUptimeSeconds] = useState(0);

  // Increment uptime counter
  useEffect(() => {
    const timer = setInterval(() => {
      setUptimeSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const tickerText = `ACTIVE INCIDENTS: ${activeAlertsCount}   |   AI DECISIONS: ${aiDecisionsCount}   |   CITIES MONITORED: 20   |   AVG RESPONSE: 4.2 MIN   |   RESOLUTION RATE: 94%   |   NEXUS UPTIME: ${formatUptime(uptimeSeconds)}`;

  return (
    <div className="fixed top-16 left-0 w-full h-9 bg-bgSecondary/90 border-b border-borderGlow/70 flex items-center overflow-hidden z-[999] select-none">
      {/* Ticker Container */}
      <div className="relative w-full h-full flex items-center">
        {/* We double the text for a seamless marquee loop */}
        <div className="absolute whitespace-nowrap text-xs font-semibold tracking-widest text-accentCyan flex gap-32 animate-[ticker_35s_linear_infinite]">
          <span>{tickerText}</span>
          <span>{tickerText}</span>
          <span>{tickerText}</span>
        </div>
      </div>

      <style>{`
        @keyframes ticker {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-33.333%, 0, 0);
          }
        }
      `}</style>
    </div>
  );
}
