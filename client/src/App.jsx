import { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import StatusBar from './components/StatusBar';
import ToastAlert from './components/ToastAlert';

// Pages
import Dashboard from './pages/Dashboard';
import Incidents from './pages/Incidents';
import AICommand from './pages/AICommand';
import Report from './pages/Report';
import Guide from './pages/Guide';

// API
import { getAlerts, getStats } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Navigation contextual routing states
  const [preselectedCityId, setPreselectedCityId] = useState('');
  const [filterCityId, setFilterCityId] = useState('');

  // Telemetry States
  const [alerts, setAlerts] = useState([]);
  const [aiDecisionsCount, setAiDecisionsCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  
  const knownAlertIds = useRef(new Set());
  const isFirstLoad = useRef(true);

  // Expose global navigation helpers for Leaflet Popup binding
  useEffect(() => {
    window.nexusPredict = (cityId) => {
      setPreselectedCityId(cityId);
      setActiveTab('ai');
    };

    window.nexusIncidents = (cityId) => {
      setFilterCityId(cityId);
      setActiveTab('incidents');
    };

    return () => {
      delete window.nexusPredict;
      delete window.nexusIncidents;
    };
  }, []);

  // Poll alerts and stats
  const pollTelemetry = async () => {
    try {
      // 1. Fetch Alerts
      const activeAlerts = await getAlerts(false); // active only
      setAlerts(activeAlerts);

      // Check for new alerts to trigger toasts
      const currentIds = new Set(activeAlerts.map(a => a.id));
      
      if (!isFirstLoad.current) {
        // Trigger toast for any alert ID we haven't seen yet
        activeAlerts.forEach(alert => {
          if (!knownAlertIds.current.has(alert.id)) {
            triggerToast(alert);
          }
        });
      } else {
        isFirstLoad.current = false;
      }

      knownAlertIds.current = currentIds;

      // 2. Fetch Stats
      const statistics = await getStats();
      setAiDecisionsCount(statistics.aiDecisions || 0);

    } catch (err) {
      console.warn('Telemetry polling error:', err.message);
    }
  };

  useEffect(() => {
    pollTelemetry();
    const interval = setInterval(pollTelemetry, 5000); // 5s interval
    return () => clearInterval(interval);
  }, []);

  const triggerToast = (alert) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, {
      id,
      city: alert.city,
      type: alert.type,
      severity: alert.severity,
      description: alert.description
    }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Nav item content dispatcher
  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            alerts={alerts} 
            triggerToast={triggerToast}
          />
        );
      case 'incidents':
        return (
          <Incidents 
            initialFilterCityId={filterCityId} 
            clearCityFilter={() => setFilterCityId('')}
            alerts={alerts}
            setAlerts={setAlerts}
            triggerToast={triggerToast}
          />
        );
      case 'ai':
        return (
          <AICommand 
            preselectedCityId={preselectedCityId} 
            clearPreselectedCity={() => setPreselectedCityId('')}
            alerts={alerts}
          />
        );
      case 'report':
        return (
          <Report 
            setActiveTab={setActiveTab}
          />
        );
      case 'guide':
        return <Guide />;
      default:
        return <Dashboard alerts={alerts} triggerToast={triggerToast} />;
    }
  };

  return (
    <div className="min-h-screen bg-bgPrimary text-textPrimary font-sans selection:bg-accentCyan/30 selection:text-white antialiased">
      {/* Persistent Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        activeAlertsCount={alerts.length}
      />
      <StatusBar 
        activeAlertsCount={alerts.length} 
        aiDecisionsCount={aiDecisionsCount}
      />

      {/* Floating HUD Toasts */}
      <ToastAlert toasts={toasts} removeToast={removeToast} />

      {/* Active Page View */}
      {renderActivePage()}
    </div>
  );
}
