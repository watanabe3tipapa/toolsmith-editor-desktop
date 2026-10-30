import { isUiTheme } from './themes';
import type { UiTheme } from './themes';

const UI_THEME_KEY = 'toolsmith-editor-desktop:ui-theme';

const THEME_COLORS: Record<UiTheme, { light: string; dark: string }> = {
  cosmic: { light: '#071526', dark: '#071526' },
  brutalist: { light: '#ece8da', dark: '#ece8da' },
  cupertino: { light: '#f2f2f7', dark: '#000000' },
};

let activeTheme: UiTheme = 'cosmic';
let systemDark = false;

function prefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

function updateThemeColor(): void {
  if (typeof document === 'undefined') return;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
  }
  const colors = THEME_COLORS[activeTheme];
  meta.content = systemDark ? colors.dark : colors.light;
}

export function getInitialTheme(): UiTheme {
  try {
    const stored = window.localStorage.getItem(UI_THEME_KEY);
    if (isUiTheme(stored)) return stored;
  } catch {
    // localStorage unavailable: fall back to the default theme
  }
  return 'cosmic';
}

export function applyTheme(theme: UiTheme): void {
  activeTheme = theme;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme =
    theme === 'brutalist' ? 'light' : theme === 'cupertino' ? 'light dark' : 'dark';
  updateThemeColor();
}

export function persistTheme(theme: UiTheme): void {
  try {
    window.localStorage.setItem(UI_THEME_KEY, theme);
  } catch {
    // persistence is best-effort
  }
}

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  systemDark = prefersDark();
  query.addEventListener?.('change', (event) => {
    systemDark = event.matches;
    updateThemeColor();
  });
}
