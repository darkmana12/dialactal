export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

export function getPreferredTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  // Default to dark if not explicitly saved
  return 'dark';
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function setTheme(theme: Theme) {
  applyTheme(theme);
  try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
}

export function initTheme() {
  applyTheme(getPreferredTheme());
}
