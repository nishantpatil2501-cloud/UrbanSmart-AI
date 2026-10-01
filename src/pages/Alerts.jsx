import { useState, useEffect } from 'react';
import { getDetections, deleteDetection } from '../services/detectionService.js';
import { Search, Filter, Eye, AlertTriangle, ShieldAlert, CheckCircle2, Clock, XCircle, ArrowUpDown, MapPin, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocationData, PRESET_PLACES } from '../context/LocationContext';

const Alerts = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [detections, setDetections] = useState([]);
  const { location, updateLocation } = useLocationData();

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

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete this case? (ID: ${id})`)) return;
    try {
      await deleteDetection(id);
      setDetections((prev) => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Failed to delete detection:', err);
      alert('Failed to delete case report.');
    }
  };

  const normalizedDetections = (detections || []).map((d) => ({
    ...d,
    area: d.area || 'Unknown Zone',
    city: 'Pune',
    type: d.type || 'Structure Anomaly',
    risk: d.risk || 'Medium',
    conf: d.confidence || d.conf || 85,
    changed_area: d.area_size || d.changed_area || (d.description ? (parseFloat((d.description.match(/~([\d.]+)\s*sq meters/) || [])[1]) || 120) : 120),
    status: d.status || 'Pending Inspection',
  }));

  const filteredAlerts = normalizedDetections.filter((alert) => {
    const matchesSearch =
      alert.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk = selectedRisk === 'ALL' || alert.risk.toUpperCase() === selectedRisk;
    const matchesStatus =
      selectedStatus === 'ALL' ||
      alert.status.toLowerCase().includes(selectedStatus.toLowerCase());

    return matchesSearch && matchesRisk && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Detection Alerts & Case Registry
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
              {detections.length} Cases Logged
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Historical and active AI change flags for target region:{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {location ? location.placeName : 'Selected Zone'}
            </span>
          </p>
        </div>

        {/* Region selector dropdown */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-xs">
          <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>Region:</span>
          <select
            className="bg-transparent font-semibold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
            value={location ? location.placeName : ''}
            onChange={(e) => {
              const place = PRESET_PLACES.find((p) => p.name === e.target.value);
              if (place) updateLocation(place.lat, place.lng, place.name);
            }}
          >
            
            {PRESET_PLACES.map((p) => (
              <option key={p.name} value={p.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Control Bar: Search and Filters */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row gap-3 justify-between items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, location, type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-400 font-medium mr-1 hidden sm:inline">Risk:</span>
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((risk) => (
            <button
              key={risk}
              onClick={() => setSelectedRisk(risk)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedRisk === risk
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {risk}
            </button>
          ))}
        </div>
      </div>

      {/* Case Table Card */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Case ID</th>
                <th className="px-6 py-3.5">Location / Zone</th>
                <th className="px-6 py-3.5">Anomaly Type</th>
                <th className="px-6 py-3.5">Risk Rating</th>
                <th className="px-6 py-3.5">Footprint</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                    No detection alerts match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((det) => (
                  <tr
                    key={det.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {det.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {det.area}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        {det.city}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                      {det.type}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block ${
                          det.risk === 'High'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                            : det.risk === 'Medium'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                        }`}
                      >
                        {det.risk} Risk ({det.conf}%)
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium font-mono text-slate-700 dark:text-slate-300">
                      {det.changed_area} m²
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                        {det.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/cases/${det.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Case
                        </button>
                        <button
                          onClick={() => handleDelete(det.id)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-xs font-semibold bg-rose-100 hover:bg-rose-200 text-rose-600 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 dark:text-rose-400 shadow-xs transition-colors cursor-pointer border border-rose-200 dark:border-rose-800"
                          title="Delete Case"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Alerts;

