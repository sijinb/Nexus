import React, { useEffect, useState } from 'react';
import { Flame, Droplet, Activity, AlertTriangle, Zap, Clock } from 'lucide-react';

export const getAlertIcon = (type) => {
  switch (type?.toLowerCase()) {
    case 'flood':
      return <Droplet className="w-4 h-4 text-cyanAccent" />;
    case 'fire':
      return <Flame className="w-4 h-4 text-criticalRed" />;
    case 'medical':
      return <Activity className="w-4 h-4 text-safeGreen" />;
    case 'accident':
      return <AlertTriangle className="w-4 h-4 text-warningAmber" />;
    case 'power':
    case 'power outage':
      return <Zap className="w-4 h-4 text-yellow-400" />;
    default:
      return <AlertTriangle className="w-4 h-4 text-gray-400" />;
  }
};

export const getSeverityColor = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return '#ff3b3b'; // red
    case 'high':
      return '#ffaa00'; // orange
    case 'medium':
      return '#ffff00'; // yellow
    case 'low':
      return '#00ff88'; // green
    default:
      return '#9ca3af'; // gray
  }
};

export const getSeverityBorderClass = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return 'border-l-criticalRed bg-red-950/10 hover:border-l-red-500';
    case 'high':
      return 'border-l-warningAmber bg-amber-950/10 hover:border-l-amber-500';
    case 'medium':
      return 'border-l-yellow-400 bg-yellow-950/10 hover:border-l-yellow-300';
    case 'low':
      return 'border-l-safeGreen bg-emerald-950/10 hover:border-l-emerald-500';
    default:
      return 'border-l-gray-600 bg-gray-900/40';
  }
};

export const getSeverityBadgeClass = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return 'bg-red-950/60 text-red-400 border-red-500/40';
    case 'high':
      return 'bg-amber-950/60 text-amber-400 border-amber-500/40';
    case 'medium':
      return 'bg-yellow-950/60 text-yellow-400 border-yellow-500/40';
    case 'low':
      return 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40';
    default:
      return 'bg-gray-800 text-gray-400 border-gray-700';
  }
};

const getRelativeTime = (timestamp) => {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
};

export default function AlertFeed({ alerts, onAlertsRefresh }) {
  return (
    <div className="flex flex-col h-full bg-cardBg/40 backdrop-blur-md rounded-xl p-4 glow-cyan">
      <div className="flex items-center justify-between mb-4 border-b border-cyanAccent/10 pb-3">
        <h2 className="text-sm font-semibold tracking-wider text-cyanAccent uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyanAccent animate-pulse-slow"></span>
          Live Alert Feed
        </h2>
        <span className="text-xs text-gray-400 font-mono">{alerts.length} Active</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[calc(100vh-270px)] md:max-h-none">
        {alerts.length === 0 ? (
          <div className="text-center text-gray-600 py-10 text-xs italic">
            No telemetry incidents reported.
          </div>
        ) : (
          alerts.slice(0, 15).map((alert) => {
            const borderClass = getSeverityBorderClass(alert.severity);
            const badgeClass = getSeverityBadgeClass(alert.severity);
            return (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border border-l-4 border-gray-800/80 transition-all duration-300 transform animate-slide-in ${borderClass}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-darkBg/60 border border-cyanAccent/10 rounded">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-gray-200 uppercase leading-none">
                        {alert.city}
                      </h3>
                      <span className="text-[10px] text-cyanAccent/80 font-mono">
                        {alert.type}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${badgeClass}`}
                  >
                    {alert.severity}
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-normal line-clamp-2" title={alert.description}>
                  {alert.description}
                </p>
                <div className="flex items-center gap-1 text-[9px] text-gray-500 font-bold mt-2">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{getRelativeTime(alert.timestamp)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
