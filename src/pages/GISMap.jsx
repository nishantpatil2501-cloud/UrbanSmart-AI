import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, useMapEvents } from 'react-leaflet';
import { useLocationData, PRESET_PLACES } from '../context/LocationContext';
import { getDetections } from '../services/detectionService.js';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, MapPinOff, Layers, Eye } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icons based on risk
const createIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

const icons = {
  High: createIcon('red'),
  Medium: createIcon('orange'),
  Low: createIcon('blue'),
};

const MapController = ({ activeLocation, center }) => {
  const map = useMap();
  useEffect(() => {
    if (activeLocation) {
      map.flyTo([activeLocation.lat, activeLocation.lng], 16, { duration: 1.5 });
    } else if (center && center[0] && center[1]) {
      map.flyTo(center, 13, { duration: 1.5 });
    }
  }, [activeLocation, center, map]);
  return null;
};

// Map click listener to select a place on the map
const MapClickListener = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

function ChangeView({ center }) {
  const map = useMap();
  map.setView(center, 13);
  return null;
}

const GISMap = () => {
  const [activeDetection, setActiveDetection] = useState(null);
  const [filterRisk, setFilterRisk] = useState('ALL');
  const navigate = useNavigate();
  const { location, error, updateLocation } = useLocationData();
  const [detections, setDetections] = useState([]);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getDetections({ includeDemo: true })
      .then((data) => {
        if (isMounted) setDetections(data || []);
      })
      .catch(() => {
        if (isMounted) setDetections([]);
      });
    return () => { isMounted = false; };
  }, []);

  const center = location ? [location.lat, location.lng] : [18.5204, 73.8567];

  const filteredDetections = (detections || []).map((d) => ({
    ...d,
    lat: d.latitude || d.lat || 18.5204,
    lng: d.longitude || d.lng || 73.8567,
    polygon: Array.isArray(d.polygon) ? d.polygon : [],
    risk: d.risk || 'Medium',
    conf: d.confidence || d.conf || 85,
    changed_area: d.area_size || d.changed_area || 120,
    city: 'Pune',
    type: d.type || 'Structure Anomaly',
    status: d.status || 'Pending Inspection',
  })).filter(
    (d) => filterRisk === 'ALL' || d.risk.toUpperCase() === filterRisk.toUpperCase()
  );

  const handleZoomToSite = (det) => {
    setActiveDetection(det);
  };

  const handleMapClick = (lat, lng) => {
    updateLocation(lat, lng, `Selected (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`);
  };

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col space-y-4 max-w-7xl mx-auto">
      {apiError && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl mb-4 text-sm font-semibold">Database Connection Error: {apiError}</div>}
      {/* Top Header & Legend Task Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0 pb-1 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              GIS Anomaly Geoportal
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Interactive View
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Geographic view of AI detected construction anomalies near {location ? location.placeName : 'Selected Zone'}.
          </p>

          {/* Place Select & GPS */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Place:</span>
              <select
                className="bg-transparent font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
                value={location ? location.placeName : ''}
                onChange={(e) => {
                  const place = PRESET_PLACES.find((p) => p.name === e.target.value);
                  if (place) updateLocation(place.lat, place.lng, place.name);
                }}
              >
                
                {PRESET_PLACES.map((p) => (
                  <option key={p.name} value={p.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            

            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              (Click anywhere on map to move center)
            </span>
          </div>

          {error && (
            <div className="mt-1 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
              <MapPinOff className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Legend & Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900/90 p-2 sm:px-4 sm:py-2 rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-800 text-xs">
          {/* Risk Filters */}
          <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-3 mr-1">
            <span className="text-slate-400 font-medium mr-1 hidden sm:inline">Filter:</span>
            {['ALL', 'High', 'Medium', 'Low'].map((r) => (
              <button
                key={r}
                onClick={() => setFilterRisk(r)}
                className={`px-2 py-1 rounded-md font-semibold text-[11px] transition-all ${
                  filterRisk === r
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Legend Items */}
          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-rose-500/30 border border-rose-500 rounded-xs"></span>
              <span className="hidden sm:inline">Suspected Footprint</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>High</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>Low</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Card */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 overflow-hidden relative z-0">
        <MapContainer center={center} zoom={13} className="w-full h-full">
          <ChangeView center={center} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <MapController activeLocation={activeDetection} center={center} />
          <MapClickListener onMapClick={handleMapClick} />

          {filteredDetections.map((det) => (
            <div key={`container-${det.id}`}>
              <Polygon
                positions={det.polygon}
                pathOptions={{
                  color: det.risk === 'High' ? '#ef4444' : det.risk === 'Medium' ? '#f59e0b' : '#3b82f6',
                  fillColor: det.risk === 'High' ? '#ef4444' : det.risk === 'Medium' ? '#f59e0b' : '#3b82f6',
                  fillOpacity: 0.35,
                  weight: 2,
                }}
                eventHandlers={{ click: () => handleZoomToSite(det) }}
              />
              <Marker
                key={det.id}
                position={[det.lat, det.lng]}
                icon={icons[det.risk] || icons.High}
              >
                <Popup className="min-w-[240px]">
                  <div className="p-1 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                      <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                        {det.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          det.risk === 'High'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : det.risk === 'Medium'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {det.risk} Risk
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {det.area}, {det.city}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {det.lat.toFixed(4)}° N, {det.lng.toFixed(4)}° E
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Type</span>
                        <span className="font-medium text-slate-700 dark:text-slate-200 truncate block">
                          {det.type}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Confidence</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {det.conf}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Footprint</span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {det.changed_area} m²
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Status</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400 truncate block">
                          {det.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleZoomToSite(det)}
                        className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      >
                        Center
                      </button>
                      <button
                        onClick={() => navigate(`/cases/${det.id}`)}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                      >
                        View Case
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </div>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default GISMap;

