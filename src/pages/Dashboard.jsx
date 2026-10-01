import { Activity, MapPin, AlertCircle, Clock, ArrowUpRight, TrendingUp, ShieldCheck, Layers, Eye, ChevronDown, MapPinOff, Navigation, Compass, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import UrbanShowcase from '../components/UrbanShowcase';
import { useLocationData, PRESET_PLACES } from '../context/LocationContext';
import { useState, useEffect } from 'react';
import { getDetections, createDetection } from '../services/detectionService.js';

const Dashboard = () => {
  const { location, error, loadingLocation, mockDetections, updateLocation } = useLocationData();
  const [dashboardAlerts, setDashboardAlerts] = useState([]);
  const [apiError, setApiError] = useState(null);
  
  useEffect(() => {
    let isMounted = true;
    if (!location) return;
    
    const fetchDetections = async () => {
      try {
        const allDetections = await getDetections({ includeDemo: true });
        if (!isMounted) return;
        
        // Filter for this place
        const placeAlerts = allDetections.filter(d => d.area === location.placeName);
        
        // Sort newest first
        placeAlerts.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        placeAlerts.reverse();
        
        // Top 10
        setDashboardAlerts(placeAlerts.slice(0, 10));
      } catch (err) {
        console.error("Failed to load dashboard alerts:", err);
      }
    };
    
    fetchDetections();
    return () => { isMounted = false; };
  }, [location]);
  
  const stats = [
    {
      title: 'Monitored Region',
      value: location ? location.placeName : 'Selected Zone',
      change: location ? `${location.lat.toFixed(3)}°, ${location.lng.toFixed(3)}°` : 'Active Coordinates',
      isIncrease: true,
      icon: <MapPin className="w-5 h-5" />,
      color: 'blue',
    },
    {
      title: 'Suspected Constructions',
      value: `${dashboardAlerts.length} Demo Sites`,
      change: '5 simulated today',
      isIncrease: true,
      icon: <Activity className="w-5 h-5" />,
      color: 'red',
    },
    {
      title: 'Encroachment Alerts',
      value: '18 Active',
      change: '2 under review',
      isIncrease: false,
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'amber',
    },
    {
      title: 'Inspections Pending',
      value: '56 Queued',
      change: 'Zone A & B',
      isIncrease: false,
      icon: <Clock className="w-5 h-5" />,
      color: 'emerald',
    },
  ];

  const recentAlerts = dashboardAlerts.map((d) => ({
    ...d,
    loc: `${d.area}, ${d.city}`,
  }));

  const colorClasses = {
    blue: {
      bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      badge: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50',
    },
    red: {
      bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      badge: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50',
    },
    amber: {
      bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      badge: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50',
    },
    emerald: {
      bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      badge: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50',
    },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {apiError && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-sm font-semibold">Database Connection Error: {apiError}</div>}
      {/* Page Header / Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              UrbanWatch AI Monitoring Dashboard
            </h1>
            <span className="hidden sm:inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Operational
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Satellite-assisted change detection across selected urban development zones.
          </p>

          {/* Location Selector & Status */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Location:</span>
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

            {location && (
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                ({location.lat.toFixed(4)}° N, {location.lng.toFixed(4)}° E)
              </span>
            )}
          </div>

          {error && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900">
              <MapPinOff className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Quick Action Taskbar Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/compare"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 shadow-xs transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Compare Imagery</span>
          </Link>
          <Link
            to="/map"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/25 transition-all"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Open GIS Map</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {stat.title}
              </span>
              <div className={`p-2.5 rounded-xl border ${colorClasses[stat.color].bg} group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                {stat.value}
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center text-xs">
              <span className={`font-medium px-1.5 py-0.5 rounded truncate ${colorClasses[stat.color].badge}`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Detection Alerts + Sidebar widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts Table Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Recent Detection Alerts
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                  AI DEMO / SIMULATED CANDIDATE
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI flagged anomalies awaiting field inspection for {location ? location.placeName : 'Selected Zone'}
              </p>
            </div>
            <Link
              to="/alerts"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              View all alerts <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 flex-1">
            {dashboardAlerts.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm font-semibold">
                  No recent detection reports for this location.
                </div>
              ) : (
                dashboardAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors gap-4"
                  >
                    <div className="flex items-start space-x-3.5 flex-1 min-w-0 pr-0 sm:pr-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                        <MapPin className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {alert.area ? `${alert.area}, Pune` : 'Unknown location'}
                          </span>
                          <span className="text-xs font-mono text-slate-400 dark:text-slate-500 shrink-0">
                            {alert.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {(alert.type || 'Structure Anomaly').replace(/_/g, ' ')} • <span className="font-semibold text-amber-600 dark:text-amber-400">{alert.status || 'Pending Inspection'}</span>
                        </p>
                        {alert.latitude && alert.longitude && (
                          <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1 truncate">
                            {Math.abs(alert.latitude).toFixed(4)}° {alert.latitude >= 0 ? 'N' : 'S'}, {Math.abs(alert.longitude).toFixed(4)}° {alert.longitude >= 0 ? 'E' : 'W'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="hidden sm:flex flex-col items-end mr-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          {Math.round(alert.confidence || alert.conf || 0)}% Match
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              (alert.confidence || alert.conf || 0) > 85 ? 'bg-rose-500' : (alert.confidence || alert.conf || 0) > 75 ? 'bg-amber-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${alert.confidence || alert.conf || 0}%` }}
                          ></div>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          alert.risk === 'High'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                            : alert.risk === 'Medium'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                        }`}
                      >
                        {alert.risk || 'Low'} Risk
                      </span>

                      <Link
                        to={`/cases/${alert.id}`}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
          </div>
        </div>

        {/* Right Column: GIS Preview & Activity Feed */}
        <div className="space-y-6">
          {/* GIS Map Preview Card */}
          <div className="bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                GIS Coverage
              </h3>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active Zone
              </span>
            </div>

            <div className="h-44 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 p-4 flex flex-col justify-between relative overflow-hidden border border-slate-700/60">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
              
              <div className="relative z-10">
                <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/50">
                  Interactive View
                </span>
                <p className="text-white text-sm font-semibold mt-2">
                  {location ? location.placeName : 'Selected Region'} Scanned
                </p>
                <p className="text-slate-400 text-xs mt-0.5 font-mono">
                  {location ? `${location.lat.toFixed(4)}° N, ${location.lng.toFixed(4)}° E` : ''}
                </p>
              </div>

              <Link
                to="/map"
                className="relative z-10 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold text-center shadow-md transition-all"
              >
                Launch Full GIS Map &rarr;
              </Link>
            </div>
          </div>

          {/* System Timeline Card */}
          <div className="bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 p-5">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-4">
              Platform Activity
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0 ring-4 ring-blue-500/20"></div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Satellite Pass: Sentinel-2
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Processed active tiles for {location ? location.placeName : 'selected area'}.
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    2 hours ago
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-emerald-500 shrink-0 ring-4 ring-emerald-500/20"></div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Model Retraining Completed
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    UrbanNet-v2.1 deployed for high resolution diffing.
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    12 hours ago
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-purple-500 shrink-0 ring-4 ring-purple-500/20"></div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Municipal Portal Sync
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    API sync established for complaint references.
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    1 day ago
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SCROLL INVITATION ARROW ── */}
      <div className="flex flex-col items-center py-8 gap-2 select-none pointer-events-none">
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Explore Urban Planning Initiatives
        </span>
        <ChevronDown className="w-5 h-5 text-blue-400 animate-bounce" />
        <ChevronDown className="w-5 h-5 text-blue-500/60 animate-bounce" style={{ animationDelay: '0.15s' }} />
      </div>

      {/* ── URBAN SHOWCASE SLIDE ── */}
      <UrbanShowcase />
    </div>
  );
};

export default Dashboard;
