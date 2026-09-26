import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    // 1. Check localStorage first
    const saved = localStorage.getItem('urbanwatch-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    // 2. Fall back to OS preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Apply/remove the 'dark' class on <html> whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('urbanwatch-theme', theme);
  }, [theme]);

  const toggleTheme = () =>
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const setTheme = (t) => {
    if (t === 'system') {
      const sys = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      setThemeState(sys);
      localStorage.removeItem('urbanwatch-theme');
    } else {
      setThemeState(t);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook for any component to read/change the theme
export const useTheme = () => useContext(ThemeContext);
