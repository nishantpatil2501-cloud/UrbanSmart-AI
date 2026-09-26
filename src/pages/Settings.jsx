import { useState } from 'react';
import { Save, User, Shield, Bell, Map, CheckCircle2, Sliders, Cpu, Sparkles } from 'lucide-react';

const Settings = () => {
  const [saved, setSaved] = useState(false);
  const [threshold, setThreshold] = useState(80);
  const [autoFlag, setAutoFlag] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [systemUpdates, setSystemUpdates] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            System &amp; Detection Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure AI change detection thresholds, geospatial basemaps, and alert notifications.
          </p>
        </div>

        {/* Quick Save Taskbar Button */}
        <div>
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-5 rounded-xl text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5"
          >
            {saved ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
            <span>{saved ? 'Saved!' : 'Save Preferences'}</span>
          </button>
        </div>
      </div>

      {/* 1. AI Detection Configuration */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 overflow-hidden">
        <div className="border-b border-slate-200/80 dark:border-slate-800 px-6 py-4 flex items-center bg-slate-50/80 dark:bg-slate-800/60">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2.5" />
          <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
            AI Detection Model &amp; Thresholds
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                Minimum Confidence Threshold
              </label>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                {threshold}%
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Only anomalies detected with confidence at or above this value will trigger automated alerts.
            </p>
            <input
              type="range"
              min="50"
              max="99"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500 mt-2">
              <span>50% (High Sensitivity)</span>
              <span>80% (Recommended)</span>
              <span>99% (Strict)</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-t border-slate-100 dark:border-slate-800/80">
            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                Auto-Classify High Risk (&gt;90%)
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automatically prioritize rapid structural additions as High Risk tier.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoFlag}
                onChange={(e) => setAutoFlag(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 2 & 3. Map Preferences & Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Map Preferences */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 overflow-hidden">
          <div className="border-b border-slate-200/80 dark:border-slate-800 px-6 py-4 flex items-center bg-slate-50/80 dark:bg-slate-800/60">
            <Map className="w-5 h-5 text-slate-600 dark:text-slate-300 mr-2.5" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
              Geospatial Map Settings
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Default Regional Center
              </label>
              <select className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500">
                <option>Pune Urban Metropolitan (Default)</option>
                <option>Pimpri-Chinchwad (PCMC)</option>
                <option>Haveli Taluka Zone</option>
                <option>Entire Maharashtra</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Default Satellite Basemap
              </label>
              <select className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500">
                <option>Esri World Imagery (High-Res)</option>
                <option>OpenStreetMap Standard</option>
                <option>Sentinel-2 False Color RGB</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 overflow-hidden">
          <div className="border-b border-slate-200/80 dark:border-slate-800 px-6 py-4 flex items-center bg-slate-50/80 dark:bg-slate-800/60">
            <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300 mr-2.5" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
              Alerts &amp; Dispatch
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                  High Risk Email Dispatch
                </span>
                <span className="text-xs text-slate-400">Immediate notices to Ward Officers</span>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-800/80">
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                  Daily Summary Report
                </span>
                <span className="text-xs text-slate-400">Sent daily at 08:00 IST</span>
              </div>
              <input
                type="checkbox"
                checked={dailyDigest}
                onChange={(e) => setDailyDigest(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-800/80">
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                  System Health &amp; Sync Alerts
                </span>
                <span className="text-xs text-slate-400">Notify on satellite tile sync errors</span>
              </div>
              <input
                type="checkbox"
                checked={systemUpdates}
                onChange={(e) => setSystemUpdates(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
