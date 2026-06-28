const cities = require('./cities');

let alerts = [
  {
    id: 1,
    type: "Flood",
    city: "Mumbai",
    location: { lat: 19.0390, lng: 72.8550 },
    severity: "Critical",
    description: "Heavy rainfall causing waterlogging in Dharavi and Kurla. Local trains disrupted.",
    timestamp: Date.now() - 2 * 60 * 1000 // 2 min ago
  },
  {
    id: 2,
    type: "Fire",
    city: "Delhi NCR",
    location: { lat: 28.6562, lng: 77.2410 },
    severity: "High",
    description: "Industrial fire reported in Okhla Phase 2. Fire brigade deployed.",
    timestamp: Date.now() - 8 * 60 * 1000 // 8 min ago
  },
  {
    id: 3,
    type: "Medical",
    city: "Chennai",
    location: { lat: 13.0569, lng: 80.2425 },
    severity: "High",
    description: "Mass casualty incident near Central Station. 3 hospitals on alert.",
    timestamp: Date.now() - 15 * 60 * 1000 // 15 min ago
  },
  {
    id: 4,
    type: "Power",
    city: "Kolkata",
    location: { lat: 22.5958, lng: 88.3775 },
    severity: "Medium",
    description: "Grid failure affecting Salt Lake sector. 40,000 homes without power.",
    timestamp: Date.now() - 22 * 60 * 1000 // 22 min ago
  },
  {
    id: 5,
    type: "Accident",
    city: "Bengaluru",
    location: { lat: 12.9352, lng: 77.6245 },
    severity: "Medium",
    description: "Multi-vehicle pile-up on Outer Ring Road near Marathahalli. Traffic diverted.",
    timestamp: Date.now() - 35 * 60 * 1000 // 35 min ago
  },
  {
    id: 6,
    type: "Flood",
    city: "Kochi",
    location: { lat: 9.9816, lng: 76.2999 },
    severity: "Low",
    description: "Water level rising in Edappally area due to blocked drainage.",
    timestamp: Date.now() - 48 * 60 * 1000 // 48 min ago
  }
];

let riskScores = {};

// Initialize risk scores
cities.forEach(city => {
  const activeIncidents = alerts.filter(a => a.city.toLowerCase() === city.name.toLowerCase() || a.city.toLowerCase() === city.id.toLowerCase());
  const activeCount = activeIncidents.length;
  const incidentRisk = activeCount * 25;
  const baseScore = 10 + incidentRisk;

  riskScores[city.id] = {
    score: Math.min(100, baseScore),
    weatherRisk: 0,
    incidentRisk: incidentRisk,
    cityName: city.name,
    lat: city.lat,
    lng: city.lng
  };
});

let aiDecisionCount = 0;

module.exports = {
  alerts,
  riskScores,
  getAiDecisionCount: () => aiDecisionCount,
  incrementAiDecisionCount: () => { aiDecisionCount++ }
};
