import { useState } from 'react';
import PageTransition from '../components/PageTransition';

export default function Guide() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [faqOpenIndex, setFaqOpenIndex] = useState(null);

  const toggleFaq = (index) => {
    setFaqOpenIndex(faqOpenIndex === index ? null : index);
  };

  const featureCards = [
    { icon: '🗺', title: 'REAL-TIME MAPPING', text: '20 Indian cities monitored live. Risk zones update every 15 seconds using real weather data from Open-Meteo.' },
    { icon: '🤖', title: 'GEMINI AI INTEL', text: 'Powered by Google Gemini 1.5 Flash — advanced AI that understands Indian emergency context, NDRF protocols, and monsoons.' },
    { icon: '📡', title: 'LIVE DATA FUSION', text: 'Citizen reports + Open-Meteo weather + historical incident patterns combined into a single risk score per city in real time.' },
    { icon: '🌐', title: 'MULTILINGUAL', text: 'Report emergencies in 7 Indian languages. AI classifies, translates, and routes your report within 3 seconds.' }
  ];

  const faqs = [
    { q: "Is NEXUS a government system?", a: "NEXUS is an independent AI platform demonstrating next-generation emergency management for India. It uses publicly available data sources and public safety feeds." },
    { q: "How accurate are the AI predictions?", a: "Gemini 1.5 Flash analyzes real weather data and active incidents. Accuracy improves with more citizen reports. A confidence score is shown with every response." },
    { q: "What happens after I submit a report?", a: "Your report is AI-classified within 3 seconds, added to the live dashboard, and a tracking ID is issued. Local SDMA and NDRF channels receive alert notifications." },
    { q: "Which languages are supported?", a: "English, Hindi, Tamil, Telugu, Malayalam, Bengali, Kannada. More languages can be added based on regional requirements." },
    { q: "How is my location data used?", a: "Only to tag your emergency report to the correct city coordinates and show nearby incidents. Location data is not stored permanently." },
    { q: "What is NDRF?", a: "National Disaster Response Force — India's specialized disaster response agency under the Ministry of Home Affairs." }
  ];

  return (
    <PageTransition>
      <div className="w-full max-w-5xl text-left flex flex-col gap-10">
        
        {/* HERO Section */}
        <div className="relative overflow-hidden bg-bgCard border border-borderGlow rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4 shadow-2xl min-h-[250px] scanline-overlay">
          
          {/* Concentric CSS pulsing circles radiating */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-accentCyan/10 animate-pulse-ring pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-accentCyan/5 animate-pulse-ring pointer-events-none [animation-delay:0.6s]" />

          {/* Title */}
          <h1 className="font-display font-extrabold text-4xl text-accentCyan tracking-wider uppercase z-10 leading-none">
            HOW NEXUS WORKS
          </h1>
          <p className="text-sm font-semibold tracking-widest text-textMuted uppercase z-10 max-w-md mt-1 leading-snug">
            India's first AI-powered national emergency intelligence platform
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featureCards.map((feat, idx) => (
            <div key={idx} className="nexus-card p-5 flex flex-col gap-2 relative">
              <span className="text-3xl animate-float">{feat.icon}</span>
              <span className="font-display font-bold text-xs text-accentCyan tracking-wider uppercase mt-1">
                {feat.title}
              </span>
              <p className="text-xs text-textMuted leading-relaxed mt-1 font-medium">
                {feat.text}
              </p>
            </div>
          ))}
        </div>

        {/* How to Use Tabbed instructions */}
        <div className="flex flex-col gap-4">
          <span className="font-display font-bold text-sm text-accentCyan tracking-wider">
            ⚙ OPERATIONAL GUIDE
          </span>
          <div className="bg-bgCard border border-borderGlow rounded-lg p-5 flex flex-col gap-5 shadow-lg">
            
            {/* Tabs Selector */}
            <div className="flex border-b border-borderGlow/40 pb-2.5 gap-2">
              {['dashboard', 'incidents', 'ai', 'report'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-bold rounded cursor-pointer capitalize transition-all ${
                    activeTab === tab
                      ? 'bg-accentCyan text-bgPrimary font-bold shadow'
                      : 'text-textMuted hover:text-white'
                  }`}
                >
                  {tab === 'ai' ? 'AI Command' : tab === 'report' ? 'Report Emergency' : tab}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            {activeTab === 'dashboard' && (
              <div className="flex flex-col gap-3 text-xs leading-relaxed font-medium">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accentCyan/15 text-accentCyan border border-accentCyan/30 flex items-center justify-center font-bold">1</span>
                  <p className="text-textPrimary">The central map displays 20 registered cities as colored indicators. Red/orange marks critical risk; green represents stable zones.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accentCyan/15 text-accentCyan border border-accentCyan/30 flex items-center justify-center font-bold">2</span>
                  <p className="text-textPrimary">Indicator marker sizes correspond directly to city populations, assisting with density threat assessments.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accentCyan/15 text-accentCyan border border-accentCyan/30 flex items-center justify-center font-bold">3</span>
                  <p className="text-textPrimary">Click on city markers to view live meteorological forecasts, active counts, and access forecast query tools.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accentCyan/15 text-accentCyan border border-accentCyan/30 flex items-center justify-center font-bold">4</span>
                  <p className="text-textPrimary">Toggle the Heatmap widget to render incident density concentrations across different regions.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accentCyan/15 text-accentCyan border border-accentCyan/30 flex items-center justify-center font-bold">5</span>
                  <p className="text-textPrimary">Click "Live Demo" to trigger the automated emergency response simulation hands-free.</p>
                </div>
              </div>
            )}

            {activeTab === 'incidents' && (
              <div className="flex flex-col gap-3 text-xs leading-relaxed font-medium">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accentCyan/15 text-accentCyan border border-accentCyan/30 flex items-center justify-center font-bold">1</span>
                  <p className="text-textPrimary">The incident feed aggregates all active dispatch logs sorted by timestamp.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accentCyan/15 text-accentCyan border border-accentCyan/30 flex items-center justify-center font-bold">2</span>
                  <p className="text-textPrimary">Filter active incidents using search text fields, category pills, or severity colors.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accentCyan/15 text-accentCyan border border-accentCyan/30 flex items-center justify-center font-bold">3</span>
                  <p className="text-textPrimary">Click "AI Analyze" on any card to slide down a live, context-specific dispatch response advisor.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accentCyan/15 text-accentCyan border border-accentCyan/30 flex items-center justify-center font-bold">4</span>
                  <p className="text-textPrimary">Execute resource deployments directly from the dropdown to notify local SDRF/NDRF/Ambulance teams.</p>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="flex flex-col gap-3 text-xs leading-relaxed font-medium">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accentCyan/15 text-accentCyan border border-accentCyan/30 flex items-center justify-center font-bold">1</span>
                  <p className="text-textPrimary">Select your forecast window pill (4h, 12h, 24h, or 48h) to frame meteorological projections.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accentCyan/15 text-accentCyan border border-accentCyan/30 flex items-center justify-center font-bold">2</span>
                  <p className="text-textPrimary">Filter queries to specific city bounds or select All India for a national situation overview.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accentCyan/15 text-accentCyan border border-accentCyan/30 flex items-center justify-center font-bold">3</span>
                  <p className="text-textPrimary">Click Quick Command prompts to trigger preset meteorological, flood, or deployment analyses.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accentCyan/15 text-accentCyan border border-accentCyan/30 flex items-center justify-center font-bold">4</span>
                  <p className="text-textPrimary">Export generated command assessments directly to PDF using the export utilities.</p>
                </div>
              </div>
            )}

            {activeTab === 'report' && (
              <div className="flex flex-col gap-3 text-xs leading-relaxed font-medium">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accentCyan/15 text-accentCyan border border-accentCyan/30 flex items-center justify-center font-bold">1</span>
                  <p className="text-textPrimary">Select from 7 Indian language buttons to localize labels, voice cues, and placeholder contexts.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accentCyan/15 text-accentCyan border border-accentCyan/30 flex items-center justify-center font-bold">2</span>
                  <p className="text-textPrimary">Click "Detect My Location" to fetch GPS coordinates and reverse-geocode the address via Nominatim.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accentCyan/15 text-accentCyan border border-accentCyan/30 flex items-center justify-center font-bold">3</span>
                  <p className="text-textPrimary">Use the voice input recording tool to dictate incident descriptions hands-free.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-accentCyan/15 text-accentCyan border border-accentCyan/30 flex items-center justify-center font-bold">4</span>
                  <p className="text-textPrimary">Submit to trigger immediate Gemini classification. The system will issue a tracking ID for registry logging.</p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Risk Score Formula section */}
        <div className="flex flex-col gap-4">
          <span className="font-display font-bold text-sm text-accentCyan tracking-wider">
            📊 RISK CALCULATION ENGINE
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            
            {/* Visual Formula Panel */}
            <div className="bg-bgCard border border-borderGlow rounded-lg p-5 flex flex-col justify-center shadow-lg">
              <span className="text-xs font-bold text-textMuted uppercase tracking-wider mb-3">
                RISK SCORE EQUATION WEIGHTS
              </span>
              <div className="border border-borderGlow/60 rounded overflow-hidden flex flex-col text-xs font-semibold">
                <div className="flex justify-between p-3 border-b border-borderGlow/40 bg-bgPrimary/30">
                  <span className="text-textPrimary flex items-center gap-1.5">🌧 Weather Telemetry (Rain/Wind)</span>
                  <span className="text-accentCyan font-bold">35%</span>
                </div>
                <div className="flex justify-between p-3 border-b border-borderGlow/40 bg-bgPrimary/30">
                  <span className="text-textPrimary flex items-center gap-1.5">⚡ Active Monitored Incidents</span>
                  <span className="text-accentCyan font-bold">40%</span>
                </div>
                <div className="flex justify-between p-3 border-b border-borderGlow/40 bg-bgPrimary/30">
                  <span className="text-textPrimary flex items-center gap-1.5">🏙 Population Density Factor</span>
                  <span className="text-accentCyan font-bold">15%</span>
                </div>
                <div className="flex justify-between p-3 bg-bgPrimary/30">
                  <span className="text-textPrimary flex items-center gap-1.5">📅 Seasonal Adjustment (Monsoon)</span>
                  <span className="text-accentCyan font-bold">10%</span>
                </div>
              </div>
            </div>

            {/* Color Legend Panel */}
            <div className="bg-bgCard border border-borderGlow rounded-lg p-5 flex flex-col gap-3.5 shadow-lg justify-center">
              <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
                RISK THRESHOLDS & STATUS
              </span>
              <div className="flex flex-col gap-2.5 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-low" />
                  <span className="text-low">0–30 LOW:</span>
                  <span className="text-textMuted">Standard operating conditions. Routine patrol monitoring.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-medium" />
                  <span className="text-medium">31–50 MODERATE:</span>
                  <span className="text-textMuted">Elevated meteorological risks. Standby communications active.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-high" />
                  <span className="text-high">51–70 HIGH:</span>
                  <span className="text-textMuted">SDRF staging teams alerted. Preparation for deployment.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-critical" />
                  <span className="text-critical">71–100 CRITICAL:</span>
                  <span className="text-textMuted">Emergency evacuations active. NDRF staging active.</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Accordion FAQ Widget */}
        <div className="flex flex-col gap-4">
          <span className="font-display font-bold text-sm text-accentCyan tracking-wider">
            ❓ FREQUENTLY ASKED QUESTIONS
          </span>
          <div className="flex flex-col gap-2">
            {faqs.map((faq, idx) => {
              const isOpen = faqOpenIndex === idx;
              return (
                <div key={idx} className="bg-bgCard border border-borderGlow rounded-lg overflow-hidden transition-all duration-200">
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-4 flex justify-between items-center text-xs font-bold text-textPrimary hover:text-accentCyan transition-colors cursor-pointer select-none text-left"
                  >
                    <span>{faq.q}</span>
                    <span className="text-textMuted font-mono text-sm leading-none">
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-textMuted leading-relaxed border-t border-borderGlow/25 pt-2 animate-slide-in-top">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Helplines Numbers list */}
        <div className="flex flex-col gap-4">
          <span className="font-display font-bold text-sm text-accentCyan tracking-wider">
            🚨 EMERGENCY CONTACT HOTLINES
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'National Disaster Helpline', num: '1078' },
              { label: 'NDRF Control Room', num: '011-24363260' },
              { label: 'Police Control', num: '100' },
              { label: 'Fire Service', num: '101' },
              { label: 'Ambulance', num: '108' },
              { label: 'State Disaster Mgmt', num: '1070' },
              { label: 'District Control Room', num: '1077' },
              { label: 'Women Helpline', num: '1091' },
              { label: 'Child Helpline', num: '1098' }
            ].map((hp, idx) => (
              <div key={idx} className="bg-bgCard border border-borderGlow/60 p-3 rounded-lg flex flex-col gap-1 shadow">
                <span className="text-[10px] text-textMuted uppercase font-bold tracking-wider leading-tight">
                  {hp.label}
                </span>
                <span className="font-display font-extrabold text-base text-accentCyan tracking-wide">
                  {hp.num}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </PageTransition>
  );
}
