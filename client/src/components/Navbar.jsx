import { useState, useEffect } from 'react';

export default function Navbar({ activeTab, setActiveTab, activeAlertsCount }) {
  const [istTime, setIstTime] = useState('');

  // Update IST clock every second
  useEffect(() => {
    const updateTime = () => {
      const options = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      setIstTime(formatter.format(new Date()) + ' IST');
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🗺' },
    { id: 'incidents', label: 'Incidents', icon: '⚡' },
    { id: 'ai', label: 'AI Command', icon: '🤖' },
    { id: 'report', label: 'Report', icon: '📋' },
    { id: 'guide', label: 'Guide', icon: '📖' }
  ];

  return (
    <nav className="fixed top-0 left-0 w-full h-16 bg-bgSecondary border-b border-borderGlow flex items-center justify-between px-6 z-[1000] select-none">
      {/* Left: Brand Logo & Subtitle */}
      <div className="flex flex-col cursor-pointer" onClick={() => setActiveTab('dashboard')}>
        <div className="flex items-center gap-2">
          {/* Logo SVG inline */}
          <svg className="w-7 h-7 text-accentCyan animate-float" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 12 L82 22 V50 C82 69 68 84 50 89 C32 84 18 69 18 50 V22 Z" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
            <path d="M28 50 H42 L47 35 L53 65 L58 50 H72" stroke="#7c3aed" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="50" cy="50" r="4" fill="currentColor" />
          </svg>
          <span className="font-display font-bold text-2xl tracking-wider bg-gradient-to-r from-accentCyan to-accentPurple bg-clip-text text-transparent">
            NEXUS
          </span>
        </div>
        <span className="text-[8px] font-semibold tracking-[0.2em] text-textMuted uppercase -mt-0.5 leading-none">
          NATIONAL EMERGENCY INTELLIGENCE
        </span>
      </div>

      {/* Center: Nav Tabs */}
      <div className="flex items-center gap-1.5">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-3.5 py-1.5 mx-0.5 rounded-md flex items-center gap-2 text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer border ${
                isActive
                  ? 'bg-accentCyan/15 border-accentCyan text-accentCyan shadow-[0_0_10px_rgba(0,212,255,0.2)]'
                  : 'bg-bgPrimary/50 border-borderGlow/70 text-gray-300 hover:text-white hover:border-accentCyan/40 hover:bg-bgCard/60'
              }`}
            >
              <span>{item.icon}</span>
              <span className="font-display font-bold uppercase tracking-wider">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Telemetry & IST Clock */}
      <div className="flex items-center gap-5">
        {/* Active alert indicator */}
        <div 
          onClick={() => setActiveTab('incidents')}
          className="flex items-center gap-2 bg-critical/10 border border-critical/30 px-3 py-1 rounded-full text-xs font-bold text-critical hover:bg-critical/20 transition-all cursor-pointer select-none"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-critical opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-critical"></span>
          </span>
          <span>{activeAlertsCount} ALERTS</span>
        </div>

        {/* System status */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-[11px] font-bold text-low animate-glow-pulse">
          <span>●</span>
          <span className="tracking-wider">OPERATIONAL</span>
        </div>

        {/* IST Clock */}
        <div className="font-display font-medium text-sm text-textPrimary bg-bgCard/70 border border-borderGlow px-4 py-1 rounded-md min-w-[120px] text-center shadow-inner">
          {istTime}
        </div>
      </div>
    </nav>
  );
}
