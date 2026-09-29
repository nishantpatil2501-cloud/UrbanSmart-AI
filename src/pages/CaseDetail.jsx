import { useParams, Link } from 'react-router-dom';
import { useLocationData } from '../context/LocationContext';
import { getInspectionsByDetectionId, createInspection } from '../services/inspectionService.js';
import { getDetectionById } from '../services/detectionService.js';
import { MapContainer, TileLayer, Marker, Polygon, useMap, useMapEvents } from 'react-leaflet';
import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Copy,
  MapPin,
  Check,
  ExternalLink,
  ZoomIn,
  Maximize,
  Minimize,
  Calendar,
  Clock,
  FileText,
  User,
  ShieldAlert,
  FileWarning,
  Search,
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react';
import L from 'leaflet';

// Sync Maps Hook
const MapSync = ({ setMap, sibling }) => {
  const map = useMap();
  useEffect(() => {
    setMap(map);
  }, [map, setMap]);

  useMapEvents({
    move: () => {
      if (sibling && !map._isSyncing) {
        sibling._isSyncing = true;
        sibling.setView(map.getCenter(), map.getZoom(), { animate: false });
        setTimeout(() => {
          sibling._isSyncing = false;
        }, 50);
      }
    },
    zoom: () => {
      if (sibling && !map._isSyncing) {
        sibling._isSyncing = true;
        sibling.setZoom(map.getZoom(), { animate: false });
        setTimeout(() => {
          sibling._isSyncing = false;
        }, 50);
      }
    },
  });
  return null;
};

// Auto-zoom Hook
const MapAutoZoom = ({ center, zoomTrigger }) => {
  const map = useMap();
  useEffect(() => {
    if (zoomTrigger) {
      map.flyTo(center, 18, { duration: 1 });
    }
  }, [zoomTrigger, center, map]);
  return null;
};

const CaseDetail = () => {
  const { id } = useParams();
  const { updateStatus } = useLocationData();
  const [detection, setDetection] = useState(null);
  const [loadingDetection, setLoadingDetection] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (id) {
      setLoadingDetection(true);
      getDetectionById(id)
        .then((data) => {
          if (isMounted && data) {
            setDetection({
              ...data,
              lat: data.latitude || data.lat || 18.5204,
              lng: data.longitude || data.lng || 73.8567,
              polygon: Array.isArray(data.polygon) ? data.polygon : [],
              area: data.area || 'Unknown Zone',
              city: 'Pune',
              type: data.type || 'Structure Anomaly',
              risk: data.risk || 'Medium',
              conf: data.confidence || data.conf || 85,
              changed_area: data.area_size || data.changed_area || (data.description ? (parseFloat((data.description.match(/~([\d.]+)\s*sq meters/) || [])[1]) || 120) : 120),
              status: data.status || 'Pending Inspection',
              historical_date: data.historical_date || '2023-01-15',
              current_date: data.current_date || '2024-03-20',
              date: data.date ? data.date.split('T')[0] : 'Recent',
            });
            setLoadingDetection(false);
          }
        })
        .catch((err) => {
          console.warn('Detection fetch by ID failed:', err);
          if (isMounted) {
            setDetection(null);
            setLoadingDetection(false);
          }
        });
    }
    return () => { isMounted = false; };
  }, [id]);
  const [viewMode, setViewMode] = useState('three-part');
  const [mapA, setMapA] = useState(null);
  const [mapB, setMapB] = useState(null);
  const [zoomTrigger, setZoomTrigger] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [inspections, setInspections] = useState([]);
  const [selectedOfficer, setSelectedOfficer] = useState('Officer R. Deshmukh (Zone A - Haveli)');
  const [visitDate, setVisitDate] = useState('');

  useEffect(() => {
    if (detection?.id) {
      getInspectionsByDetectionId(detection.id)
        .then((data) => setInspections(data || []))
        .catch(() => setInspections([]));
    }
  }, [detection?.id]);

  if (!detection) {
    return (
      <div className="p-12 text-center text-slate-500 max-w-md mx-auto space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Case Not Found</h2>
        <p className="text-sm">The requested case record ID does not exist.</p>
        <Link to="/alerts" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold">
          Return to Alerts
        </Link>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(`${detection.lat.toFixed(6)}, ${detection.lng.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenMaps = () => {
    window.open(`https://www.google.com/maps?q=${detection.lat},${detection.lng}`, '_blank');
  };

  const handleZoom = () => {
    setZoomTrigger((prev) => prev + 1);
  };

  const handleStatusChange = async (newStatus) => {
    if (detection) {
      await updateStatus(detection.id, newStatus);
    }
  };

  const handleScheduleVisit = async () => {
    if (!detection) return;
    const newRecord = {
      id: `insp-${Date.now()}`,
      detection_id: detection.id,
      officer: selectedOfficer,
      status: 'Visit Scheduled',
      notes: `Site visit scheduled for ${visitDate || 'upcoming date'}.`,
      inspection_date: visitDate ? new Date(visitDate).toISOString() : new Date().toISOString(),
    };

    try {
      const created = await createInspection(newRecord);
      setInspections((prev) => [created || newRecord, ...prev]);
    } catch (e) {
      setInspections((prev) => [newRecord, ...prev]);
    }

    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2500);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim() || !detection) return;
    const newRecord = {
      id: `insp-${Date.now()}`,
      detection_id: detection.id,
      officer: selectedOfficer,
      status: 'Note Logged',
      notes: noteText,
      inspection_date: new Date().toISOString(),
    };

    try {
      const created = await createInspection(newRecord);
      setInspections((prev) => [created || newRecord, ...prev]);
    } catch (e) {
      setInspections((prev) => [newRecord, ...prev]);
    }

    setNoteText('');
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2500);
  };

  const satelliteLayer =
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const mapLayer = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div
      className={`mx-auto ${
        isFullScreen
          ? 'fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 overflow-y-auto p-4 sm:p-6'
          : 'max-w-6xl space-y-6 pb-12'
      }`}
    >
      {/* ── TOP HEADER & ACTIONS TASKBAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            to="/alerts"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors shadow-xs"
            title="Back to Alerts"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-mono">
                CASE {detection.id}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                {detection.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {detection.area}, {detection.city} • Recorded {detection.date}
            </p>
          </div>
        </div>

        {/* Taskbar Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center transition-all shadow-xs"
          >
            {isFullScreen ? (
              <>
                <Minimize className="w-3.5 h-3.5 mr-1.5" /> Exit Full Screen
              </>
            ) : (
              <>
                <Maximize className="w-3.5 h-3.5 mr-1.5" /> Full Screen View
              </>
            )}
          </button>
        </div>
      </div>

      {/* Accuracy Disclaimer Banner */}
      <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-amber-800 dark:text-amber-300 text-xs sm:text-sm">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Statutory Accuracy Notice:</strong> Satellite-based change detection identifies apparent physical ground-truth changes using optical spectral differencing. Field verification and PMC cadastral survey records are mandatory before initiating legal enforcement.
        </div>
      </div>

      {/* ── 1. DETECTION SUMMARY CARDS ── */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 p-6">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <span>1. Detection Metrics &amp; Parameters</span>
          <span className="text-xs font-mono font-normal text-slate-400">UrbanNet-v2.1</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/60">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Location
            </p>
            <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              {detection.area}, {detection.city}
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/60">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Geocoordinates
            </p>
            <p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {detection.lat.toFixed(5)}°, {detection.lng.toFixed(5)}°
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/60">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Baseline Pass
            </p>
            <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm font-mono">
              {detection.historical_date}
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/60">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Current Pass
            </p>
            <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm font-mono">
              {detection.current_date}
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/60">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Classification
            </p>
            <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
              {detection.type}
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/60">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              AI Confidence
            </p>
            <p className="font-bold text-base text-blue-600 dark:text-blue-400">
              {detection.conf}% Match
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/60">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Footprint Area
            </p>
            <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              {detection.changed_area} m²
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/60 flex flex-col justify-between">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Risk Tier
            </p>
            <div>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  detection.risk === 'High'
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                    : detection.risk === 'Medium'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                    : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                }`}
              >
                {detection.risk} Priority
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. MULTI-LAYER SATELLITE COMPARISON TASKBAR & MAPS ── */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 overflow-hidden flex flex-col">
        {/* Map View Mode Switcher Taskbar */}
        <div className="p-3 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex flex-wrap gap-2.5 items-center justify-between">
          <div className="flex flex-wrap gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <button
              onClick={() => setViewMode('three-part')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'three-part'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              3-Part Comprehensive
            </button>
            <button
              onClick={() => setViewMode('before')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'before'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Baseline
            </button>
            <button
              onClick={() => setViewMode('current')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'current'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Current
            </button>
            <button
              onClick={() => setViewMode('change')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'change'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Change Anomaly
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleZoom}
              className="flex items-center text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 px-3 py-1.5 rounded-xl transition-all shadow-xs"
            >
              <ZoomIn className="w-3.5 h-3.5 mr-1" /> Center Detection
            </button>
          </div>
        </div>

        {/* Maps Container */}
        <div className={`relative w-full bg-slate-900 ${viewMode === 'three-part' ? 'h-auto' : 'h-[480px]'}`}>
          {/* VIEW: 3-PART COMPARISON */}
          {viewMode === 'three-part' && (
            <div className="flex flex-col w-full h-full">
              <div className="flex flex-col md:flex-row w-full h-[360px] divide-y md:divide-y-0 md:divide-x divide-slate-700">
                {/* Before Map */}
                <div className="flex-1 relative h-full">
                  <div className="absolute top-3 left-3 z-[400] bg-slate-950/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-700">
                    BEFORE: {detection.historical_date}
                  </div>
                  <MapContainer center={[detection.lat, detection.lng]} zoom={17} className="w-full h-full" zoomControl={false}>
                    <TileLayer url={satelliteLayer} maxZoom={19} attribution="Esri World Imagery" />
                    <MapSync setMap={setMapA} sibling={mapB} />
                    <MapAutoZoom center={[detection.lat, detection.lng]} zoomTrigger={zoomTrigger} />
                    <Polygon positions={detection.polygon} pathOptions={{ color: 'white', fillOpacity: 0, weight: 1.5, dashArray: '4' }} />
                    <Marker position={[detection.lat, detection.lng]} />
                  </MapContainer>
                </div>

                {/* Current Map */}
                <div className="flex-1 relative h-full">
                  <div className="absolute top-3 left-3 z-[400] bg-blue-600/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow">
                    CURRENT: {detection.current_date}
                  </div>
                  <MapContainer center={[detection.lat, detection.lng]} zoom={17} className="w-full h-full" zoomControl={false}>
                    <TileLayer url={satelliteLayer} maxZoom={19} attribution="Esri World Imagery" />
                    <MapSync setMap={setMapB} sibling={mapA} />
                    <MapAutoZoom center={[detection.lat, detection.lng]} zoomTrigger={zoomTrigger} />
                    <Polygon positions={detection.polygon} pathOptions={{ color: '#facc15', fillOpacity: 0.15, weight: 2, dashArray: '4' }} />
                    <Marker position={[detection.lat, detection.lng]} />
                  </MapContainer>
                </div>
              </div>

              {/* Detected Change Map Bottom */}
              <div className="w-full h-[340px] relative border-t border-slate-700">
                <div className="absolute top-3 left-3 z-[400] bg-rose-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs font-bold shadow flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> DETECTED CHANGE POLARITY
                </div>

                <div className="absolute top-12 left-3 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-slate-200 p-3 rounded-xl text-xs shadow-lg border border-slate-200 dark:border-slate-700 pointer-events-none space-y-0.5">
                  <p><strong className="text-slate-500 dark:text-slate-400">Type:</strong> {detection.type}</p>
                  <p><strong className="text-slate-500 dark:text-slate-400">Confidence:</strong> {detection.conf}%</p>
                  <p><strong className="text-slate-500 dark:text-slate-400">Footprint:</strong> {detection.changed_area} m²</p>
                </div>

                <MapContainer center={[detection.lat, detection.lng]} zoom={17} className="w-full h-full" zoomControl={false}>
                  <TileLayer url={mapLayer} maxZoom={19} />
                  <MapAutoZoom center={[detection.lat, detection.lng]} zoomTrigger={zoomTrigger} />
                  <Polygon positions={detection.polygon} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.45, weight: 2.5 }} />
                  <Marker position={[detection.lat, detection.lng]} />
                </MapContainer>
              </div>
            </div>
          )}

          {/* VIEW: BEFORE */}
          {viewMode === 'before' && (
            <div className="w-full h-full relative">
              <div className="absolute top-3 left-3 z-[400] bg-slate-950/80 text-white px-3 py-1 rounded-lg text-xs font-bold border border-slate-700">
                BASELINE: {detection.historical_date}
              </div>
              <MapContainer center={[detection.lat, detection.lng]} zoom={17} className="w-full h-full">
                <TileLayer url={satelliteLayer} maxZoom={19} />
                <MapAutoZoom center={[detection.lat, detection.lng]} zoomTrigger={zoomTrigger} />
                <Polygon positions={detection.polygon} pathOptions={{ color: 'white', fillOpacity: 0, weight: 2, dashArray: '5' }} />
                <Marker position={[detection.lat, detection.lng]} />
              </MapContainer>
            </div>
          )}

          {/* VIEW: CURRENT */}
          {viewMode === 'current' && (
            <div className="w-full h-full relative">
              <div className="absolute top-3 left-3 z-[400] bg-blue-600/90 text-white px-3 py-1 rounded-lg text-xs font-bold shadow">
                CURRENT: {detection.current_date}
              </div>
              <MapContainer center={[detection.lat, detection.lng]} zoom={17} className="w-full h-full">
                <TileLayer url={satelliteLayer} maxZoom={19} />
                <MapAutoZoom center={[detection.lat, detection.lng]} zoomTrigger={zoomTrigger} />
                <Polygon positions={detection.polygon} pathOptions={{ color: '#facc15', fillOpacity: 0.2, weight: 2, dashArray: '5' }} />
                <Marker position={[detection.lat, detection.lng]} />
              </MapContainer>
            </div>
          )}

          {/* VIEW: CHANGE */}
          {viewMode === 'change' && (
            <div className="w-full h-full relative">
              <div className="absolute top-3 left-3 z-[400] bg-rose-600/90 text-white px-3 py-1 rounded-lg text-xs font-bold shadow flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> DETECTED CHANGE MAP
              </div>
              <MapContainer center={[detection.lat, detection.lng]} zoom={17} className="w-full h-full">
                <TileLayer url={mapLayer} maxZoom={19} />
                <MapAutoZoom center={[detection.lat, detection.lng]} zoomTrigger={zoomTrigger} />
                <Polygon positions={detection.polygon} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.45, weight: 3 }} />
                <Marker position={[detection.lat, detection.lng]} />
              </MapContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. GEOSPATIAL LOCATION & COPY TASKBAR ── */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
            Exact Geospatial Pinpoint
          </h3>
          <p className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg inline-block border border-slate-200 dark:border-slate-700">
            {detection.lat.toFixed(6)}° N, {detection.lng.toFixed(6)}° E
          </p>
        </div>
        <div className="flex gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleCopy}
            className="flex-1 sm:flex-none flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-xl transition-all text-xs border border-slate-200 dark:border-slate-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
            {copied ? 'Copied' : 'Copy Coordinates'}
          </button>
          <button
            onClick={handleOpenMaps}
            className="flex-1 sm:flex-none flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-xl transition-all text-xs shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open in Google Maps
          </button>
        </div>
      </div>

      {/* ── 4 & 5. WORKFLOW & PMC COMPLAINT INTEGRATION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status & Officer Assignment */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800/80">
            Workflow &amp; Field Assignment
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Investigation Status
              </label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                value={detection.status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">SIMULATED DEMO DATA</option>
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Pending Inspection</option>
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Under Review</option>
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Verified Unauthorized</option>
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Approved / Dismissed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Assigned PMC Officer
              </label>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <select
                  className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  value={selectedOfficer}
                  onChange={(e) => setSelectedOfficer(e.target.value)}
                >
                  <option value="Officer R. Deshmukh (Zone A - Haveli)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Officer R. Deshmukh (Zone A - Haveli)</option>
                  <option value="Officer S. Patil (Zone B - Kothrud)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Officer S. Patil (Zone B - Kothrud)</option>
                  <option value="Officer V. Kulkarni (Zone C - Viman Nagar)" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Officer V. Kulkarni (Zone C - Viman Nagar)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Schedule Site Visit
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleScheduleVisit}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PMC Complaint Linking & Investigation Notes */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-5">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <FileWarning className="w-4 h-4 text-amber-500" /> PMC Complaint Linking
            </h3>
            <a
              href="https://pmc.gov.in/en/pt-online-services"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              PMC Portal <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Complaint Reference ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. PMC-2023-8891"
                  className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                />
                <button className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold px-4 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 transition-all">
                  Link
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Field Investigation Notes
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 min-h-[95px]"
                placeholder="Add site notes, boundary encroachments, or inspector remarks..."
              ></textarea>
              <div className="flex justify-between items-center mt-2">
                {noteSaved && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Note saved successfully
                  </span>
                )}
                <button
                  onClick={handleSaveNote}
                  className="ml-auto bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6 & 7. EVIDENCE & TIMELINE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity & History */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-slate-800/80">
            Case Activity &amp; Audit Trail
          </h3>
          <div className="space-y-4">
            {inspections.map((insp) => (
              <div key={insp.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-900 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {insp.status || 'Inspection Entry'} — {insp.officer}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {insp.notes || 'Field inspection action recorded.'}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {insp.inspection_date ? insp.inspection_date.split('T')[0] : 'Recent'}
                  </p>
                </div>
              </div>
            ))}

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  AI Spectral Anomaly Logged
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  UrbanWatch AI flagged {detection.type} with {detection.conf}% confidence.
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{detection.date}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <Search className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Case Record Auto-Generated
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Assigned unique index {detection.id} to urban registry.
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{detection.date}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Evidence Upload */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-slate-800/80">
            Ground Truth &amp; Field Evidence
          </h3>
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-800/30">
            <UploadCloud className="w-9 h-9 text-slate-400 dark:text-slate-500 mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No ground survey media attached
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
              Attach drone survey footage, ground photos, or notice documents.
            </p>
            <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs">
              Upload Files
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseDetail;
