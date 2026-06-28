import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, AlertCircle, Clock } from 'lucide-react';

export default function AIConsole({ apiHost, onQueryTrigger, activeQuery }) {
  const [query, setQuery] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confidence, setConfidence] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const responseEndRef = useRef(null);

  const quickActions = [
    "Which cities are critical right now?",
    "Predict eastern corridor next 4 hours",
    "Recommend NDRF deployment priorities",
    "Summarize all active incidents"
  ];

  // Auto-scroll to bottom of console response
  useEffect(() => {
    responseEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedText, isLoading]);

  // Handle triggered query (for Demo Mode typing simulation)
  useEffect(() => {
    if (activeQuery) {
      setQuery(activeQuery);
    }
  }, [activeQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    executeAIQuery(query.trim());
    setQuery('');
  };

  const handleQuickAction = (action) => {
    if (isLoading) return;
    executeAIQuery(action);
  };

  const executeAIQuery = async (queryText) => {
    setIsLoading(true);
    setDisplayedText('');
    setConfidence(null);
    setTimestamp(new Date().toLocaleTimeString());
    
    // Notify parent if callback provided (for dashboard sync)
    if (onQueryTrigger) {
      onQueryTrigger(queryText);
    }

    try {
      const response = await fetch(`${apiHost}/api/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText })
      });

      if (!response.ok) {
        throw new Error('Failed to connect to AI server.');
      }

      if (!response.body) {
        throw new Error('Response body is null.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        // Save the last partial line back to buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataToken = trimmed.replace('data: ', '').trim();
            if (dataToken === '[DONE]') {
              break;
            }
            // Append token to text
            setDisplayedText(prev => prev + dataToken + ' ');
          }
        }
      }

    } catch (err) {
      console.error('SSE Stream Error:', err);
      setDisplayedText('🔴 CONNECTION ERROR: NEXUS Core AI Link severed. Please ensure the backend server is running and online.');
    } finally {
      setIsLoading(false);
    }
  };

  // Parse confidence score from the stream
  useEffect(() => {
    const match = displayedText.match(/🎯\s*Confidence:\s*(\d+)%?/i);
    if (match) {
      setConfidence(match[1]);
    }
  }, [displayedText]);

  // Clean the raw response text to separate out sections visually
  const renderResponseBlocks = (text) => {
    if (!text) return null;

    // Split text by the major markers
    const sections = text.split(/(🔴\s*ASSESSMENT|📊\s*RISK\s*ANALYSIS|✅\s*RECOMMENDED\s*ACTIONS|🎯\s*Confidence:)/i);
    
    let blocks = [];
    let currentMarker = '';

    for (let i = 0; i < sections.length; i++) {
      const part = sections[i].trim();
      if (!part) continue;

      if (part.match(/🔴\s*ASSESSMENT/i)) {
        currentMarker = 'assessment';
      } else if (part.match(/📊\s*RISK\s*ANALYSIS/i)) {
        currentMarker = 'risk';
      } else if (part.match(/✅\s*RECOMMENDED\s*ACTIONS/i)) {
        currentMarker = 'actions';
      } else if (part.match(/🎯\s*Confidence:/i)) {
        currentMarker = 'confidence';
      } else {
        // This is content for the current marker
        if (currentMarker === 'assessment') {
          blocks.push(
            <div key={i} className="mb-4 bg-red-950/10 border-l-2 border-criticalRed pl-3 py-1 animate-slide-in">
              <h4 className="text-[10px] font-black text-criticalRed uppercase tracking-widest mb-1">🔴 ASSESSMENT</h4>
              <p className="text-xs text-gray-300 leading-relaxed font-mono">{part.replace(/^:/, '').trim()}</p>
            </div>
          );
        } else if (currentMarker === 'risk') {
          blocks.push(
            <div key={i} className="mb-4 bg-amber-950/10 border-l-2 border-warningAmber pl-3 py-1 animate-slide-in">
              <h4 className="text-[10px] font-black text-warningAmber uppercase tracking-widest mb-1">📊 RISK ANALYSIS</h4>
              <p className="text-xs text-gray-300 leading-relaxed font-mono">{part.replace(/^:/, '').trim()}</p>
            </div>
          );
        } else if (currentMarker === 'actions') {
          blocks.push(
            <div key={i} className="mb-4 bg-emerald-950/10 border-l-2 border-safeGreen pl-3 py-1 animate-slide-in">
              <h4 className="text-[10px] font-black text-safeGreen uppercase tracking-widest mb-1">✅ RECOMMENDED ACTIONS</h4>
              <div className="text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-line">
                {part.replace(/^:/, '').trim()}
              </div>
            </div>
          );
        } else if (currentMarker === 'confidence') {
          // Render confidence separately in footer
        } else {
          // Default block if no marker set yet
          blocks.push(
            <p key={i} className="text-xs text-gray-400 font-mono mb-3 leading-relaxed">{part}</p>
          );
        }
      }
    }

    return blocks;
  };

  return (
    <div className="flex flex-col h-full bg-cardBg/40 backdrop-blur-md rounded-xl p-4 glow-cyan">
      <div className="flex items-center justify-between mb-4 border-b border-cyanAccent/10 pb-3">
        <h2 className="text-sm font-semibold tracking-wider text-cyanAccent uppercase flex items-center gap-2">
          <Sparkles className="w-4 h-4 animate-pulse-slow text-cyanAccent" />
          AI Decision Console
        </h2>
        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">SSE Stream</span>
      </div>

      {/* Response Log */}
      <div className="flex-1 bg-darkBg/60 border border-cyanAccent/10 rounded-lg p-3 overflow-y-auto mb-4 min-h-[160px] max-h-[calc(100vh-420px)] md:max-h-none flex flex-col justify-between">
        <div className="flex-1">
          {isLoading && !displayedText && (
            <div className="h-full flex flex-col items-center justify-center space-y-2 text-cyanAccent py-12">
              <div className="w-6 h-6 border-2 border-cyanAccent border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[9px] uppercase tracking-widest font-mono animate-pulse">Establishing SSE Link...</span>
            </div>
          )}
          
          {!displayedText && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-600 py-12">
              <AlertCircle className="w-8 h-8 text-gray-700 mb-2" />
              <p className="text-xs font-mono">NEXUS India AI Engine Online.</p>
              <p className="text-[9px] text-gray-700 max-w-[220px] mt-1 font-mono">Select a quick action query or type a custom command below to stream risk recommendations.</p>
            </div>
          )}

          {displayedText && (
            <div className="prose prose-invert max-w-none">
              {renderResponseBlocks(displayedText)}
            </div>
          )}
        </div>

        {displayedText && !isLoading && (
          <div className="mt-4 pt-3 border-t border-cyanAccent/5 flex items-center justify-between text-[9px] text-gray-500 font-mono font-bold">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-safeGreen"></span>
              CONFIDENCE: {confidence || '90'}%
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyanAccent" />
              {timestamp}
            </span>
          </div>
        )}
        <div ref={responseEndRef} />
      </div>

      {/* Quick Actions Grid */}
      <div className="mb-4">
        <span className="text-[10px] uppercase text-gray-500 font-black tracking-wider block mb-2 font-mono">Quick Actions</span>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleQuickAction(action)}
              disabled={isLoading}
              className="text-[10px] text-left text-gray-400 bg-darkBg border border-gray-800/80 hover:border-cyanAccent/40 hover:text-cyanAccent rounded-lg p-2 transition-all duration-300 leading-tight font-mono line-clamp-2 min-h-[44px]"
              title={action}
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isLoading}
          placeholder="Ask NEXUS AI..."
          className="flex-1 bg-darkBg border border-cyanAccent/10 focus:border-cyanAccent/40 focus:outline-none rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-700 transition-all duration-300 font-mono"
        />
        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className="bg-cyanAccent/10 hover:bg-cyanAccent/20 border border-cyanAccent/30 disabled:opacity-50 disabled:hover:bg-cyanAccent/10 text-cyanAccent rounded-lg p-2.5 transition-all duration-300"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
