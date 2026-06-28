import { useEffect } from 'react';

export default function ToastAlert({ toasts, removeToast }) {
  return (
    <div className="fixed top-28 right-6 z-[2000] flex flex-col gap-3 pointer-events-none max-w-xs sm:max-w-sm w-full">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const severityColors = {
    Critical: 'border-l-4 border-l-critical bg-critical/10 text-critical',
    High: 'border-l-4 border-l-high bg-high/10 text-high',
    Medium: 'border-l-4 border-l-medium bg-medium/10 text-medium',
    Low: 'border-l-4 border-l-low bg-low/10 text-low',
    default: 'border-l-4 border-l-accentCyan bg-accentCyan/10 text-accentCyan'
  };

  const icons = {
    Flood: '🌊',
    Fire: '🔥',
    Medical: '🚑',
    Accident: '🚗',
    Power: '⚡',
    Structure: '🏗',
    default: '🚨'
  };

  const colorClass = severityColors[toast.severity] || severityColors.default;
  const icon = icons[toast.type] || icons.default;

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between p-4 rounded-r-lg border border-borderGlow/60 backdrop-blur-md shadow-2xl animate-[slideInRight_0.3s_ease-out] ${colorClass}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl animate-bounce">{icon}</span>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-bgPrimary/60 text-white">
              NEW ALERT
            </span>
            <span className="text-[10px] font-extrabold uppercase">
              {toast.severity}
            </span>
          </div>
          <span className="font-display font-bold text-sm text-textPrimary">
            {toast.city} — {toast.type}
          </span>
          <span className="text-xs text-textMuted leading-tight mt-0.5 line-clamp-1">
            {toast.description}
          </span>
        </div>
      </div>
      <button 
        onClick={onClose}
        className="text-textMuted hover:text-white transition-colors cursor-pointer text-lg pl-3"
      >
        ×
      </button>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translate3d(120%, 0, 0);
            opacity: 0;
          }
          to {
            transform: translate3d(0, 0, 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
