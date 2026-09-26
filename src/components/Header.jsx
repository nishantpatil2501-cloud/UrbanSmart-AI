import { Bell, Search, User, Sun, Moon, Shield, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Header = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between px-4 md:px-6 z-20 shrink-0 transition-colors duration-200 sticky top-0">
      {/* Search Bar / Task Bar */}
      <div className="flex items-center flex-1 max-w-xl">
        <div className="relative w-full hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-12 py-2 border border-slate-200 dark:border-slate-700/80 rounded-xl leading-5 bg-slate-50/80 dark:bg-slate-800/60 placeholder-slate-400 dark:placeholder-slate-500 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-500 transition-all shadow-xs"
            placeholder="Search Pune zones, case IDs, coordinates..."
          />
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded shadow-xs">
              /
            </kbd>
          </div>
        </div>
      </div>

      {/* Right Taskbar Actions */}
      <div className="flex items-center space-x-3">
        {/* Live Status Pill */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Pune PMC Live Feed</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
          ) : (
            <Moon className="h-5 w-5 text-slate-600 transition-transform rotate-0 hover:-rotate-12" />
          )}
        </button>

        {/* Notifications */}
        <button
          aria-label="Notifications"
          className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
        >
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 ring-2 ring-white dark:ring-slate-900"></span>
          </span>
          <Bell className="h-5 w-5" />
        </button>

        {/* User Profile */}
        <div className="flex items-center space-x-3 border-l border-slate-200 dark:border-slate-800 pl-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 ring-2 ring-white dark:ring-slate-900 font-semibold text-xs">
            PU
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">Admin User</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">Pune Urban Dev Dept</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
