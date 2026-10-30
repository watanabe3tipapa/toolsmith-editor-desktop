import {
  getLastWorkspace,
  getSettings as readSettingsEnvelope,
  hasDesktopBridge,
  resetSettings as resetBackendSettings,
  updateSettings as writeSettings,
} from './desktop';
import type { AppSettings } from './desktop';
import { getInitialTheme, persistTheme } from './theme';

export const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  theme: 'cosmic',
  lastWorkspace: null,
  previewVisible: true,
  autoSaveDelayMs: 800,
  defaultExportDir: null,
};

let cache: AppSettings | null = null;
let cachedPath = '';
let loadPromise: Promise<AppSettings> | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

function localFallback(): AppSettings {
  return { ...DEFAULT_SETTINGS, theme: getInitialTheme() };
}

export function getCachedSettings(): AppSettings | null {
  return cache;
}

export function getSettingsPath(): string {
  return cachedPath;
}

export async function loadSettings(): Promise<AppSettings> {
  if (!hasDesktopBridge()) {
    cache = localFallback();
    return cache;
  }
  if (!loadPromise) {
    loadPromise = (async () => {
      const envelope = await readSettingsEnvelope();
      cachedPath = envelope.path;
      if (!envelope.exists) {
        const migrated: AppSettings = {
          ...envelope.settings,
          theme: getInitialTheme(),
          lastWorkspace: (await getLastWorkspace()) ?? envelope.settings.lastWorkspace,
        };
        const saved = await writeSettings(migrated);
        cache = saved.settings;
        cachedPath = saved.path;
      } else {
        cache = envelope.settings;
      }
      persistTheme(cache.theme);
      return cache;
    })().catch((error) => {
      loadPromise = null;
      throw error;
    });
  }
  return loadPromise;
}

export async function patchSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  if (!hasDesktopBridge()) {
    cache = { ...(cache ?? localFallback()), ...patch };
    persistTheme(cache.theme);
    return cache;
  }
  await loadSettings();
  const task = writeQueue.then(() => writeSettings(patch));
  writeQueue = task.catch(() => undefined);
  const envelope = await task;
  cache = envelope.settings;
  cachedPath = envelope.path;
  persistTheme(cache.theme);
  return cache;
}

export async function resetAllSettings(): Promise<AppSettings> {
  if (!hasDesktopBridge()) {
    cache = localFallback();
    persistTheme(cache.theme);
    return cache;
  }
  await loadSettings();
  const task = writeQueue.then(() => resetBackendSettings());
  writeQueue = task.catch(() => undefined);
  const envelope = await task;
  cache = envelope.settings;
  cachedPath = envelope.path;
  persistTheme(cache.theme);
  return cache;
}
