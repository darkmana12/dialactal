import React, { useEffect, useState } from 'react';
import { getPreferredTheme, setTheme, type Theme } from '../utils/theme';

const ThemeToggle: React.FC = () => {
  const [theme, setThemeState] = useState<Theme>(() => (typeof window !== 'undefined' ? getPreferredTheme() : 'light'));

  useEffect(() => {
    // Keep state in sync with storage changes from other tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
        setThemeState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
      title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition select-none
                 bg-[#111827] text-white border-[#111827] shadow-sm
                 dark:bg-[#e5e7eb] dark:text-[#111827] dark:border-[#e5e7eb]
                 hover:opacity-95"
    >
      <span className="w-4 h-4 inline-block">
        {theme === 'dark' ? (
          // Sun icon
          <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42zM1 13h3v-2H1v2zm10 10h2v-3h-2v3zM4.95 19.07l1.41 1.41 1.8-1.79-1.42-1.42-1.79 1.8zM20 11v2h3v-2h-3zm-2.95-7.95l-1.41 1.41 1.79 1.8 1.42-1.42-1.8-1.79zM12 6a6 6 0 100 12A6 6 0 0012 6zm0-5h-2v3h2V1zm7 20l-1.8-1.79-1.42 1.42 1.8 1.79L19 21z"/>
          </svg>
        ) : (
          // Moon icon
          <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2a9.931 9.931 0 00-7.07 2.93A10 10 0 1012 2zm0 18a8 8 0 116.32-12.9A9.964 9.964 0 0012 4a8 8 0 000 16z"/>
          </svg>
        )}
      </span>
      <span className="text-sm font-medium">{theme === 'dark' ? 'Clair' : 'Sombre'}</span>
    </button>
  );
};

export default ThemeToggle;
