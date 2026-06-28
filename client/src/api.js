const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080';

export const getAlerts = async (all = false) => {
  const res = await fetch(`${API_BASE}/api/alerts${all ? '?all=true' : ''}`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
};

export const simulateAlert = async () => {
  const res = await fetch(`${API_BASE}/api/alerts/simulate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to simulate alert');
  return res.json();
};

export const resolveAlert = async (id) => {
  const res = await fetch(`${API_BASE}/api/alerts/${id}/resolve`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to resolve alert');
  return res.json();
};

export const getStats = async () => {
  const res = await fetch(`${API_BASE}/api/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
};

export const getRiskScores = async () => {
  const res = await fetch(`${API_BASE}/api/risk-scores`);
  if (!res.ok) throw new Error('Failed to fetch risk scores');
  return res.json();
};

export const predictCity = async (cityId, hours) => {
  const res = await fetch(`${API_BASE}/api/ai/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cityId, hours })
  });
  if (!res.ok) throw new Error('Failed to fetch prediction');
  return res.json();
};

export const classifyReport = async (text, language, lat, lng) => {
  const res = await fetch(`${API_BASE}/api/ai/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language, lat, lng })
  });
  if (!res.ok) throw new Error('Failed to submit report');
  return res.json();
};

// SSE streaming reader for analyze AI
export const analyzeAI = async (query, forecastHours, cityId, incidentId, onChunk, onDone, onError) => {
  try {
    const response = await fetch(`${API_BASE}/api/ai/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ query, forecastHours, cityId, incidentId })
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Save the last incomplete line back to buffer
      buffer = lines.pop();

      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) continue;

        if (cleanLine.startsWith('data:')) {
          const rawData = cleanLine.substring(5).trim();
          if (rawData === '[DONE]') {
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(rawData);
            if (parsed.text) {
              onChunk(parsed.text);
            }
          } catch (e) {
            // Treat as raw string chunk if parsing fails (useful for local fallback)
            onChunk(rawData);
          }
        }
      }
    }
    
    // Clear buffer at completion
    if (buffer.trim() === 'data: [DONE]') {
      onDone();
    }
  } catch (err) {
    if (onError) onError(err);
    else console.error('SSE Error:', err);
  }
};
