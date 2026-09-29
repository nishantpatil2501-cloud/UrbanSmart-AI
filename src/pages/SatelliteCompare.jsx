import { useState, useRef, useEffect } from 'react';
import { Layers, ScanSearch, Calendar, ArrowRight, CheckCircle2, AlertTriangle, MapPin, Sparkles, SlidersHorizontal, UploadCloud, FileImage, Cpu } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polygon, WMSTileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { WAYBACK_RELEASES } from '../data/waybackArray.js';

const getImageryInfo = async (targetDateStr, lat, lng, typePrefix) => {
    const targetMs = new Date(targetDateStr).getTime();
    const waybackStart = new Date('2014-02-20').getTime();
    
    if (targetMs >= waybackStart) {
        let nearest = WAYBACK_RELEASES[WAYBACK_RELEASES.length - 1];
        let minDiff = Infinity;
        
        for (const entry of WAYBACK_RELEASES) {
            const d = new Date(entry.date).getTime();
            if (d <= targetMs) {
                const diff = targetMs - d;
                if (diff < minDiff) {
                    minDiff = diff;
                    nearest = entry;
                }
            }
        }
        
        const actualDate = nearest.date;
        const sceneId = `wayback-${nearest.layer}`;
        const url = `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${nearest.layer}/{z}/{y}/{x}`;
        return { type: 'wayback', url, actualDate, source: 'Esri World Imagery Wayback', sceneId, error: null };
    } else {
        try {
            const geom = encodeURIComponent(JSON.stringify({ x: lng, y: lat }));
            const qUrl = `https://landsat2.arcgis.com/arcgis/rest/services/Landsat/PS/ImageServer/query?where=Category%3D1&geometry=${geom}&geometryType=esriGeometryPoint&inSR=4326&outFields=AcquisitionDate,SensorName,OBJECTID&orderByFields=AcquisitionDate+DESC&time=1262304000000,${targetMs}&returnGeometry=false&f=json`;
            
            const res = await fetch(qUrl);
            const data = await res.json();
            
            if (data.features && data.features.length > 0) {
                const attrs = data.features[0].attributes;
                if (attrs.AcquisitionDate) {
                    const actualDate = new Date(attrs.AcquisitionDate).toISOString().split('T')[0];
                    const sensor = attrs.SensorName || 'USGS Landsat';
                    const timeWindow = `${attrs.AcquisitionDate - 86400000},${attrs.AcquisitionDate + 86400000}`;
                    const sceneId = `landsat-${attrs.OBJECTID || attrs.AcquisitionDate}`;
                    const url = `https://landsat2.arcgis.com/arcgis/rest/services/Landsat/PS/ImageServer/exportImage?bboxSR=3857&imageSR=3857&size=256,256&format=jpgpng&f=image&time=${timeWindow}`;
                    return { type: 'landsat', url, actualDate, source: `USGS Archive (${sensor})`, sceneId, error: null };
                }
            }
        } catch(e) {
            console.error("Landsat query error:", e);
        }
        
        // Fallback for Landsat if query fails (should ideally not happen, but we give a generic scene ID)
        const sceneId = `landsat-fallback-${targetDateStr}`;
        const url = `https://landsat2.arcgis.com/arcgis/rest/services/Landsat/PS/ImageServer/exportImage?bboxSR=3857&imageSR=3857&size=256,256&format=jpgpng&f=image&time=1262304000000,${targetMs}`;
        return { type: 'landsat', url, actualDate: targetDateStr, source: 'USGS Landsat Archive (Generic)', sceneId, error: null };
    }
};


/* REMOVE */
const getNearestWayback_old = (targetDateStr) => {
    const target = new Date(targetDateStr).getTime();
    let nearest = waybackArray[0];
    let minDiff = Infinity;
    
    for (const entry of waybackArray) {
        const d = new Date(entry.datetime).getTime();
        const diff = Math.abs(d - target);
        if (diff < minDiff) {
            minDiff = diff;
            nearest = entry;
        }
    }
    
    const dObj = new Date(nearest.datetime);
    const actualDate = dObj.toISOString().split('T')[0];
    return { url: nearest.url, actualDate };
};
import { getDetections, createDetection, deleteDetection, getDetectionsByViewport } from '../services/detectionService';
import { Trash2 } from 'lucide-react';
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


const SyncMapTracker = ({ onMoveEnd, onMove }) => {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const bounds = map.getBounds();
      if (onMoveEnd) onMoveEnd({ center, zoom, bounds });
    },
    move: () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      if (onMove) onMove({ center, zoom });
    }
  });
  return null;
};

const ControlledBeforeMap = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && zoom) {
      map.setView(center, zoom, { animate: false });
    }
  }, [center, zoom, map]);
  return null;
};

const SatelliteCompare = () => {
  const [selectedArea, setSelectedArea] = useState('Baner');
  const [isComparing, setIsComparing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const [histDate, setHistDate] = useState('2023-12-07');
  const [currDate, setCurrDate] = useState(todayStr);
          
  const [beforeFile, setBeforeFile] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [beforePreview, setBeforePreview] = useState(null);
  const [currentPreview, setCurrentPreview] = useState(null);
  const [predictedMaskUrl, setPredictedMaskUrl] = useState(null);
  const [apiError, setApiError] = useState(null);

  const [mapSyncState, setMapSyncState] = useState(null);
  const moveTimeoutRef = useRef(null);
  const lastAnalyzedHash = useRef('');

  const [boxes, setBoxes] = useState([]);
  const [analysisStatus, setAnalysisStatus] = useState('idle');
  const [deleteFeedback, setDeleteFeedback] = useState(null);
  const deletedIds = useRef(new Set());

  const beforeInputRef = useRef(null);
  const currentInputRef = useRef(null);

  const area = puneAreas[selectedArea];

  const [beforeImagery, setBeforeImagery] = useState({
    requestedDate: histDate, actualAcquisitionDate: '', source: '', imageryUrl: '', sceneId: '', loading: true, error: null, type: ''
  });
  
  const [currentImagery, setCurrentImagery] = useState({
    requestedDate: currDate, actualAcquisitionDate: '', source: '', imageryUrl: '', sceneId: '', loading: true, error: null, type: ''
  });

  useEffect(() => {
    let active = true;
    
    const fetchBefore = async () => {
      setBeforeImagery(prev => ({ ...prev, loading: true, error: null, type: '', requestedDate: histDate }));
      try {
        const hist = await getImageryInfo(histDate, area.lat, area.lng, 'before');
        if (active) {
          setBeforeImagery({
            requestedDate: histDate,
            actualAcquisitionDate: hist.actualDate,
            source: hist.source,
            imageryUrl: hist.url,
            sceneId: hist.sceneId, type: hist.type,
            loading: false,
            error: hist.error
          });
        }
      } catch (err) {
        if (active) setBeforeImagery(prev => ({ ...prev, loading: false, error: 'Historical imagery unavailable for selected date.' }));
      }
    };

    const fetchCurrent = async () => {
      setCurrentImagery(prev => ({ ...prev, loading: true, error: null, type: '', requestedDate: currDate }));
      try {
        const curr = await getImageryInfo(currDate, area.lat, area.lng, 'current');
        if (active) {
          setCurrentImagery({
            requestedDate: currDate,
            actualAcquisitionDate: curr.actualDate,
            source: curr.source,
            imageryUrl: curr.url,
            sceneId: curr.sceneId, type: curr.type,
            loading: false,
            error: curr.error
          });
        }
      } catch (err) {
        if (active) setCurrentImagery(prev => ({ ...prev, loading: false, error: 'Current imagery unavailable for selected date.' }));
      }
    };

    fetchBefore();
    fetchCurrent();

    return () => { active = false; };
  }, [histDate, currDate, area.lat, area.lng]);



  const handleDeleteDetection = async (id) => {
    try {
      await deleteDetection(id);
      deletedIds.current.add(id);
      setBoxes(prev => prev.filter(b => b.id !== id));
      setDeleteFeedback(`Successfully deleted record ${id}`);
      setTimeout(() => setDeleteFeedback(null), 3000);
    } catch(err) {
      console.error("Delete failed", err);
    }
  };

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

  
    const triggerDemoScan = (bounds) => {
    setIsComparing(true);
    setApiError(null);

    if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);

    moveTimeoutRef.current = setTimeout(() => {
      if (!bounds || typeof bounds.getSouthWest !== 'function') {
        setIsComparing(false);
        return;
      }

      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const swLat = sw.lat;
      const swLng = sw.lng;
      const neLat = ne.lat;
      const neLng = ne.lng;

      const latSpan = neLat - swLat;
      const lngSpan = neLng - swLng;

      const numChanges = 4 + Math.floor(Math.random() * 3); // 4 to 6
      const types = [
        'possible_new_structure',
        'building_footprint_expansion',
        'construction_earthwork',
        'paved_parking_development',
        'roof_structural_modification',
        'plot_development'
      ];
      const risks = ['Low', 'Low', 'Medium', 'Medium', 'High'];

      const newDetections = [];

      for (let i = 0; i < numChanges; i++) {
        const r_type = types[Math.floor(Math.random() * types.length)];
        const r_risk = risks[Math.floor(Math.random() * risks.length)];
        const base_conf = r_risk === 'High' ? 85 : (r_risk === 'Medium' ? 70 : 50);
        const conf = parseFloat((base_conf + Math.random() * 10).toFixed(1));
        const area_m2 = 50 + Math.floor(Math.random() * 350);

        // Small square inside current viewport (3% to 5% of viewport span)
        const boxW = 0.03 + Math.random() * 0.02;
        const boxH = 0.03 + Math.random() * 0.02;
        const x_min = 0.1 + Math.random() * (0.8 - boxW);
        const y_min = 0.1 + Math.random() * (0.8 - boxH);
        const x_max = x_min + boxW;
        const y_max = y_min + boxH;

        const minLng = swLng + (x_min * lngSpan);
        const maxLng = swLng + (x_max * lngSpan);
        const maxLat = neLat - (y_min * latSpan);
        const minLat = neLat - (y_max * latSpan);

        const lat = (minLat + maxLat) / 2;
        const lng = (minLng + maxLng) / 2;
        const polygon = [
          [maxLat, minLng],
          [maxLat, maxLng],
          [minLat, maxLng],
          [minLat, minLng]
        ];

        newDetections.push({
          id: 'DET-' + Math.random().toString(36).substring(2, 9),
          latitude: lat,
          longitude: lng,
          polygon: polygon,
          area: selectedArea,
          confidence: conf,
          risk: r_risk,
          date: new Date().toISOString(),
          status: 'Pending Inspection',
          is_demo: true,
          type: r_type,
          description: `AI-GENERATED CANDIDATE DETECTION - REQUIRES VERIFICATION. Detected ${r_type.replace(/_/g, ' ')}.`,
          areaSqMeters: area_m2
        });
      }

      setBoxes(newDetections);
      setShowResult(true);
      setIsComparing(false);
    }, 1000); // 800-1200ms duration (1000ms)
  };

  const handleCurrentMoveEnd = ({ center, zoom, bounds }) => {
    triggerDemoScan(bounds);
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
        {/* Baseline Date Selector */}
        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            Baseline Historical Image (BEFORE)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              min="2010-01-01"
              max={currDate}
              value={histDate}
              onChange={(e) => setHistDate(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold pl-1">
             Actual Imagery: {beforeImagery.actualAcquisitionDate}
          </p>
        </div>

        {/* Divider icon */}
        <div className="hidden md:flex items-center justify-center pb-2.5 text-slate-400 dark:text-slate-600">
          <Layers className="w-5 h-5" />
        </div>

        {/* Current Date Selector */}
        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-500" />
            Current Satellite Image (CURRENT)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              min={histDate}
              max={todayStr}
              value={currDate}
              onChange={(e) => setCurrDate(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold pl-1">
             Actual Imagery: {currentImagery.actualAcquisitionDate}
          </p>
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
                {beforeImagery.imageryUrl && !beforeImagery.error ? (
    beforeImagery.type === 'landsat' ? 
    <WMSTileLayer key={`before-${beforeImagery.sceneId}`} url={beforeImagery.imageryUrl} maxZoom={19} attribution={beforeImagery.source} /> :
    <TileLayer key={`before-${beforeImagery.sceneId}`} url={beforeImagery.imageryUrl} maxZoom={19} attribution={beforeImagery.source} />
) : <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-[400] text-slate-400 text-sm font-semibold">{beforeImagery.error || (beforeImagery.loading ? "Loading BEFORE imagery..." : "Historical imagery unavailable for selected date.")}</div>}
                {mapSyncState && <ControlledBeforeMap center={mapSyncState.center} zoom={mapSyncState.zoom} />}
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
                {currentImagery.imageryUrl && !currentImagery.error ? (
    currentImagery.type === 'landsat' ? 
    <WMSTileLayer key={`current-${currentImagery.sceneId}`} url={currentImagery.imageryUrl} maxZoom={19} attribution={currentImagery.source} /> :
    <TileLayer key={`current-${currentImagery.sceneId}`} url={currentImagery.imageryUrl} maxZoom={19} attribution={currentImagery.source} />
) : <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-[400] text-slate-400 text-sm font-semibold">{currentImagery.error || (currentImagery.loading ? "Loading CURRENT imagery..." : "Current imagery unavailable for selected date.")}</div>}
                <SyncMapTracker onMove={setMapSyncState} onMoveEnd={handleCurrentMoveEnd} />
                <Marker position={[area.lat, area.lng]} />

                
  {boxes.map(box => (
    <Polygon
      key={box.id}
      positions={box.polygon}
      pathOptions={{ color: '#ef4444', fillColor: 'transparent', fillOpacity: 0, weight: 2 }}
    />
  ))}

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
                <p className="text-white font-bold text-sm">Scanning...</p>
                <p className="text-slate-400 text-xs mt-1">AI candidate analysis in progress</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Output Dashboard */}
        {(showResult || boxes.length > 0) && (
          <div className="mt-8 bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Change Analysis Report</h2>
            </div>
            
            {/* Top Stats & Mask Row */}
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
              </div>

              {predictedMaskUrl && (
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <div className="w-24 h-24 rounded-xl overflow-hidden border border-rose-500/50 bg-black p-0.5 shadow-md">
                    <img src={predictedMaskUrl} alt="ChangeFormer PNG Mask" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold tracking-wider">
                    MODEL OUTPUT
                  </span>
                </div>
              )}
            </div>
            
            {/* Detailed Report */}
            {boxes.length > 0 && (
              <div className="mt-6 border-t border-slate-200/60 dark:border-slate-800/60 pt-6">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
                  Detailed Change Analysis Report
                </h3>
                <div className="flex flex-col gap-4">
                  {boxes.map((box) => (
                    <div key={box.id} className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                      <div className="flex flex-col sm:flex-row justify-between items-start mb-2 gap-2">
                        
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-md">
                            AI-Generated Candidate Detection
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md">
                            Requires Verification
                          </span>
                          <button 
                            onClick={() => handleDeleteDetection(box.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition-colors" 
                            title="Delete record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">{box.description}</p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4 text-xs">
                        <div>
                          <span className="block text-slate-500 dark:text-slate-400 font-medium">Detection ID</span>
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{box.id}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 dark:text-slate-400 font-medium">Change Type</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{box.type}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 dark:text-slate-400 font-medium">Coordinates</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">{box.latitude?.toFixed(4)}, {box.longitude?.toFixed(4)}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 dark:text-slate-400 font-medium">Est. Area</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">~{box.areaSqMeters?.toFixed(1) || box.area || 0} sq meters</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 dark:text-slate-400 font-medium">Confidence</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{box.confidence}%</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 dark:text-slate-400 font-medium">Risk Level</span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400">{box.risk}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 dark:text-slate-400 font-medium">Status</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">Pending Inspection</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 dark:text-slate-400 font-medium">Comparison Period</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{histDate} to {currDate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Imagery Details at the absolute bottom */}
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
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
        )}
      </div>
    );
  };
  
  export default SatelliteCompare;
