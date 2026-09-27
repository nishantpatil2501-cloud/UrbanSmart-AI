with open('src/pages/SatelliteCompare.jsx', 'w', encoding='utf-8') as f:
    f.write(r'''import { useState, useRef, useEffect, useCallback } from 'react';
import { Layers, ScanSearch, Calendar, ArrowRight, CheckCircle2, AlertTriangle, MapPin, Sparkles, SlidersHorizontal, UploadCloud, FileImage, Cpu } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polygon, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { PRESET_PLACES } from '../context/LocationContext';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const esriSatellite = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

function tilePixelToLatLng(tileX, tileY, zoom, pixelX, pixelY) {
  const n = Math.pow(2, zoom);
  const lon = ((tileX + pixelX / 256) / n) * 360 - 180;
  const lat_rad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (tileY + pixelY / 256) / n)));
  const lat = (lat_rad * 180) / Math.PI;
  return [lat, lon];
}

const SatelliteCompare = () => {
  const [selectedArea, setSelectedArea] = useState(PRESET_PLACES[0].name);
  const [center, setCenter] = useState([PRESET_PLACES[0].lat, PRESET_PLACES[0].lng]);
  const [analysisStatus, setAnalysisStatus] = useState('idle');
  const [apiError, setApiError] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [maskUrl, setMaskUrl] = useState(null);
  const [histDate, setHistDate] = useState('2023-01-15');
  const [currDate, setCurrDate] = useState('2023-10-25');
  
  const moveTimeout = useRef(null);
  const isAnalyzing = useRef(false);
  const lastAnalyzed = useRef(null);
  const isProgrammaticMove = useRef(false);

  const analyzeCenter = useCallback(async (lat, lng, force = false) => {
    const coordStr = ${lat.toFixed(4)},;
    if (isAnalyzing.current) return;
    if (!force && lastAnalyzed.current === coordStr) return;
    if (!force && analysisStatus === 'error') return;

    isAnalyzing.current = true;
    lastAnalyzed.current = coordStr;
    setAnalysisStatus('analyzing');
    setApiError(null);
    setBoxes([]);
    
    if (maskUrl) {
      URL.revokeObjectURL(maskUrl);
      setMaskUrl(null);
    }
    
    try {
      const zoom = 16;
      const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
      const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));

      const beforeUrl = esriSatellite.replace('{z}', zoom).replace('{x}', x).replace('{y}', y);
      const currentUrl = https://mt1.google.com/vt/lyrs=s&x=&y=&z=;

      const fetchAsFile = async (url, name) => {
        const res = await fetch(url);
        const blob = await res.blob();
        return new File([blob], name, { type: 'image/jpeg' });
      };

      const beforeFile = await fetchAsFile(beforeUrl, 'before.jpg');
      const currentFile = await fetchAsFile(currentUrl, 'current.jpg');

      const formData = new FormData();
      formData.append('before', beforeFile);
      formData.append('current', currentFile);

      const apiUrl = import.meta.env.VITE_ML_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(${apiUrl}/predict, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errMessage = HTTP  ;
        try {
          const errJson = await response.json();
          if (errJson.detail) errMessage = errJson.detail;
        } catch (_) {}
        throw new Error(errMessage);
      }

      const data = await response.json();
      const detectedBoxes = data.boxes || [];
      const base64Mask = data.mask_base64;

      if (detectedBoxes.length === 0) {
        setAnalysisStatus('no_changes');
      } else {
        const latLngBoxes = detectedBoxes.map(box => {
          const nw = tilePixelToLatLng(x, y, zoom, box[0], box[1]);
          const se = tilePixelToLatLng(x, y, zoom, box[0] + box[2], box[1] + box[3]);
          return {
            polygon: [
              [nw[0], nw[1]],
              [nw[0], se[1]],
              [se[0], se[1]],
              [se[0], nw[1]],
            ]
          };
        });
        setBoxes(latLngBoxes);
        setMaskUrl(base64Mask);
        setAnalysisStatus('success');
      }
    } catch (err) {
      console.error('ML API Error:', err);
      const targetApiUrl = import.meta.env.VITE_ML_API_URL || 'http://127.0.0.1:8000';
      setApiError(
        ML API Unavailable: Unable to connect to /predict. Ensure the ML backend is running. Detail: 
      );
      setAnalysisStatus('error');
    } finally {
      isAnalyzing.current = false;
    }
  }, [maskUrl, analysisStatus]);

  const handleAreaChange = (e) => {
    const place = PRESET_PLACES.find(p => p.name === e.target.value);
    if (place) {
      setSelectedArea(place.name);
      isProgrammaticMove.current = true;
      setCenter([place.lat, place.lng]);
      analyzeCenter(place.lat, place.lng, true);
    }
  };

  useEffect(() => {
    analyzeCenter(center[0], center[1], true);
    // eslint-disable-next-line
  }, []);

  function MapEvents() {
    useMapEvents({
      moveend: (e) => {
        if (isProgrammaticMove.current) {
          isProgrammaticMove.current = false;
          return;
        }
        const c = e.target.getCenter();
        if (moveTimeout.current) clearTimeout(moveTimeout.current);
        moveTimeout.current = setTimeout(() => {
          analyzeCenter(c.lat, c.lng);
        }, 1000);
      }
    });
    return null;
  }

  function ChangeView({ center }) {
    const map = useMap();
    useEffect(() => {
      map.setView(center, 16);
    }, [center[0], center[1], map]);
    return null;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
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
            {PRESET_PLACES.map((p) => (
              <option key={p.name} value={p.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                {p.name}, Pune
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

      {/* Map Panels Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* HISTORICAL MAP PANEL */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 overflow-hidden flex flex-col">
          <div className="bg-slate-50/80 dark:bg-slate-800/60 px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                Historical Baseline – {histDate}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
              Esri World Imagery
            </span>
          </div>

          <div className="flex-1 min-h-[350px] relative z-0 p-1">
            <div className="h-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/60 relative">
              <MapContainer center={center} zoom={16} scrollWheelZoom={false} className="w-full h-full" zoomControl={false} dragging={false}>
                <ChangeView center={center} />
                <TileLayer url={esriSatellite} maxZoom={19} attribution="Esri World Imagery" />
              </MapContainer>
            </div>
          </div>
        </div>

        {/* CURRENT MAP PANEL */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 overflow-hidden flex flex-col">
          <div className="bg-blue-50/80 dark:bg-blue-900/20 px-4 py-3 border-b border-blue-100/80 dark:border-blue-800/60 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="font-bold text-blue-900 dark:text-blue-100 text-xs sm:text-sm">
                Current Pass – {currDate}
              </span>
            </div>
            <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-md">
              Google Satellite
            </span>
          </div>

          <div className="flex-1 min-h-[350px] relative z-0 p-1">
            <div className="h-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/60 relative">
              <MapContainer center={center} zoom={16} scrollWheelZoom={true} className="w-full h-full">
                <ChangeView center={center} />
                <MapEvents />
                <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" maxZoom={19} attribution="Google Maps" />
                {boxes.map((b, i) => (
                  <Polygon
                    key={i}
                    positions={b.polygon}
                    pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.3, weight: 3 }}
                  />
                ))}
              </MapContainer>
              
              {/* Overlay states */}
              {analysisStatus === 'analyzing' && (
                <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-[1000]">
                  <span className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mb-3"></span>
                  <span className="text-white font-bold text-sm tracking-wide">Analyzing...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Output Dashboard */}
      {(analysisStatus === 'success' || analysisStatus === 'no_changes') && (
        <div className="mt-8 bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Change Analysis Report</h2>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Detected Regions</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{boxes.length}</p>
                {analysisStatus === 'no_changes' && (
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-2">No detected changes</p>
                )}
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Status</p>
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Analysis Complete</span>
                </div>
              </div>
              
              <div className="col-span-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-2">Imagery Details</p>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-xs">Before Pass</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{histDate}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <div className="text-right">
                    <span className="text-slate-500 dark:text-slate-400 block text-xs">Current Pass</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{currDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {maskUrl && (
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="w-24 h-24 rounded-xl overflow-hidden border border-rose-500/50 bg-black p-0.5 shadow-md">
                  <img src={maskUrl} alt="ChangeFormer PNG Mask" className="w-full h-full object-contain" />
                </div>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold tracking-wider">
                  MODEL OUTPUT
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SatelliteCompare;
''')
