import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Map, Image, AlertTriangle, Settings, ShieldAlert, Sun, Moon, Sparkles, Radio } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Sidebar = () => {
  const { theme, setTheme } = useTheme();

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={19} />, label: 'Dashboard' },
    { to: '/compare',   icon: <Image size={19} />,           label: 'Satellite Compare' },
    { to: '/map',       icon: <Map size={19} />,             label: 'GIS Map' },
    { to: '/alerts',    icon: <AlertTriangle size={19} />,   label: 'Alerts & Cases' },
    { to: '/settings',  icon: <Settings size={19} />,        label: 'Settings' },
  ];

  return (
    <aside className="w-64 bg-slate-900 dark:bg-slate-950 text-white flex-col hidden md:flex border-r border-slate-800 dark:border-slate-800/80 transition-colors duration-200 shrink-0 select-none">
      {/* Brand Header */}
      <Link to="/" className="h-16 flex items-center px-6 border-b border-slate-800/80 hover:bg-slate-800/30 transition-colors group">
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mr-3 group-hover:scale-105 transition-transform">
          <ShieldAlert className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wider text-slate-100 uppercase flex items-center gap-1.5">
            UrbanWatch <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-mono border border-blue-500/30">AI</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-normal">Pune Municipal Region</p>
        </div>
      </Link>

      {/* Navigation Taskbar */}
      <nav className="flex-1 py-5 px-3 overflow-y-auto space-y-1">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
          Operations
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`mr-3 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.to === '/alerts' && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    6
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Appearance Toggle Bar ── */}
      <div className="px-4 py-3 border-t border-slate-800/80">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
          Appearance
        </p>
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              theme === 'light'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label="Light mode"
          >
            <Sun size={13} className={theme === 'light' ? 'text-amber-500' : ''} />
            <span>Light</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              theme === 'dark'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label="Dark mode"
          >
            <Moon size={13} className={theme === 'dark' ? 'text-blue-200' : ''} />
            <span>Dark</span>
          </button>
        </div>
      </div>

      {/* System Status Pill */}
      <div className="p-3 m-3 bg-slate-800/40 border border-slate-800 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-slate-200">Sentinel-2 Sync</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
            Active
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Next scan scheduled: 04:00 IST</p>
      </div>
    </aside>
  );
};

export default Sidebar;
