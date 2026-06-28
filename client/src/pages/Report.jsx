import { useState, useEffect, useRef } from 'react';
import PageTransition from '../components/PageTransition';
import translations from '../translations';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// API
import { classifyReport } from '../api';

const CITIES_LIST = [
  { id: "delhi", name: "Delhi NCR", state: "Delhi" },
  { id: "mumbai", name: "Mumbai", state: "Maharashtra" },
  { id: "bengaluru", name: "Bengaluru", state: "Karnataka" },
  { id: "hyderabad", name: "Hyderabad", state: "Telangana" },
  { id: "chennai", name: "Chennai", state: "Tamil Nadu" },
  { id: "kolkata", name: "Kolkata", state: "West Bengal" },
  { id: "pune", name: "Pune", state: "Maharashtra" },
  { id: "ahmedabad", name: "Ahmedabad", state: "Gujarat" },
  { id: "jaipur", name: "Jaipur", state: "Rajasthan" },
  { id: "lucknow", name: "Lucknow", state: "Uttar Pradesh" },
  { id: "kochi", name: "Kochi", state: "Kerala" },
  { id: "chandigarh", name: "Chandigarh", state: "Punjab" },
  { id: "bhopal", name: "Bhopal", state: "Madhya Pradesh" },
  { id: "nagpur", name: "Nagpur", state: "Maharashtra" },
  { id: "patna", name: "Patna", state: "Bihar" },
  { id: "bhubaneswar", name: "Bhubaneswar", state: "Odisha" },
  { id: "guwahati", name: "Guwahati", state: "Assam" },
  { id: "surat", name: "Surat", state: "Gujarat" },
  { id: "amritsar", name: "Amritsar", state: "Punjab" },
  { id: "coimbatore", name: "Coimbatore", state: "Tamil Nadu" }
];

// Helper mini-map component for Form thumbnail
function MiniFormMap({ lat, lng, isSuccess = false }) {
  const containerId = isSuccess ? 'mini-map-success' : 'mini-map-form';
  const mapRef = useRef(null);

  useEffect(() => {
    if (!lat || !lng) return;
    
    // clear container if initialized
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerId, {
      center: [lat, lng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { maxZoom: 19 }
    ).addTo(map);

    L.marker([lat, lng]).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng]);

  return <div id={containerId} className="w-full h-[180px] rounded-lg border border-borderGlow/60 mt-2.5 z-10 relative" />;
}

export default function Report({ setActiveTab }) {
  const [activeLang, setActiveLang] = useState('en');
  const t = translations[activeLang] || translations.en;

  // Form Fields State
  const [manualCityId, setManualCityId] = useState('mumbai');
  const [landmarkText, setLandmarkText] = useState('');
  const [phoneText, setPhoneText] = useState('');
  const [emergencyType, setEmergencyType] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  
  // Geolocation states
  const [coords, setCoords] = useState({ lat: 20.5937, lng: 78.9629 });
  const [isLocating, setIsLocating] = useState(false);
  const [locatedAddress, setLocatedAddress] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);

  // Submission & Success states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Voice Speech Recognition Ref
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  // Form validations
  const [validationError, setValidationError] = useState('');

  // 7-Language Mappings
  const languagesList = [
    { code: 'en', name: 'English', flag: '🇮🇳' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
    { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' },
    { code: 'bn', name: 'বাংলা', flag: '🇮🇳' },
    { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' }
  ];

  // GPS geolocation detector
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser does not support geolocation.");
      return;
    }
    setIsLocating(true);
    setLocatedAddress(t.detecting);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });

        try {
          const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`;
          const response = await fetch(url);
          const data = await response.json();
          
          if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.suburb || 'Unknown';
            const state = data.address.state || 'Unknown';
            const district = data.address.state_district || '';
            
            // Auto fill manual select city dropdown if matched
            const matched = CITIES_LIST.find(
              c => c.name.toLowerCase().includes(city.toLowerCase()) || 
                   city.toLowerCase().includes(c.name.toLowerCase())
            );
            if (matched) {
              setManualCityId(matched.id);
            }
            
            setLocatedAddress(`${city}, ${state} (${district})`);
          } else {
            setLocatedAddress(`Coords: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`);
          }
        } catch (e) {
          console.warn('Reverse geocoding address failed:', e.message);
          setLocatedAddress(`Coords: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn('GPS location retrieval failed:', err.message);
        setLocatedAddress(t.locationDenied);
        setIsLocating(false);
      }
    );
  };

  // Microphone Voice input transcribe
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech recognition not supported in this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    
    // Map language code to SpeechRecognition locale
    const localeMap = {
      en: 'en-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      ml: 'ml-IN',
      bn: 'bn-IN',
      kn: 'kn-IN'
    };
    rec.lang = localeMap[activeLang] || 'en-IN';

    rec.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setDescription(prev => (prev ? prev + ' ' + transcript : transcript));
    };

    rec.onerror = (err) => {
      console.warn("Speech recognition error:", err);
      setIsRecording(false);
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = rec;
    rec.start();
    setIsRecording(true);
  };

  // Photo drag and drop preview handler
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Emergency Intake
  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!emergencyType) {
      setValidationError(t.typeRequired);
      return;
    }
    if (!severity) {
      setValidationError(t.severityRequired);
      return;
    }
    if (!description.trim()) {
      setValidationError(t.descRequired);
      return;
    }

    setIsSubmitting(true);

    try {
      const targetCity = CITIES_LIST.find(c => c.id === manualCityId);
      
      const payload = {
        text: description,
        language: t.langName,
        lat: coords.lat !== 20.5937 ? coords.lat : (targetCity ? targetCity.lat : 20.5937),
        lng: coords.lng !== 78.9629 ? coords.lng : (targetCity ? targetCity.lng : 78.9629)
      };

      const result = await classifyReport(payload.text, payload.language, payload.lat, payload.lng);
      setSuccessData(result);

    } catch (err) {
      console.error(err);
      setValidationError('Failed to transmit alert telemetry. Check network status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setEmergencyType('');
    setSeverity('');
    setDescription('');
    setLandmarkText('');
    setPhoneText('');
    setCoords({ lat: 20.5937, lng: 78.9629 });
    setLocatedAddress('');
    setPhotoPreview(null);
    setSuccessData(null);
    setValidationError('');
  };

  const typeIcons = {
    Flood: '🌊',
    Fire: '🔥',
    Medical: '🚑',
    Accident: '🚗',
    Power: '⚡',
    Structure: '🏗'
  };

  return (
    <PageTransition>
      <div className="w-full max-w-6xl text-left">
        
        {/* Success View */}
        {successData ? (
          <div className="w-full max-w-2xl mx-auto bg-bgCard border border-borderGlow rounded-lg p-6 flex flex-col gap-5 shadow-2xl items-stretch animate-[scaleIn_0.3s_ease-out]">
            
            <div className="flex flex-col items-center justify-center text-center gap-2 border-b border-borderGlow/60 pb-4">
              <span className="w-12 h-12 rounded-full bg-green-500/10 text-low border border-green-500/30 flex items-center justify-center text-2xl font-extrabold select-none animate-bounce">
                ✓
              </span>
              <h2 className="font-display font-extrabold text-2xl text-accentCyan uppercase tracking-wider">
                {t.reportReceived}
              </h2>
              <span className="text-xs font-mono text-textMuted tracking-widest mt-1">
                TRACKING ID: <span className="text-accentCyan font-bold">{successData.trackingId}</span>
              </span>
            </div>

            {/* Classification Stats */}
            <div className="bg-bgPrimary/50 p-4 rounded-lg border border-borderGlow/40 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
                  CLASSIFICATION:
                </span>
                <span className="px-2.5 py-0.5 rounded bg-accentCyan/15 text-accentCyan text-xs font-extrabold uppercase border border-accentCyan/30">
                  {typeIcons[successData.classification.type] || '🚨'} {successData.classification.type}
                </span>
                <span className="px-2.5 py-0.5 rounded bg-critical/15 text-critical text-xs font-extrabold uppercase border border-critical/30">
                  {successData.classification.severity}
                </span>
              </div>

              {/* Summaries */}
              <div className="flex flex-col gap-2 border-t border-borderGlow/30 pt-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-textMuted uppercase">English Summary</span>
                  <p className="text-xs text-textPrimary leading-relaxed mt-0.5 font-medium">
                    {successData.classification.summary_english}
                  </p>
                </div>

                {successData.classification.summary_regional && successData.classification.summary_regional !== successData.classification.summary_english && (
                  <div className="flex flex-col mt-1">
                    <span className="text-[10px] font-bold text-textMuted uppercase">Regional Summary ({t.langName})</span>
                    <p className="text-xs text-textPrimary leading-relaxed mt-0.5 font-medium">
                      {successData.classification.summary_regional}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Location & Coordinates */}
            <div className="flex justify-between items-center text-xs">
              <div className="flex flex-col">
                <span className="font-bold text-textMuted uppercase tracking-wider">Location Confirmed</span>
                <span className="text-textPrimary font-semibold mt-0.5">
                  {successData.classification.city}, {successData.classification.state}
                </span>
              </div>
              {coords.lat !== 20.5937 && (
                <div className="flex flex-col text-right">
                  <span className="font-bold text-textMuted uppercase tracking-wider">Coordinates</span>
                  <span className="font-mono text-textPrimary font-semibold mt-0.5">
                    {coords.lat.toFixed(4)}°N, {coords.lng.toFixed(4)}°E
                  </span>
                </div>
              )}
            </div>

            {/* Success Map */}
            <MiniFormMap lat={coords.lat} lng={coords.lng} isSuccess={true} />

            {/* Recipient Forward Logs */}
            <div className="flex flex-col gap-1.5 border-t border-borderGlow/40 pt-3">
              <span className="text-[10px] font-extrabold text-textMuted uppercase tracking-wider">
                Authority routing details:
              </span>
              <div className="flex flex-col gap-1 text-xs text-low font-medium">
                <span>✓ Forwarded to: {successData.classification.city} {t.sdma}</span>
                <span>✓ Forwarded to: {t.cmdCenter}</span>
                <span>✓ Forwarded to: {successData.classification.recommended_authority} {t.dispatchTeam}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t border-borderGlow/40 pt-4">
              <button
                onClick={handleResetForm}
                className="flex-1 py-3 bg-bgPrimary border border-borderGlow text-textPrimary hover:text-white rounded-lg text-xs font-bold font-display cursor-pointer transition-colors"
              >
                📋 {t.reportAnother}
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="flex-1 py-3 bg-accentCyan hover:bg-cyan-400 text-bgPrimary rounded-lg text-xs font-extrabold font-display cursor-pointer transition-colors"
              >
                🗺 {t.viewDashboard}
              </button>
            </div>

          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6 items-stretch">
            
            {/* LEFT COLUMN: Intake Form */}
            <form onSubmit={handleSubmit} className="w-full md:w-[62%] bg-bgCard border border-borderGlow rounded-lg p-5 flex flex-col gap-4 shadow-xl">
              
              {/* Top Title */}
              <div className="border-b border-borderGlow/60 pb-3">
                <h1 className="font-display font-extrabold text-2xl text-accentCyan tracking-wider uppercase">
                  {t.title}
                </h1>
                <span className="text-[10px] font-semibold text-textMuted uppercase tracking-widest leading-none mt-1">
                  {t.subtitle}
                </span>
              </div>

              {/* Language Selector */}
              <div className="flex flex-wrap gap-1 border-b border-borderGlow/40 pb-3.5">
                {languagesList.map(lang => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setActiveLang(lang.code)}
                    className={`px-3 py-1.5 text-xs rounded flex items-center gap-1.5 cursor-pointer border transition-all ${
                      activeLang === lang.code
                        ? 'bg-accentCyan border-accentCyan text-bgPrimary font-bold shadow-lg animate-glow-pulse'
                        : 'bg-bgPrimary border-borderGlow/40 text-textMuted hover:text-white'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>

              {/* Geolocation Detect block */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
                  Incident Location
                </span>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isLocating}
                  className="w-full py-3 rounded-lg bg-accentCyan hover:bg-cyan-400 text-bgPrimary font-extrabold text-xs tracking-wider transition-all cursor-pointer font-display"
                >
                  {isLocating ? t.detecting : t.detectLocation}
                </button>

                {/* Display Address or select manually */}
                {locatedAddress && (
                  <span className="text-xs font-bold text-low bg-green-500/10 border border-green-500/30 p-2 rounded leading-snug">
                    ✓ {locatedAddress}
                  </span>
                )}

                {/* Manual Dropdown fallback */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-textMuted uppercase">
                    Select Nearest Monitored City
                  </label>
                  <select
                    value={manualCityId}
                    onChange={(e) => setManualCityId(e.target.value)}
                    className="w-full h-10 bg-bgPrimary border border-borderGlow rounded-lg px-3 text-xs text-textPrimary focus:outline-none focus:border-accentCyan cursor-pointer"
                  >
                    {CITIES_LIST.map(city => (
                      <option key={city.id} value={city.id} className="bg-bgCard">
                        {city.name} ({city.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Landmark */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-textMuted uppercase">Landmark (Optional)</label>
                    <input
                      type="text"
                      value={landmarkText}
                      onChange={(e) => setLandmarkText(e.target.value)}
                      placeholder="e.g. Near Station, Block A"
                      className="w-full h-10 bg-bgPrimary border border-borderGlow rounded-lg px-3 text-xs text-textPrimary placeholder:text-textMuted focus:outline-none"
                    />
                  </div>
                  {/* Phone */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-textMuted uppercase">Contact Phone (Optional)</label>
                    <input
                      type="text"
                      value={phoneText}
                      onChange={(e) => setPhoneText(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full h-10 bg-bgPrimary border border-borderGlow rounded-lg px-3 text-xs text-textPrimary placeholder:text-textMuted focus:outline-none"
                    />
                  </div>
                </div>

                {/* Form mini leaflet map when GPS is triggered */}
                {coords.lat !== 20.5937 && (
                  <MiniFormMap lat={coords.lat} lng={coords.lng} />
                )}
              </div>

              {/* Emergency Type Grid */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
                  Emergency Incident Type
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['Flood', 'Fire', 'Medical', 'Accident', 'Power', 'Structure'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEmergencyType(type)}
                      className={`p-2.5 rounded-lg border text-left flex flex-col items-center sm:items-start gap-1 cursor-pointer transition-all duration-200 ${
                        emergencyType === type
                          ? 'border-accentCyan bg-bgPrimary text-white shadow-md shadow-accentCyan/10 glow-cyan-border'
                          : 'bg-bgPrimary border-borderGlow/60 text-textMuted hover:border-accentCyan/30 hover:text-white'
                      }`}
                    >
                      <span className="text-2xl">{typeIcons[type]}</span>
                      <span className="text-[10px] font-bold tracking-wider uppercase leading-none">
                        {type}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity scale buttons */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
                  Severity self-assessment
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { code: 'Critical', color: 'border-[#ff2d55]/30 text-[#ff2d55] hover:bg-[#ff2d55]/10', active: 'bg-[#ff2d55]/20 border-[#ff2d55] text-critical' },
                    { code: 'High', color: 'border-[#ff6b00]/30 text-[#ff6b00] hover:bg-[#ff6b00]/10', active: 'bg-[#ff6b00]/20 border-[#ff6b00] text-high' },
                    { code: 'Medium', color: 'border-[#ffd700]/30 text-[#ffd700] hover:bg-[#ffd700]/10', active: 'bg-[#ffd700]/20 border-[#ffd700] text-medium' },
                    { code: 'Low', color: 'border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/10', active: 'bg-[#00ff88]/20 border-[#00ff88] text-low' }
                  ].map(item => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setSeverity(item.code)}
                      className={`py-2.5 text-xs font-bold rounded-lg border text-center cursor-pointer transition-all ${
                        severity === item.code ? item.active : `bg-bgPrimary ${item.color}`
                      }`}
                    >
                      {item.code}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description & Speech Mic */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
                    {t.descriptionLabel || 'Incident Description'}
                  </span>
                  {/* Web Speech microphone button */}
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                      isRecording 
                        ? 'bg-critical/20 border border-critical text-critical animate-pulse font-extrabold'
                        : 'bg-bgPrimary border border-borderGlow text-textMuted hover:text-white'
                    }`}
                  >
                    {isRecording ? t.voiceStop : t.voiceStart}
                  </button>
                </div>
                <textarea
                  rows={5}
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.descPlaceholder}
                  className="w-full p-3 bg-bgPrimary border border-borderGlow rounded-lg text-xs text-textPrimary focus:outline-none focus:border-accentCyan placeholder:text-textMuted leading-relaxed resize-y"
                />
                <div className="flex justify-between items-center text-[10px] text-textMuted font-bold uppercase mt-0.5">
                  <span>Describe what you see in detail. More detail = faster response.</span>
                  <span>{description.length}/500</span>
                </div>
              </div>

              {/* Photo Upload evidence dropzone */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
                  Photo Evidence (Optional)
                </span>
                <label className="border-2 border-dashed border-borderGlow/60 hover:border-accentCyan/50 rounded-lg p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center relative overflow-hidden bg-bgPrimary/20">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  {photoPreview ? (
                    <img src={photoPreview} alt="Evidence" className="h-24 w-auto rounded object-cover shadow-lg" />
                  ) : (
                    <>
                      <span className="text-2xl animate-float">📸</span>
                      <span className="text-xs text-textPrimary font-semibold">
                        Drag photo here or click to upload
                      </span>
                      <span className="text-[10px] text-textMuted uppercase">
                        Evidence strengthens AI classification accuracy
                      </span>
                    </>
                  )}
                </label>
              </div>

              {/* Error messages */}
              {validationError && (
                <div className="p-3 bg-critical/10 border border-critical/30 rounded text-xs font-bold text-critical">
                  ⚠ {validationError}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[52px] bg-accentCyan hover:bg-cyan-400 text-bgPrimary font-extrabold text-sm tracking-wider rounded-lg transition-colors cursor-pointer font-display shadow-lg disabled:opacity-50 disabled:cursor-not-allowed uppercase"
              >
                {isSubmitting ? t.analyzing : t.submitButton}
              </button>

            </form>

            {/* RIGHT COLUMN: System Info Panel */}
            <div className="w-full md:w-[38%] flex flex-col gap-4 items-stretch">
              {/* Next Steps card */}
              <div className="bg-bgCard border border-borderGlow rounded-lg p-5 flex flex-col gap-4 shadow-xl">
                <span className="font-display font-extrabold text-xs text-accentCyan tracking-wider border-b border-borderGlow pb-2">
                  WHAT HAPPENS NEXT
                </span>
                <div className="flex flex-col gap-3 text-xs leading-relaxed font-medium">
                  <div className="flex items-start gap-2.5">
                    <span className="text-accentCyan font-bold">1.</span>
                    <p className="text-textPrimary">🤖 <strong>AI classification</strong> evaluates report metadata and routes within 3 seconds.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-accentCyan font-bold">2.</span>
                    <p className="text-textPrimary">📍 <strong>GPS coordinates</strong> cross-reference Nominatim registry databases.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-accentCyan font-bold">3.</span>
                    <p className="text-textPrimary">⚡ <strong>Telemetry indicators</strong> populate the national incident feed immediately.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-accentCyan font-bold">4.</span>
                    <p className="text-textPrimary">🚨 <strong>State authorities</strong> receive secure push notifications.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-accentCyan font-bold">5.</span>
                    <p className="text-textPrimary">📱 <strong>Unique tracking keys</strong> issue for offline dispatch logging.</p>
                  </div>
                </div>
              </div>

              {/* Emergency Contacts */}
              <div className="bg-bgCard border border-borderGlow rounded-lg p-5 flex flex-col gap-3 shadow-xl">
                <span className="font-display font-extrabold text-xs text-accentCyan tracking-wider border-b border-borderGlow pb-2">
                  EMERGENCY HELPLINES
                </span>
                <div className="flex flex-col gap-2.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-borderGlow/40">
                    <span className="text-textMuted font-medium">National Disaster</span>
                    <span className="font-bold text-textPrimary">1078</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-borderGlow/40">
                    <span className="text-textMuted font-medium">NDRF Control Room</span>
                    <span className="font-bold text-textPrimary">011-24363260</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-borderGlow/40">
                    <span className="text-textMuted font-medium">Police Patrol</span>
                    <span className="font-bold text-textPrimary">100</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-borderGlow/40">
                    <span className="text-textMuted font-medium">Fire Brigade</span>
                    <span className="font-bold text-textPrimary">101</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-textMuted font-medium">108 Ambulance</span>
                    <span className="font-bold text-textPrimary">108</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </PageTransition>
  );
}
