const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const store = require('./data/store');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const startTime = Date.now();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Mount Routes
const alertsRouter = require('./routes/alerts');
const riskRouter = require('./routes/risk');
const aiRouter = require('./routes/ai');

app.use('/api/alerts', alertsRouter);
app.use('/api/risk-scores', riskRouter);
app.use('/api/ai', aiRouter);

// GET /health
app.get('/health', (req, res) => {
  const activeAlerts = store.alerts.filter(a => a.status === 'active' || !a.status);
  res.json({
    status: 'NEXUS operational',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    alerts: activeAlerts.length,
    aiDecisions: store.getAiDecisionCount()
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    aiDecisions: store.getAiDecisionCount()
  });
});

//app.get('/', (req, res) => {
//  res.send('NEXUS Operations Control online.');

// 1. Serve the frontend static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../client/build')));

// 2. Catch-all route: If someone goes to any URL, send them the index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});


//});

// Start listening
app.listen(PORT, () => {
  console.log(`NEXUS India API Server running on port ${PORT}`);
  
  // Sleep Prevention (Critical for Render Free Tier)
  const SELF_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:8080';
  console.log(`Keep-alive self-ping configured targeting: ${SELF_URL}/health`);
  
  setInterval(() => {
    axios.get(`${SELF_URL}/health`)
      .then(() => console.log('Self-ping keep-alive successful.'))
      .catch(err => console.warn('Self-ping keep-alive failed:', err.message));
  }, 9 * 60 * 1000); // 9 minutes
});
