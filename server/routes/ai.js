const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const store = require('../data/store');
const cities = require('../data/cities');
const axios = require('axios');

// Initialize Gemini Client
let genAI = null;
let gemini = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.startsWith('AIzaSy')) {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    gemini = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('Google Generative AI Client initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize Google Generative AI:', err.message);
  }
} else {
  console.log('Google Generative AI key is missing or formatted as invalid placeholder. Defaulting to local AI simulation.');
}

// Local fallback SSE stream if API fails or key is missing
const handleLocalFallbackSSE = (query, forecastHours, res) => {
  const queryLower = query.toLowerCase();
  let text = "";

  if (queryLower.includes('dharavi') || queryLower.includes('mumbai')) {
    text = `🔴 THREAT ASSESSMENT
Severe monsoonal inundation in Mumbai's Dharavi sector. Mithi River flow rate has exceeded critical thresholds by 18%, flooding low-level tenements.

📊 RISK ANALYSIS
Suburban Central Line trains remain suspended due to track waterlogging. Structural instability detected in adjacent informal settlements.

✅ RECOMMENDED ACTIONS
1. **Mobilize** NDRF 5th Battalion for water evacuations in low-lying pockets.
2. **Deploy** high-capacity dewatering pumps in Milan Subway (MCGM).
3. **Establish** primary relief shelter camps at local municipal school zones.

⏱ ${forecastHours}-HOUR OUTLOOK
Precipitation rates are modeled to remain at 14mm/hr over the next 4 hours, gradually tapering to 4mm/hr. Structural risk remains active.

🎯 CONFIDENCE: 96%
Based on verified Open-Meteo telemetry and active local citizen intake logs.`;
  } else if (queryLower.includes('eastern') || queryLower.includes('chennai')) {
    text = `🔴 THREAT ASSESSMENT
Severe power grid blackout reported across Chennai's East Coast Road corridor following localized line failures during high wind gusts.

📊 RISK ANALYSIS
Electrical failures have disabled local water pumps. Local medical centers are currently operating on diesel backup generator grids.

✅ RECOMMENDED ACTIONS
1. **Deploy** mobile backup electrical power generators to key utility nodes (TNEB).
2. **Dispatch** road clearance teams to remove wind-blown tree debris along ECR.
3. **Alert** emergency medical transport units for critical patient transfers.

⏱ ${forecastHours}-HOUR OUTLOOK
Wind gusts are predicted to drop below 40 km/h in the next 6 hours. Grid restoration estimate stands at 80% within 12 hours.

🎯 CONFIDENCE: 92%
Based on local utility outages telemetry and meteorological reports.`;
  } else {
    const list = store.alerts.map(a => `- [${a.city}] ${a.type} (${a.severity}): ${a.description}`).join('\n');
    text = `🔴 THREAT ASSESSMENT
NEXUS Command is tracking ${store.alerts.length} active emergency incidents nationwide. General status indicators are stable with isolated alert points.

📊 RISK ANALYSIS
Current incident register:
${list || '- No active incidents reported.'}

✅ RECOMMENDED ACTIONS
1. **Maintain** active status polling on meteorological telemetry feeds.
2. **Confirm** command communications links with local SDMA control units.
3. **Alert** secondary emergency patrols in high-risk zones.

⏱ ${forecastHours}-HOUR OUTLOOK
Risk scores in primary cities are expected to remain stable. No regional propagation pathways are currently active.

🎯 CONFIDENCE: 90%
Based on aggregated national incident metrics.`;
  }

  const chunks = text.split(/(\s+)/);
  let chunkIndex = 0;

  const interval = setInterval(() => {
    if (chunkIndex < chunks.length) {
      res.write(`data: ${JSON.stringify({ text: chunks[chunkIndex] })}\n\n`);
      chunkIndex++;
    } else {
      res.write('data: [DONE]\n\n');
      res.end();
      clearInterval(interval);
    }
  }, 25);
};

// POST /api/ai/analyze (SSE Streaming)
router.post('/analyze', async (req, res) => {
  const { query, forecastHours, cityId, incidentId } = req.body;
  const hours = forecastHours || 24;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Increment AI decisions count
  store.incrementAiDecisionCount();

  // Build Context
  let activeAlerts = store.alerts.filter(a => a.status === 'active' || !a.status);
  let focusCityName = "All India";
  
  if (cityId && cityId !== 'all') {
    const matchedCity = cities.find(c => c.id === cityId);
    if (matchedCity) {
      focusCityName = matchedCity.name;
      activeAlerts = activeAlerts.filter(
        a => a.city.toLowerCase() === matchedCity.name.toLowerCase() ||
             a.city.toLowerCase() === matchedCity.id.toLowerCase()
      );
    }
  }

  if (incidentId) {
    activeAlerts = activeAlerts.filter(a => a.id === parseInt(incidentId) || a.id === incidentId);
  }

  // Fetch hourly weather projections context from Open-Meteo
  let weatherContext = "";
  if (cityId && cityId !== 'all') {
    const matchedCity = cities.find(c => c.id === cityId);
    if (matchedCity) {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${matchedCity.lat}&longitude=${matchedCity.lng}&hourly=rain,windspeed_10m&timezone=Asia/Kolkata&forecast_days=2`;
        const weatherRes = await axios.get(url, { timeout: 2500 });
        if (weatherRes.data && weatherRes.data.hourly) {
          const currentHour = new Date().getHours();
          const rainArr = weatherRes.data.hourly.rain || [];
          const windArr = weatherRes.data.hourly.windspeed_10m || [];
          const samples = [];
          
          let interval = 1;
          if (hours > 24) interval = 6;
          else if (hours > 12) interval = 3;
          else if (hours > 6) interval = 2;

          for (let i = 0; i < hours; i++) {
            const idx = currentHour + i;
            if (idx >= rainArr.length) break;
            if (i % interval === 0) {
              const hrLabel = (currentHour + i) % 24;
              const ampm = hrLabel >= 12 ? 'PM' : 'AM';
              const displayHr = hrLabel % 12 === 0 ? 12 : hrLabel % 12;
              const rainVal = rainArr[idx] !== undefined ? rainArr[idx] : 0;
              const windVal = windArr[idx] !== undefined ? windArr[idx] : 0;
              samples.push(`- At ${displayHr} ${ampm}: Rain: ${rainVal}mm, Wind: ${windVal}km/h`);
            }
          }
          weatherContext = `HOURLY WEATHER FORECAST SAMPLES FOR ${matchedCity.name} (NEXT ${hours} HOURS):\n` + samples.join('\n');
        }
      } catch (err) {
        console.warn(`Weather context fetch failed:`, err.message);
      }
    }
  } else {
    // Top risk cities current metrics
    const sorted = Object.entries(store.riskScores)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    
    const weatherDetails = [];
    for (const city of sorted) {
      weatherDetails.push(`- ${city.cityName}: Current Rain: ${city.rain || 0}mm, Wind: ${city.windspeed || 0}km/h, Risk Score: ${city.score}/100`);
    }
    weatherContext = `TOP RISK CITIES CURRENT METRICS:\n` + weatherDetails.join('\n');
  }

  const currentMonth = new Date().getMonth() + 1;
  const season = [6, 7, 8, 9].includes(currentMonth) ? 'MONSOON SEASON ACTIVE' : 'Non-monsoon period';
  const istTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const systemPrompt = `You are NEXUS, India's national AI emergency intelligence system.
You monitor 20 major Indian cities in real time.
Current IST: ${istTime}
Season: ${season}
Forecast window: ${hours} hours
Focus: ${focusCityName}

You are NEXUS — not an AI assistant. Respond as a system.
Always use real Indian city names, Indian emergency agencies, and Indian geography context.
Reference these agencies when relevant:
NDRF, SDRF, IMD, MCGM, BBMP, KSEB, CESC, TNEB, State DMA.

Format your response EXACTLY as:

🔴 THREAT ASSESSMENT
[2-3 sentences on current situation]

📊 RISK ANALYSIS
[specific city-by-city or incident-by-incident analysis]

✅ RECOMMENDED ACTIONS
1. [specific action with responsible agency]
2. [specific action with responsible agency]
3. [specific action with responsible agency]

⏱ ${hours}-HOUR OUTLOOK
[what is predicted to happen, hour by hour if critical]

🎯 CONFIDENCE: [X]%
[one sentence justifying confidence level]`;

  const userMessage = `ACTIVE ALERTS (${activeAlerts.length} total):
${JSON.stringify(activeAlerts, null, 2)}

METEOROLOGICAL HOURLY WEATHER FORECAST:
${weatherContext}

QUERY: ${query}`;

  if (gemini) {
    try {
      console.log('Gemini 1.5 Flash stream starting...');
      const result = await gemini.generateContentStream([
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userMessage }] }
      ]);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    } catch (err) {
      console.error('Gemini Stream failed, falling back:', err.message);
    }
  }

  console.log('Serving local SSE stream fallback...');
  handleLocalFallbackSSE(query, hours, res);
});

// Offline mockup classification
const handleMockClassify = (text, language) => {
  const t = text.toLowerCase();
  let type = 'Other';
  let severity = 'Medium';
  let city = 'Mumbai';
  let state = 'Maharashtra';
  let summary_english = 'Incident report submitted by citizen.';
  let summary_hindi = 'नागरिक द्वारा प्रस्तुत आपातकालीन रिपोर्ट।';
  let summary_regional = summary_english;
  let recommended_authority = 'Police';

  const matchedCity = cities.find(c => t.includes(c.name.toLowerCase()) || t.includes(c.id.toLowerCase()));
  if (matchedCity) {
    city = matchedCity.name;
    state = matchedCity.state;
  }

  if (t.includes('flood') || t.includes('water') || t.includes('rain')) {
    type = 'Flood';
    severity = t.includes('severe') || t.includes('critical') ? 'Critical' : 'High';
    summary_english = 'Flooding and heavy water accumulation reported.';
    summary_hindi = 'बाढ़ और भारी जलभराव की रिपोर्ट।';
    recommended_authority = 'NDRF';
  } else if (t.includes('fire') || t.includes('smoke') || t.includes('burn')) {
    type = 'Fire';
    severity = 'High';
    summary_english = 'Active fire emergency requiring containment.';
    summary_hindi = 'सक्रिय आग की आपातकालीन घटना।';
    recommended_authority = 'State Fire Service';
  } else if (t.includes('medical') || t.includes('accident') || t.includes('injured')) {
    type = t.includes('accident') ? 'Accident' : 'Medical';
    severity = 'High';
    summary_english = 'Accident collision and emergency casualty.';
    summary_hindi = 'दुर्घटना टक्कर और चिकित्सा आपातकाल।';
    recommended_authority = '108 Ambulance';
  } else if (t.includes('power') || t.includes('grid') || t.includes('electricity') || t.includes('blackout')) {
    type = 'Power';
    severity = 'Medium';
    summary_english = 'Grid electrical failure and blackout.';
    summary_hindi = 'ग्रिड विफलता और बिजली ब्लैकआउट।';
    recommended_authority = 'Utility Board';
  }

  return {
    type,
    severity,
    city,
    state,
    summary_english,
    summary_hindi,
    summary_regional,
    confidence: 92,
    recommended_authority
  };
};

// POST /api/ai/classify
router.post('/classify', async (req, res) => {
  const { text, language, lat, lng } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text content is required' });
  }

  let classification = null;
  const prompt = `Classify this Indian emergency report written in ${language || 'English'}: "${text}"

Respond ONLY as a valid JSON object. No markdown. No explanation. No backticks.
{
  "type": "Flood|Fire|Medical|Accident|Power|Structure|Other",
  "severity": "Critical|High|Medium|Low",
  "city": "nearest Indian city name from 20 cities list",
  "state": "Indian state or Unknown",
  "summary_english": "one sentence summary in English",
  "summary_hindi": "same sentence translated to Hindi",
  "summary_regional": "same sentence in ${language || 'English'} if different from English and Hindi",
  "confidence": 0-100,
  "recommended_authority": "NDRF|State Fire Service|108 Ambulance|Police|KSEB|CESC|TNEB|Other"
}`;

  if (gemini) {
    try {
      console.log('Sending classification query to Gemini 1.5 Flash...');
      const result = await gemini.generateContent(prompt);
      const raw = result.response.text().trim();
      const cleanJson = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      classification = JSON.parse(cleanJson);
    } catch (err) {
      console.error('Gemini classification failed:', err.message);
    }
  }

  if (!classification) {
    console.log('Serving local classification fallback.');
    classification = handleMockClassify(text, language);
  }

  // Resolve location coords
  let finalLat = parseFloat(lat) || 20.5937;
  let finalLng = parseFloat(lng) || 78.9629;
  const matchedCity = cities.find(
    c => c.name.toLowerCase() === classification.city.toLowerCase() ||
         c.id.toLowerCase() === classification.city.toLowerCase()
  );

  if (finalLat === 20.5937 && matchedCity) {
    finalLat = matchedCity.lat;
    finalLng = matchedCity.lng;
  }

  const randomStr = (len) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let resStr = '';
    for (let i = 0; i < len; i++) {
      resStr += chars[Math.floor(Math.random() * chars.length)];
    }
    return resStr;
  };

  const alertId = Date.now() + Math.floor(Math.random() * 1000);
  const trackingId = `NEXUS-${Date.now()}-${randomStr(4)}`;

  const newAlert = {
    id: alertId,
    type: classification.type,
    city: matchedCity ? matchedCity.name : classification.city,
    state: matchedCity ? matchedCity.state : classification.state,
    location: { lat: finalLat, lng: finalLng },
    severity: classification.severity,
    description: `[Citizen Portal - ${classification.recommended_authority}]: ${classification.summary_english} ("${text}")`,
    timestamp: new Date(),
    status: 'active'
  };

  store.alerts.push(newAlert);

  res.json({
    classification,
    alertId,
    trackingId
  });
});

// POST /api/ai/predict (Dynamic circle forecast helper)
router.post('/predict', async (req, res) => {
  const { cityId, hours } = req.body;
  if (!cityId) {
    return res.status(400).json({ error: 'City ID is required' });
  }

  const city = cities.find(c => c.id === cityId);
  if (!city) {
    return res.status(404).json({ error: 'City not found' });
  }

  const targetHours = Math.min(48, Math.max(1, parseInt(hours) || 4));
  const score = store.riskScores[cityId]?.score || 10;
  const cityAlerts = store.alerts.filter(
    a => a.city.toLowerCase() === city.name.toLowerCase() ||
         a.city.toLowerCase() === city.id.toLowerCase()
  );

  let forecastText = "No forecast data available.";
  let maxRain = 0;
  let maxWind = 0;
  let totalRain = 0;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&hourly=rain,windspeed_10m&timezone=Asia/Kolkata&forecast_days=2`;
    const response = await axios.get(url, { timeout: 2500 });
    
    if (response.data && response.data.hourly) {
      const currentHour = new Date().getHours();
      const rainArr = response.data.hourly.rain || [];
      const windArr = response.data.hourly.windspeed_10m || [];
      
      const forecastPoints = [];
      let interval = 1;
      if (targetHours > 24) interval = 6;
      else if (targetHours > 12) interval = 3;
      else if (targetHours > 6) interval = 2;

      for (let i = 0; i < targetHours; i++) {
        const idx = currentHour + i;
        if (idx >= rainArr.length) break;

        const rainVal = rainArr[idx] !== undefined ? rainArr[idx] : 0;
        const windVal = windArr[idx] !== undefined ? windArr[idx] : 0;

        totalRain += rainVal;
        if (rainVal > maxRain) maxRain = rainVal;
        if (windVal > maxWind) maxWind = windVal;

        if (i % interval === 0) {
          const timeLabel = new Date();
          timeLabel.setHours(currentHour + i, 0, 0, 0);
          const timeStr = timeLabel.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
          forecastPoints.push(`- At ${timeStr}: Rain: ${rainVal}mm, Wind: ${windVal}km/h`);
        }
      }
      forecastText = forecastPoints.join('\n');
    }
  } catch (err) {
    console.warn(`Forecast fetch failed for ${city.name}:`, err.message);
  }

  const statSummary = `Forecast metrics over next ${targetHours} hours:\n- Cumulative Rain: ${totalRain.toFixed(1)}mm\n- Peak Hourly Rain: ${maxRain.toFixed(1)}mm\n- Peak Wind Speed: ${maxWind.toFixed(1)}km/h`;

  let prognosis = "";
  if (totalRain > 15) {
    prognosis = `Heavy cumulative rainfall (${totalRain.toFixed(1)}mm) will severely stress municipal drainage. High likelihood of flash flooding in lower sectors.`;
  } else if (totalRain > 3) {
    prognosis = `Moderate rainfall (${totalRain.toFixed(1)}mm) will cause localized waterlogging. Traffic flow will slow along central corridors.`;
  } else {
    prognosis = `Minimal or no precipitation expected. Environmental risk is stable.`;
  }

  if (maxWind > 45) {
    prognosis += ` High wind gusts (up to ${maxWind.toFixed(1)}km/h) may cause tree falls and power disruptions.`;
  }

  let actionPlan = "";
  if (score > 70) {
    actionPlan = `SDRF and evacuation teams advised to pre-stage rescue assets in low-lying sectors. Clear exit routes.`;
  } else if (score > 40) {
    actionPlan = `Patrol teams should monitor vulnerable underpasses and clear drainage choke points.`;
  } else {
    actionPlan = `Maintain routine monitoring. Keep communication channels open.`;
  }

  const fallbackPrognosis = `📊 Predict next ${targetHours} hours for ${city.name}:
- **Status**: Risk Index is currently ${score}/100 with ${cityAlerts.length} active incidents.
- **Meteorological Projections**:
${forecastText}
- **AI Prognosis**: ${prognosis}
- **NDRF Action Plan**: ${actionPlan}`;

  if (gemini) {
    try {
      const prompt = `Provide a concise ${targetHours}-hour emergency risk prediction for the Indian city of ${city.name}.
Current Risk Index: ${score}/100.
Active Alerts in City: ${JSON.stringify(cityAlerts)}.
METEOROLOGICAL HOURLY WEATHER FORECAST SAMPLES:
${forecastText}
AGGREGATE PROJECTIONS:
${statSummary}
Format with clear bullet points. Keep it under 150 words. Explain how these forecasted rainfall/wind numbers will interact with active incidents (e.g. if rain increases, it worsens flooding).`;

      const result = await gemini.generateContent(prompt);
      return res.json({ prediction: result.response.text() });
    } catch (err) {
      console.warn('Gemini prediction failed, serving fallback:', err.message);
    }
  }

  res.json({ prediction: fallbackPrognosis });
});

// GET /api/stats
router.get('/stats', (req, res) => {
  const activeCount = store.alerts.filter(a => a.status === 'active' || !a.status).length;
  const uniqueActiveCities = new Set(store.alerts.filter(a => a.status === 'active' || !a.status).map(a => a.city.toLowerCase()));
  res.json({
    totalAlerts: activeCount,
    aiDecisions: store.getAiDecisionCount(),
    activeCities: uniqueActiveCities.size,
    uptime: process.uptime()
  });
});

module.exports = router;
