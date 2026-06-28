import { useState, useEffect, useRef } from 'react';
import PageTransition from '../components/PageTransition';
import { jsPDF } from 'jspdf';

// API
import { analyzeAI } from '../api';

const CITIES_LIST = [
  { id: "all", name: "🌐 All India" },
  { id: "delhi", name: "Delhi NCR" },
  { id: "mumbai", name: "Mumbai" },
  { id: "bengaluru", name: "Bengaluru" },
  { id: "hyderabad", name: "Hyderabad" },
  { id: "chennai", name: "Chennai" },
  { id: "kolkata", name: "Kolkata" },
  { id: "pune", name: "Pune" },
  { id: "ahmedabad", name: "Ahmedabad" },
  { id: "jaipur", name: "Jaipur" },
  { id: "lucknow", name: "Lucknow" },
  { id: "kochi", name: "Kochi" },
  { id: "chandigarh", name: "Chandigarh" },
  { id: "bhopal", name: "Bhopal" },
  { id: "nagpur", name: "Nagpur" },
  { id: "patna", name: "Patna" },
  { id: "bhubaneswar", name: "Bhubaneswar" },
  { id: "guwahati", name: "Guwahati" },
  { id: "surat", name: "Surat" },
  { id: "amritsar", name: "Amritsar" },
  { id: "coimbatore", name: "Coimbatore" }
];

export default function AICommand({ preselectedCityId, clearPreselectedCity, alerts }) {
  // Config states
  const [forecastHours, setForecastHours] = useState(24);
  const [focusCityId, setFocusCityId] = useState('all');
  const [queryText, setQueryText] = useState('');
  
  // History & Typewriter States
  const [queryHistory, setQueryHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rawOutput, setRawOutput] = useState('');
  const [streamedText, setStreamedText] = useState('');
  const [confidence, setConfidence] = useState('94');

  const typewriterIntervalRef = useRef(null);

  // Sync city selection from map circle triggers
  useEffect(() => {
    if (preselectedCityId) {
      setFocusCityId(preselectedCityId);
      clearPreselectedCity(); // consume state
    }
  }, [preselectedCityId]);

  // Clean typewriter on unmount
  useEffect(() => {
    return () => {
      if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
    };
  }, []);

  const quickCommands = [
    { icon: '🌊', label: 'Flood Risk Assessment', query: 'Perform an in-depth flood vulnerability risk analysis considering recent heavy precipitation rates and drainage blockages.' },
    { icon: '🔥', label: 'Fire Hazard Analysis', query: 'Evaluate active commercial/industrial structure fire risks and response capabilities.' },
    { icon: '🏥', label: 'Medical Resource Status', query: 'Analyze regional hospital casualty bed availability and medical center response statuses.' },
    { icon: '⚡', label: 'Power Grid Vulnerability', query: 'Check utility power grid failure points and substation backup generator operations.' },
    { icon: '🚨', label: 'Priority Deployment Plan', query: 'Formulate an NDRF staging staging plan for deployment to high-threat locations.' },
    { icon: '📊', label: 'Full Situation Report', query: 'Generate a comprehensive situation assessment and emergency summary.' },
    { icon: '🌧', label: 'Monsoon Impact Analysis', query: 'Analyze monsoon weather movements and active warnings.' },
    { icon: '🏙', label: 'Urban Density Risk', query: 'Detail risk factors for high density metro areas.' }
  ];

  // SSE Stream Dispatcher
  const handleAnalyze = async (customQuery = '') => {
    const activeQuery = customQuery || queryText;
    if (!activeQuery.trim()) return;

    setIsLoading(true);
    setRawOutput('');
    setStreamedText('');
    
    // Manage query history
    setQueryHistory(prev => {
      const filtered = prev.filter(q => q !== activeQuery);
      return [activeQuery, ...filtered].slice(0, 5);
    });

    try {
      let tempRaw = '';
      await analyzeAI(
        activeQuery,
        forecastHours,
        focusCityId,
        null, // no single incident focus
        (chunk) => {
          tempRaw += chunk;
          setRawOutput(tempRaw);
        },
        () => {
          setIsLoading(false);
          triggerTypewriter(tempRaw);
        },
        (err) => {
          console.error(err);
          setIsLoading(false);
          setStreamedText('System Error: Failed to receive stream response from Google Gemini. Verify connections.');
        }
      );
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  // Run Typewriter reveal
  const triggerTypewriter = (fullText) => {
    if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
    
    let charIndex = 0;
    setStreamedText('');

    typewriterIntervalRef.current = setInterval(() => {
      if (charIndex < fullText.length) {
        // grab index chunk to avoid slow performance
        const chunk = fullText.slice(0, charIndex + 2);
        setStreamedText(chunk);
        charIndex += 2;
      } else {
        setStreamedText(fullText);
        clearInterval(typewriterIntervalRef.current);
      }
    }, 15);
  };

  // Parse sections out of output text
  const parseSections = (text) => {
    const sections = {
      threat: '',
      risk: '',
      actions: '',
      outlook: '',
      raw: text
    };

    const threatMatch = text.match(/🔴 THREAT ASSESSMENT([\s\S]*?)(?=📊 RISK ANALYSIS|✅ RECOMMENDED ACTIONS|⏱|🎯|$)/i);
    const riskMatch = text.match(/📊 RISK ANALYSIS([\s\S]*?)(?=✅ RECOMMENDED ACTIONS|⏱|🎯|$)/i);
    const actionsMatch = text.match(/✅ RECOMMENDED ACTIONS([\s\S]*?)(?=⏱|🎯|$)/i);
    const outlookMatch = text.match(/⏱[^]*?OUTLOOK([\s\S]*?)(?=🎯|$)/i) || text.match(/⏱[\s\S]*?([\s\S]*?)(?=🎯|$)/i);
    const confidenceMatch = text.match(/🎯 CONFIDENCE:\s*(\d+)%/i) || text.match(/CONFIDENCE:\s*(\d+)%/i);

    if (threatMatch) sections.threat = threatMatch[1].trim();
    if (riskMatch) sections.risk = riskMatch[1].trim();
    if (actionsMatch) sections.actions = actionsMatch[1].trim();
    if (outlookMatch) sections.outlook = outlookMatch[1].trim();
    if (confidenceMatch && confidence !== confidenceMatch[1]) {
      // Sync state out of rendering cycle
      setTimeout(() => setConfidence(confidenceMatch[1]), 50);
    }

    // If none matched, mark it as raw
    if (!sections.threat && !sections.risk && !sections.actions && !sections.outlook) {
      sections.raw = text;
    } else {
      sections.raw = '';
    }

    return sections;
  };

  const sections = parseSections(streamedText);

  // Copy full output to clipboard
  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(streamedText);
    alert('Intelligence Report copied to clipboard!');
  };

  // Export report to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(5, 10, 20); // deep background
    doc.rect(0, 0, 210, 297, 'F');

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(0, 212, 255); // Cyan
    doc.text("NEXUS EMERGENCY INTEL REPORT", 14, 25);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`MONITORED CITY: ${CITIES_LIST.find(c => c.id === focusCityId)?.name || 'All India'} | DATETIME: ${new Date().toLocaleString()}`, 14, 32);
    doc.text(`FORECAST HORIZON: ${forecastHours} HOURS | GEMINI CONFIDENCE: ${confidence}%`, 14, 37);

    doc.setDrawColor(26, 58, 92);
    doc.setLineWidth(0.5);
    doc.line(14, 42, 196, 42);

    doc.setFontSize(10);
    doc.setTextColor(226, 232, 240);

    const splitQuery = doc.splitTextToSize(`QUERY REQUEST: "${queryText || 'System Check'}"`, 180);
    doc.text(splitQuery, 14, 50);

    doc.line(14, 58, 196, 58);

    const splitReport = doc.splitTextToSize(streamedText, 180);
    doc.text(splitReport, 14, 68);

    doc.save(`NEXUS-INTEL-${focusCityId}-${forecastHours}h.pdf`);
  };

  // Map Navigation Link
  const handleNavigateMap = () => {
    const navTabs = document.getElementsByTagName('button');
    for (let btn of navTabs) {
      if (btn.innerText.includes('Dashboard')) {
        btn.click();
        break;
      }
    }
  };

  return (
    <PageTransition>
      <div className="w-full max-w-6xl h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6 text-left items-stretch">
        
        {/* LEFT PANEL: Scrollable Form and Quick Commands */}
        <div className="w-full md:w-[38%] bg-bgCard border border-borderGlow rounded-lg p-5 flex flex-col gap-4 overflow-y-auto scrollbar-thin shadow-xl">
          
          {/* Section A: Forecast Horizon */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
              FORECAST WINDOW
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[4, 12, 24, 48].map(h => (
                <button
                  key={h}
                  id={`forecast-pill-${h}`}
                  onClick={() => setForecastHours(h)}
                  className={`py-2 text-xs font-bold rounded cursor-pointer border transition-all ${
                    forecastHours === h
                      ? 'bg-accentCyan border-accentCyan text-bgPrimary font-bold shadow-lg animate-glow-pulse'
                      : 'bg-bgPrimary border-borderGlow/40 text-textMuted hover:text-white'
                  }`}
                >
                  {h} HR
                </button>
              ))}
            </div>
          </div>

          {/* Section B: Focus Area Dropdown */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
              FOCUS AREA
            </span>
            <select
              value={focusCityId}
              onChange={(e) => setFocusCityId(e.target.value)}
              className="w-full h-10 bg-bgPrimary border border-borderGlow rounded-lg px-3 text-xs text-textPrimary focus:outline-none focus:border-accentCyan cursor-pointer font-medium"
            >
              {CITIES_LIST.map(city => (
                <option key={city.id} value={city.id} className="bg-bgCard">
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section C: Quick Commands */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
              QUICK INTELLIGENCE
            </span>
            <div className="grid grid-cols-2 gap-2">
              {quickCommands.map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQueryText(cmd.query);
                    handleAnalyze(cmd.query);
                  }}
                  className="bg-bgPrimary border border-borderGlow/60 hover:border-accentCyan hover:bg-bgCard p-2.5 rounded-lg text-left flex flex-col gap-1 cursor-pointer transition-all duration-200 group"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">{cmd.icon}</span>
                  <span className="text-[10px] font-bold text-textPrimary leading-snug">
                    {cmd.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Section D: Custom Query input */}
          <div className="flex flex-col gap-2 mt-1">
            <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
              CUSTOM INTELLIGENCE QUERY
            </span>
            <textarea
              id="ai-query-input"
              rows={4}
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Type your emergency query here..."
              className="w-full p-3 bg-bgPrimary border border-borderGlow rounded-lg text-xs text-textPrimary focus:outline-none focus:border-accentCyan resize-y placeholder:text-textMuted font-medium leading-relaxed"
            />
            <button
              id="ai-analyze-submit"
              disabled={isLoading || !queryText.trim()}
              onClick={() => handleAnalyze()}
              className="w-full py-3 bg-accentCyan hover:bg-cyan-400 text-bgPrimary font-extrabold text-xs tracking-wider rounded-lg transition-all cursor-pointer font-display disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {isLoading ? 'NEXUS AI PROCESSING...' : '🤖 ANALYZE'}
            </button>
          </div>

          {/* Section E: Query History */}
          {queryHistory.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-borderGlow/50 pt-3">
              <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
                RECENT QUERIES
              </span>
              <div className="flex flex-col gap-1.5">
                {queryHistory.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQueryText(q);
                      handleAnalyze(q);
                    }}
                    className="w-full text-left truncate text-[10px] text-textMuted hover:text-accentCyan bg-bgPrimary/50 p-2 rounded border border-borderGlow/20 hover:border-accentCyan/30 cursor-pointer transition-colors"
                    title={q}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT PANEL: Scrollable Stream Response View */}
        <div className="w-full md:w-[62%] bg-bgCard border border-borderGlow rounded-lg flex flex-col overflow-hidden shadow-xl">
          {/* Header */}
          <div className="border-b border-borderGlow p-4 bg-bgSecondary/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-sm text-textPrimary tracking-wide uppercase">
                NEXUS AI COMMAND CENTER
              </span>
              <span className="text-[10px] text-textMuted uppercase font-semibold tracking-wider mt-0.5">
                Targeting city context: {CITIES_LIST.find(c => c.id === focusCityId)?.name}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7c3aed]/15 text-[#7c3aed] border border-[#7c3aed]/30 uppercase">
                ⚡ Gemini 1.5 Flash
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accentCyan/15 text-accentCyan border border-accentCyan/30 uppercase">
                WINDOW: {forecastHours} HR
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/15 text-low border border-green-500/30 uppercase">
                CONFIDENCE: {confidence}%
              </span>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 p-5 overflow-y-auto scrollbar-thin flex flex-col gap-4">
            
            {/* Before first query starts */}
            {!streamedText && !isLoading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-16">
                <svg className="w-16 h-16 text-borderGlow animate-float" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M50 12 L82 22 V50 C82 69 68 84 50 89 C32 84 18 69 18 50 V22 Z" stroke="currentColor" strokeWidth="4" />
                  <circle cx="50" cy="50" r="14" stroke="currentColor" strokeWidth="3" />
                  <path d="M50 36 V64 M36 50 H64" stroke="currentColor" strokeWidth="3" />
                </svg>
                <div className="flex flex-col gap-1">
                  <span className="font-display font-bold text-sm text-textPrimary uppercase tracking-wider">
                    Awaiting intelligence request...
                  </span>
                  <span className="text-xs text-textMuted max-w-xs leading-relaxed">
                    Select a quick command or type a custom request to generate emergency prognostic reviews.
                  </span>
                </div>
              </div>
            )}

            {/* During Load / Streaming */}
            {isLoading && !rawOutput && (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-16">
                {/* SVG Radar sweep rotating */}
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 rounded-full border-2 border-accentCyan/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-accentCyan border-t-transparent animate-spin" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accentCyan animate-ping" />
                </div>
                <div className="flex flex-col gap-1 leading-tight">
                  <span className="font-display font-bold text-xs text-accentCyan uppercase tracking-widest animate-pulse">
                    NEXUS AI PROCESSING...
                  </span>
                  <span className="text-[10px] text-textMuted uppercase font-semibold">
                    Analyzing active incidents across {alerts.length} cities...
                  </span>
                </div>
              </div>
            )}

            {/* Standard Response Cards (Structured Output) */}
            {streamedText && (
              <div className="flex flex-col gap-4 animate-slide-in-top">
                
                {/* If headers were matched, render structured panels */}
                {sections.threat && (
                  <div className="bg-[#ff2d55]/5 border border-borderGlow border-l-4 border-l-critical p-4 rounded-r-lg flex flex-col gap-2">
                    <span className="text-xs font-bold text-critical tracking-wider font-display">
                      🔴 THREAT ASSESSMENT
                    </span>
                    <p className="text-xs text-textPrimary leading-relaxed whitespace-pre-line font-medium">
                      {sections.threat}
                    </p>
                  </div>
                )}

                {sections.risk && (
                  <div className="bg-[#00d4ff]/5 border border-borderGlow border-l-4 border-l-accentCyan p-4 rounded-r-lg flex flex-col gap-2">
                    <span className="text-xs font-bold text-accentCyan tracking-wider font-display">
                      📊 RISK ANALYSIS
                    </span>
                    <p className="text-xs text-textPrimary leading-relaxed whitespace-pre-line font-medium">
                      {sections.risk}
                    </p>
                  </div>
                )}

                {sections.actions && (
                  <div className="bg-green-500/5 border border-borderGlow border-l-4 border-l-low p-4 rounded-r-lg flex flex-col gap-2">
                    <span className="text-xs font-bold text-low tracking-wider font-display">
                      ✅ RECOMMENDED ACTIONS
                    </span>
                    <p className="text-xs text-textPrimary leading-relaxed whitespace-pre-line font-medium">
                      {sections.actions}
                    </p>
                  </div>
                )}

                {sections.outlook && (
                  <div className="bg-accentPurple/5 border border-borderGlow border-l-4 border-l-accentPurple p-4 rounded-r-lg flex flex-col gap-2">
                    <span className="text-xs font-bold text-accentPurple tracking-wider font-display">
                      ⏱ {forecastHours}-HOUR OUTLOOK
                    </span>
                    <p className="text-xs text-textPrimary leading-relaxed whitespace-pre-line font-medium">
                      {sections.outlook}
                    </p>
                  </div>
                )}

                {/* Raw card fallback if no headings present */}
                {sections.raw && (
                  <div className="bg-bgPrimary border border-borderGlow p-4 rounded-lg flex flex-col gap-2">
                    <p className="text-xs text-textPrimary leading-relaxed whitespace-pre-line font-medium">
                      {sections.raw}
                    </p>
                  </div>
                )}

              </div>
            )}

          </div>

          {/* Footer actions when output exists */}
          {streamedText && (
            <div className="border-t border-borderGlow bg-bgSecondary/60 p-3 flex justify-between items-center gap-3">
              <button
                onClick={handleNavigateMap}
                className="px-3.5 py-1.5 border border-accentCyan text-accentCyan hover:bg-accentCyan/15 transition-all text-xs rounded font-bold tracking-wider cursor-pointer"
              >
                🗺 View on Map
              </button>

              <div className="flex gap-2">
                {/* Copy */}
                <button
                  onClick={handleCopyClipboard}
                  className="px-3.5 py-1.5 bg-bgPrimary border border-borderGlow hover:border-accentCyan text-textPrimary hover:text-white transition-all text-xs rounded font-bold cursor-pointer"
                >
                  📋 Copy Report
                </button>
                {/* Export */}
                <button
                  onClick={handleExportPDF}
                  className="px-3.5 py-1.5 bg-accentCyan hover:bg-cyan-400 text-bgPrimary font-bold text-xs rounded transition-all cursor-pointer"
                >
                  📤 Export PDF
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </PageTransition>
  );
}
