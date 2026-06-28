const express = require('express');
const router = express.Router();
const store = require('../data/store');
const cities = require('../data/cities');

// Helper to recalculate risk score for a city after alert changes
const updateCityRiskScore = (cityObject) => {
  if (!cityObject) return;
  const activeIncidents = store.alerts.filter(
    a => a.city.toLowerCase() === cityObject.name.toLowerCase() ||
      a.city.toLowerCase() === cityObject.id.toLowerCase()
  );
  const activeCount = activeIncidents.length;
  const incidentRisk = activeCount * 25;
  const baseScore = 10 + incidentRisk;

  if (store.riskScores[cityObject.id]) {
    store.riskScores[cityObject.id].incidentRisk = incidentRisk;
    // We keep existing weatherRisk and add them up, capped at 100
    const wRisk = store.riskScores[cityObject.id].weatherRisk || 0;

    // Add monsoon bonus if currently June-September (5, 6, 7, 8 in JS 0-indexed months)
    const currentMonth = new Date().getMonth();
    const isMonsoon = currentMonth >= 5 && currentMonth <= 8; // June to Sept
    const monsoonBonus = isMonsoon ? 15 : 0;

    store.riskScores[cityObject.id].score = Math.min(100, wRisk + incidentRisk + monsoonBonus);
  } else {
    store.riskScores[cityObject.id] = {
      score: Math.min(100, baseScore),
      weatherRisk: 0,
      incidentRisk: incidentRisk,
      cityName: cityObject.name,
      lat: cityObject.lat,
      lng: cityObject.lng
    };
  }
};

// GET /api/alerts
router.get('/', (req, res) => {
  const sorted = [...store.alerts].sort((a, b) => b.timestamp - a.timestamp);
  res.json(sorted);
});

// POST /api/alerts
router.post('/', (req, res) => {
  const { type, city, lat, lng, severity, description } = req.body;
  if (!type || !city || !lat || !lng || !severity || !description) {
    return res.status(400).json({ error: 'Missing required alert fields' });
  }

  const newAlert = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    type,
    city,
    location: { lat: parseFloat(lat), lng: parseFloat(lng) },
    severity,
    description,
    timestamp: Date.now()
  };

  store.alerts.push(newAlert);

  // Find city and update risk score
  const foundCity = cities.find(
    c => c.name.toLowerCase() === city.toLowerCase() ||
      c.id.toLowerCase() === city.toLowerCase()
  );
  if (foundCity) {
    updateCityRiskScore(foundCity);
  }

  res.status(201).json(newAlert);
});

// Contextual simulation details for Indian cities
const simulationTemplates = {
  Flood: [
    "Severe waterlogging reported in low-lying residential sectors. Public transit delayed.",
    "Drainage choke points overflowing near major transit hubs. Advisory issued to avoid main underpasses.",
    "Continuous heavy rain causing rising water levels. Disaster response crews deploying pumps."
  ],
  Fire: [
    "Commercial building structure fire reported in local market district. Response units active on scene.",
    "Transformer explosion and subsequent electrical fire. Fire brigade and utility teams on-site.",
    "Warehouse smoke and fire hazard. Containment operations underway to prevent spread."
  ],
  Medical: [
    "Outbreak of waterborne diseases reported at local health clinics. Triage centers active.",
    "Mass heat exhaustion emergencies amid severe temperature spikes. Public safety warning active.",
    "Accident trauma casualties routed to local district hospitals. Medical alert declared."
  ],
  Accident: [
    "Multi-vehicle pile-up on national highway link road. Heavy traffic blockage, diversions in place.",
    "Construction scaffolding collapse onto roadway, restricting access. Rescue teams clear debris.",
    "Metro rail transit pillar zone minor collapse. Road traffic diverted, emergency crew deployed."
  ],
  Power: [
    "Regional grid failure causing complete blackout across commercial sectors. Backup generators active.",
    "Substation transformer malfunction leading to local power outages. Restoration crews active.",
    "High winds trigger grid line trips, leaving major districts without power. Restoration expected in 2 hours."
  ]
};

// POST /api/alerts/simulate
router.post('/simulate', (req, res) => {
  // Pick random city
  const randomCity = cities[Math.floor(Math.random() * cities.length)];

  // Pick random type
  const types = ['Flood', 'Fire', 'Medical', 'Accident', 'Power'];
  const randomType = types[Math.floor(Math.random() * types.length)];

  // Pick random template and customize
  const templates = simulationTemplates[randomType];
  const baseDescription = templates[Math.floor(Math.random() * templates.length)];

  // Add some specific city references for high quality Indian context
  let locationDetail = "Sector 3 Area";
  if (randomCity.id === 'mumbai') locationDetail = "Dharavi Link Road";
  else if (randomCity.id === 'delhi') locationDetail = "Okhla Phase 2";
  else if (randomCity.id === 'bengaluru') locationDetail = "Outer Ring Road near Marathahalli";
  else if (randomCity.id === 'chennai') locationDetail = "Velachery Bypass";
  else if (randomCity.id === 'kolkata') locationDetail = "Salt Lake Sector V";
  else if (randomCity.id === 'kochi') locationDetail = "Edappally Junction";
  else if (randomCity.id === 'pune') locationDetail = "Kothrud Depot";
  else if (randomCity.id === 'hyderabad') locationDetail = "Hitec City Corridor";

  const description = `[Alert in ${randomCity.name} - ${locationDetail}]: ${baseDescription}`;

  // Random severity (weighted toward Medium/High)
  const severities = ['Low', 'Medium', 'High', 'Critical'];
  const weights = [0.15, 0.35, 0.35, 0.15]; // Cumulative: 15%, 50%, 85%, 100%
  const rand = Math.random();
  let severity = 'Medium';
  if (rand < 0.15) severity = 'Low';
  else if (rand < 0.50) severity = 'Medium';
  else if (rand < 0.85) severity = 'High';
  else severity = 'Critical';

  // Add random offset near city center for visual distribution on Google Map
  const latOffset = (Math.random() - 0.5) * 0.05;
  const lngOffset = (Math.random() - 0.5) * 0.05;

  const newAlert = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    type: randomType,
    city: randomCity.name,
    location: {
      lat: randomCity.lat + latOffset,
      lng: randomCity.lng + lngOffset
    },
    severity,
    description,
    timestamp: Date.now()
  };

  store.alerts.push(newAlert);

  // Update city risk score
  updateCityRiskScore(randomCity);

  res.status(201).json(newAlert);
});

module.exports = router;
