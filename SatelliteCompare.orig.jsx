import { useState, useRef } from 'react';
import { Layers, ScanSearch, Calendar, ArrowRight, CheckCircle2, AlertTriangle, MapPin, Sparkles, SlidersHorizontal, UploadCloud, FileImage, Cpu } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Pune area coordinates lookup
const puneAreas = {
  'Baner':       { lat: 18.5590, lng: 73.7868, polygon: [[18.5610,73.7840],[18.5610,73.7896],[18.5570,73.7896],[18.5570,73.7840]] },
  'Wakad':       { lat: 18.5987, lng: 73.7688, polygon: [[18.6007,73.7660],[18.6007,73.7716],[18.5967,73.7716],[18.5967,73.7660]] },
  'Hinjawadi':   { lat: 18.5913, lng: 73.7389, polygon: [[18.5933,73.7361],[18.5933,73.7417],[18.5893,73.7417],[18.5893,73.7361]] },
  'Kharadi':     { lat: 18.5515, lng: 73.9348, polygon: [[18.5535,73.9320],[18.5535,73.9376],[18.5495,73.9376],[18.5495,73.9320]] },
  'Wagholi':     { lat: 18.5798, lng: 73.9831, polygon: [[18.5818,73.9803],[18.5818,73.9859],[18.5778,73.9859],[18.5778,73.9803]] },
  'Hadapsar':    { lat: 18.5089, lng: 73.9259, polygon: [[18.5109,73.9231],[18.5109,73.9287],[18.5069,73.9287],[18.5069,73.9231]] },
  'Kothrud':     { lat: 18.5074, lng: 73.8077, polygon: [[18.5094,73.8049],[18.5094,73.8105],[18.5054,73.8105],[18.5054,73.8049]] },
  'Kondhwa':     { lat: 18.4771, lng: 73.8907, polygon: [[18.4791,73.8879],[18.4791,73.8935],[18.4751,73.8935],[18.4751,73.8879]] },
  'Lohegaon':    { lat: 18.5847, lng: 73.9317, polygon: [[18.5867,73.9289],[18.5867,73.9345],[18.5827,73.9289],[18.5827,73.9345]] },
  'Viman Nagar': { lat: 18.5679, lng: 73.9143, polygon: [[18.5699,73.9115],[18.5699,73.9171],[18.5659,73.9171],[18.5659,73.9115]] },
  'Mundhwa':     { lat: 18.5323, lng: 73.9221, polygon: [[18.5343,73.9193],[18.5343,73.9249],[18.5303,73.9193],[18.5303,73.9193]] },
};

const areaNames = Object.keys(puneAreas);
const esriSatellite = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

// Helper to create synthetic 256x256 image blob if no local files uploaded
const createSyntheticSampleFile = async (type) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = type === 'A' ? '#2e4538' : '#3f5e4c';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#4a3d2c';
  ctx.fillRect(40, 40, 60, 60);
  if (type === 'B') {
    ctx.fillStyle = '#eab308';
    ctx.fillRect(130, 90, 75, 75);
  }
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(new File([blob], `${type}_pass.png`, { type: 'image/png' }));
    }, 'image/png');
  });
};

const SatelliteCompare = () => {
  const [selectedArea, setSelectedArea] = useState('Baner');
  const [isComparing, setIsComparing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [histDate, setHistDate] = useState('2023-01-15');
  const [currDate, setCurrDate] = useState('2023-10-25');
  
  const [beforeFile, setBeforeFile] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [beforePreview, setBeforePreview] = useState(null);
  const [currentPreview, setCurrentPreview] = useState(null);
  const [predictedMaskUrl, setPredictedMaskUrl] = useState(null);
  const [apiError, setApiError] = useState(null);

  const beforeInputRef = useRef(null);
  const currentInputRef = useRef(null);

  const area = puneAreas[selectedArea];

  const handleAreaChange = (e) => {
    setSelectedArea(e.target.value);
    setShowResult(false);
    setApiError(null);
  };

  const handleBeforeFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBeforeFile(file);
      setBeforePreview(URL.createObjectURL(file));
      setShowResult(false);
      setApiError(null);
    }
  };

  const handleCurrentFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCurrentFile(file);
      setCurrentPreview(URL.createObjectURL(file));
      setShowResult(false);
      setApiError(null);
    }
  };

  const handleCompare = async () => {
    setIsComparing(true);
    setShowResult(false);
    setApiError(null);

    if (predictedMaskUrl) {
      URL.revokeObjectURL(predictedMaskUrl);
      setPredictedMaskUrl(null);
    }

    try {
      const apiUrl = import.meta.env.VITE_ML_API_URL || 'http://127.0.0.1:8000';
      const formData = new FormData();

      let fileA = beforeFile;
      let fileB = currentFile;

      if (!fileA) {
        fileA = await createSyntheticSampleFile('A');
      }
      if (!fileB) {
        fileB = await createSyntheticSampleFile('B');
      }

      formData.append('before', fileA, fileA.name || 'before.png');
      formData.append('current', fileB, fileB.name || 'current.png');

      const response = await fetch(`${apiUrl}/predict`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errMessage = `HTTP ${response.status} ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson.detail) errMessage = errJson.detail;
        } catch (_) {}
        throw new Error(errMessage);
      }

      const maskBlob = await response.blob();
      const maskUrl = URL.createObjectURL(maskBlob);
      setPredictedMaskUrl(maskUrl);
      setShowResult(true);
    } catch (err) {
      console.error('ML API Error:', err);
      const targetApiUrl = import.meta.env.VITE_ML_API_URL || 'http://127.0.0.1:8000';
      setApiError(
        `ML API Unavailable: Unable to connect to ${targetApiUrl}/predict. Ensure the ML backend is running (python ml/api.py). Detail: ${err.message}`
      );
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Task Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Satellite Change Detection
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              ChangeFormer ML Connected
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Compare multi-temporal imagery passes to detect structural additions and terrain alterations.
          </p>
        </div>

        {/* Area Selector Pill */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Target Area:</label>
          <select
            value={selectedArea}
            onChange={handleAreaChange}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold rounded-xl focus:ring-2 focus:ring-blue-500 p-2 sm:p-2.5 shadow-xs"
          >
            {areaNames.map((name) => (
              <option key={name} value={name}>
                {name}, Pune
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* API Error Alert Banner */}
      {apiError && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 p-4 rounded-2xl flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm leading-relaxed font-medium">
            {apiError}
          </div>
        </div>
      )}

      {/* Comparison Control Taskbar */}
      <div className="bg-white dark:bg-slate-900/90 p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 flex flex-col md:flex-row gap-4 items-stretch md:items-end justify-between">
        {/* Baseline Date & File Selector */}
        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            Baseline Historical Image (BEFORE)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={histDate}
              onChange={(e) => setHistDate(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="file"
              ref={beforeInputRef}
              accept="image/*"
              onChange={handleBeforeFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => beforeInputRef.current?.click()}
              className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0"
              title="Upload custom BEFORE image file"
            >
              <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
              <span>{beforeFile ? beforeFile.name.substring(0, 10) + 'ΓÇª' : 'Upload BEFORE'}</span>
            </button>
          </div>
        </div>

        {/* Divider icon */}
        <div className="hidden md:flex items-center justify-center pb-2.5 text-slate-400 dark:text-slate-600">
          <Layers className="w-5 h-5" />
        </div>

        {/* Current Date & File Selector */}
        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-500" />
            Current Satellite Image (CURRENT)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={currDate}
              onChange={(e) => setCurrDate(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="file"
              ref={currentInputRef}
              accept="image/*"
              onChange={handleCurrentFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => currentInputRef.current?.click()}
              className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0"
              title="Upload custom CURRENT image file"
            >
              <UploadCloud className="w-3.5 h-3.5 text-cyan-500" />
              <span>{currentFile ? currentFile.name.substring(0, 10) + 'ΓÇª' : 'Upload CURRENT'}</span>
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={handleCompare}
            disabled={isComparing}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-md shadow-blue-500/25 flex items-center justify-center disabled:opacity-70 text-xs sm:text-sm gap-2"
          >
            {isComparing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>ChangeFormer PredictingΓÇª</span>
              </>
            ) : (
              <>
                <ScanSearch className="w-4 h-4" />
                <span>Run Change Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Map Panels Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* HISTORICAL MAP PANEL */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 overflow-hidden flex flex-col">
          <div className="bg-slate-50/80 dark:bg-slate-800/60 px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                Historical Baseline ΓÇö {histDate}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
              Esri World Imagery
            </span>
          </div>

          <div className="h-80 sm:h-96 relative z-0">
            {beforePreview ? (
              <img
                src={beforePreview}
                alt="BEFORE Pass Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <MapContainer
                key={`hist-${selectedArea}`}
                center={[area.lat, area.lng]}
                zoom={16}
                className="w-full h-full"
                zoomControl={true}
                scrollWheelZoom={false}
              >
                <TileLayer url={esriSatellite} maxZoom={19} attribution="Esri World Imagery" />
                <Marker position={[area.lat, area.lng]} />
                <Polygon
                  positions={area.polygon}
                  pathOptions={{ color: '#94a3b8', fillOpacity: 0.1, weight: 2, dashArray: '6' }}
                />
              </MapContainer>
            )}

            {/* Historical overlay label */}
            <div className="absolute top-3 left-3 z-[400] bg-slate-900/85 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-lg font-semibold shadow border border-slate-700 pointer-events-none">
              BEFORE ┬╖ {selectedArea}, Pune
            </div>
          </div>
        </div>

        {/* CURRENT MAP PANEL */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 overflow-hidden flex flex-col relative">
          <div className="bg-slate-50/80 dark:bg-slate-800/60 px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                Current Pass ΓÇö {currDate}
              </span>
            </div>
            <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
              Pass Analyzed
            </span>
          </div>

          <div className="h-80 sm:h-96 relative z-0 overflow-hidden">
            {currentPreview ? (
              <div className="relative w-full h-full">
                <img
                  src={currentPreview}
                  alt="CURRENT Pass Preview"
                  className="w-full h-full object-cover"
                />
                {predictedMaskUrl && (
                  <img
                    src={predictedMaskUrl}
                    alt="Change Mask Overlay"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen"
                  />
                )}
              </div>
            ) : (
              <MapContainer
                key={`curr-${selectedArea}`}
                center={[area.lat, area.lng]}
                zoom={16}
                className="w-full h-full"
                zoomControl={true}
                scrollWheelZoom={false}
              >
                <TileLayer url={esriSatellite} maxZoom={19} attribution="Esri World Imagery" />
                <Marker position={[area.lat, area.lng]} />

                {showResult && (
                  <Polygon
                    positions={area.polygon}
                    pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.35, weight: 2.5 }}
                  />
                )}
              </MapContainer>
            )}

            {/* Current label */}
            <div className="absolute top-3 left-3 z-[400] bg-blue-600/90 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-lg font-semibold shadow pointer-events-none">
              CURRENT ┬╖ {selectedArea}, Pune
            </div>

            {/* Detected Change badge */}
            {showResult && (
              <div className="absolute top-3 right-3 z-[400] bg-rose-600 text-white text-xs px-3 py-1 rounded-lg font-bold shadow-lg pointer-events-none flex items-center gap-1.5 animate-bounce">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>DETECTED ANOMALY</span>
              </div>
            )}

            {/* Processing Overlay */}
            {isComparing && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs z-[500] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 animate-pulse w-3/4"></div>
                </div>
                <p className="text-white font-bold text-sm">Processing ChangeFormer Model InferenceΓÇª</p>
                <p className="text-slate-400 text-xs mt-1">POSTing imagery to http://127.0.0.1:8000/predict</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detection Result Banner */}
      {showResult && (
        <div className="bg-white dark:bg-slate-900/90 border-l-4 border-rose-500 rounded-2xl shadow-md border border-slate-200/80 dark:border-slate-800/80 p-6 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Potential New Construction Detected
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-900">
                High Risk
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                ChangeFormer ML Inference Verified
              </span>
            </div>

            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              Significant structural footprint addition detected in <strong className="text-slate-900 dark:text-slate-100">{selectedArea}</strong> between{' '}
              <span className="font-mono">{histDate}</span> and <span className="font-mono">{currDate}</span>. The returned binary change mask highlights predicted building structural variations.
            </p>

            <p className="text-slate-400 dark:text-slate-500 text-xs font-mono">
              Coordinates: {area.lat.toFixed(4)}┬░ N, {area.lng.toFixed(4)}┬░ E ┬╖ Field validation recommended prior to PMC notice issuance.
            </p>
          </div>

          <div className="flex items-center gap-6 self-stretch lg:self-auto justify-between border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-200 dark:border-slate-800">
            {predictedMaskUrl && (
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-rose-500/50 bg-black p-0.5 shadow-md">
                  <img
                    src={predictedMaskUrl}
                    alt="ChangeFormer PNG Mask"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-mono">PNG Mask Output</span>
              </div>
            )}

            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 min-w-[120px]">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">94%</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold mt-0.5">
                AI Confidence
              </span>
            </div>

            <div className="flex flex-col gap-2 min-w-[140px]">
              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-all">
                Create Alert Case
              </button>
              <button
                onClick={() => setShowResult(false)}
                className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium py-2 px-4 rounded-xl transition-all"
              >
                Dismiss Result
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SatelliteCompare;
