import { isUiTheme } from '../neo-brutalism-ui';
import type { UiTheme } from '../neo-brutalism-ui';

const UI_THEME_KEY = 'toolsmith-editor-desktop:ui-theme';

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
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme === 'brutalist' ? 'light' : 'dark';
}

export function persistTheme(theme: UiTheme): void {
  try {
    window.localStorage.setItem(UI_THEME_KEY, theme);
  } catch {
    // persistence is best-effort
  }
}

export function nextTheme(theme: UiTheme): UiTheme {
  return theme === 'cosmic' ? 'brutalist' : 'cosmic';
}
