const express = require('express');
const router = express.Router();
const axios = require('axios');
const store = require('../data/store');
const cities = require('../data/cities');

// Simple cache for weather data: cityId -> { rain, windspeed, timestamp }
const weatherCache = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache TTL

// Fetch weather from Open-Meteo with caching and graceful error handling
const getWeatherData = async (city) => {
  const now = Date.now();
  const cached = weatherCache[city.id];
  
  if (cached && (now - cached.timestamp < CACHE_DURATION)) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&current=rain,windspeed_10m&timezone=Asia/Kolkata`;
    // Set a short timeout (2.5 seconds) to keep the API responsive
    const response = await axios.get(url, { timeout: 2500 });
    
    const rain = response.data?.current?.rain || 0;
    const windspeed = response.data?.current?.windspeed_10m || 0;
    
    const data = { rain, windspeed };
    weatherCache[city.id] = { data, timestamp: now };
    
    return data;
  } catch (err) {
    console.error(`Weather API fail for ${city.name}:`, err.message);
    // Return cached data if available, otherwise fallback to safe zero values
    return cached ? cached.data : { rain: 0, windspeed: 0 };
  }
};

// GET /api/risk-scores
router.get('/', async (req, res) => {
  try {
    // Resolve all weather data in parallel
    const weatherPromises = cities.map(async city => {
      const weather = await getWeatherData(city);
      
      // Calculate weather risk score
      let weatherRisk = 0;
      if (weather.rain > 10) {
        weatherRisk = 40;
      } else if (weather.rain > 5) {
        weatherRisk = 25;
      } else if (weather.rain > 0) {
        weatherRisk = 10;
      }

      if (weather.windspeed > 50) {
        weatherRisk += 20;
      }

      // Calculate incident risk
      const activeIncidents = store.alerts.filter(
        a => a.city.toLowerCase() === city.name.toLowerCase() || 
             a.city.toLowerCase() === city.id.toLowerCase()
      );
      const incidentRisk = Math.min(60, activeIncidents.length * 20);

      // Monsoon season bonus (June-September)
      const currentMonth = new Date().getMonth();
      const isMonsoon = currentMonth >= 5 && currentMonth <= 8; // June to Sept
      const seasonBonus = isMonsoon ? 15 : 0;

      // Final score capped at 100
      const score = Math.min(100, weatherRisk + incidentRisk + seasonBonus);

      store.riskScores[city.id] = {
        score,
        weatherRisk,
        incidentRisk,
        cityName: city.name,
        lat: city.lat,
        lng: city.lng,
        rain: weather.rain,
        windspeed: weather.windspeed
      };
    });

    await Promise.all(weatherPromises);
    res.json(store.riskScores);
  } catch (err) {
    console.error('Failed to calculate risk scores:', err.message);
    // If anything fails, return existing scores in memory rather than failing
    res.json(store.riskScores);
  }
});

module.exports = router;
