import path from 'tjs:path';
import { fail } from './path-guard.js';

const SETTINGS_FILE = 'settings.json';
const SETTINGS_VERSION = 1;
const DELAY_MIN = 300;
const DELAY_MAX = 5_000;

const DEFAULT_SETTINGS = {
  version: SETTINGS_VERSION,
  theme: 'cosmic',
  lastWorkspace: null,
  previewVisible: true,
  autoSaveDelayMs: 800,
  defaultExportDir: null,
};

let appRef = null;

export function setApp(app) {
  appRef = app;
}

async function settingsPath() {
  if (!appRef?.paths) fail('NO_APP', '設定ファイルの場所を取得できません。');
  const paths = await appRef.paths();
  return path.join(paths.data, SETTINGS_FILE);
}

function isUiTheme(value) {
  return value === 'cosmic' || value === 'brutalist';
}

function normalizeSettings(raw) {
  const settings = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== 'object') return settings;
  settings.version = SETTINGS_VERSION;
  if (isUiTheme(raw.theme)) settings.theme = raw.theme;
  if (raw.lastWorkspace === null) settings.lastWorkspace = null;
  else if (typeof raw.lastWorkspace === 'string' && path.isAbsolute(raw.lastWorkspace)) {
    settings.lastWorkspace = path.normalize(raw.lastWorkspace);
  }
  if (typeof raw.previewVisible === 'boolean') settings.previewVisible = raw.previewVisible;
  if (Number.isInteger(raw.autoSaveDelayMs)) {
    settings.autoSaveDelayMs = Math.min(DELAY_MAX, Math.max(DELAY_MIN, raw.autoSaveDelayMs));
  }
  if (typeof raw.defaultExportDir === 'string' && path.isAbsolute(raw.defaultExportDir)) {
    settings.defaultExportDir = path.normalize(raw.defaultExportDir);
  }
  return settings;
}

async function readSettingsFile() {
  const file = await settingsPath();
  let text;
  try {
    text = new TextDecoder().decode(await tjs.readFile(file));
  } catch {
    return { settings: { ...DEFAULT_SETTINGS }, path: file, exists: false, corrupted: false };
  }
  try {
    return { settings: normalizeSettings(JSON.parse(text)), path: file, exists: true, corrupted: false };
  } catch {
    const backup = `${file}.corrupt-${Date.now()}`;
    try {
      await tjs.rename(file, backup);
    } catch (error) {
      console.error('[settings] failed to back up corrupt settings:', error);
    }
    return { settings: { ...DEFAULT_SETTINGS }, path: file, exists: false, corrupted: true };
  }
}

async function writeSettingsFile(file, settings) {
  const dir = path.dirname(file);
  await tjs.makeDir(dir, { recursive: true });
  const temp = `${file}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await tjs.writeFile(temp, `${JSON.stringify(settings, null, 2)}\n`);
    await tjs.rename(temp, file);
  } catch (error) {
    try {
      await tjs.remove(temp, { force: true });
    } catch {
      // best-effort cleanup
    }
    throw error;
  }
}

async function assertExportDir(value) {
  const dir = path.normalize(String(value));
  let stat;
  try {
    stat = await tjs.stat(dir);
  } catch {
    fail('INVALID_SETTING', '既定の書き出し先フォルダが存在しません。');
  }
  if (!stat.isDirectory) {
    fail('INVALID_SETTING', '既定の書き出し先はフォルダを指定してください。');
  }
  return dir;
}

async function validatePatch(patch) {
  if (!patch || typeof patch !== 'object') fail('INVALID_SETTING', '設定内容が不正です。');
  const next = {};
  if ('theme' in patch) {
    if (!isUiTheme(patch.theme)) fail('INVALID_SETTING', 'UIテーマが不正です。');
    next.theme = patch.theme;
  }
  if ('lastWorkspace' in patch) {
    if (patch.lastWorkspace !== null) {
      if (typeof patch.lastWorkspace !== 'string' || !path.isAbsolute(patch.lastWorkspace)) {
        fail('INVALID_SETTING', 'ワークスペースのパスが不正です。');
      }
      next.lastWorkspace = path.normalize(patch.lastWorkspace);
    } else {
      next.lastWorkspace = null;
    }
  }
  if ('previewVisible' in patch) {
    if (typeof patch.previewVisible !== 'boolean') fail('INVALID_SETTING', 'プレビュー設定が不正です。');
    next.previewVisible = patch.previewVisible;
  }
  if ('autoSaveDelayMs' in patch) {
    const delay = Number(patch.autoSaveDelayMs);
    if (!Number.isInteger(delay) || delay < DELAY_MIN || delay > DELAY_MAX) {
      fail('INVALID_SETTING', `自動保存の待ち時間は${DELAY_MIN}〜${DELAY_MAX}msで指定してください。`);
    }
    next.autoSaveDelayMs = delay;
  }
  if ('defaultExportDir' in patch) {
    if (patch.defaultExportDir === null) {
      next.defaultExportDir = null;
    } else {
      if (typeof patch.defaultExportDir !== 'string' || !path.isAbsolute(patch.defaultExportDir)) {
        fail('INVALID_SETTING', '既定の書き出し先は絶対パスで指定してください。');
      }
      next.defaultExportDir = await assertExportDir(patch.defaultExportDir);
    }
  }
  return next;
}

async function getSettings() {
  const envelope = await readSettingsFile();
  return envelope;
}

async function updateSettings({ patch } = {}) {
  const next = await validatePatch(patch);
  const current = await readSettingsFile();
  const merged = normalizeSettings({ ...current.settings, ...next });
  const file = current.path;
  await writeSettingsFile(file, merged);
  return { settings: merged, path: file, exists: true };
}

async function resetSettings() {
  const current = await readSettingsFile();
  const settings = { ...DEFAULT_SETTINGS, lastWorkspace: current.settings.lastWorkspace };
  await writeSettingsFile(current.path, settings);
  return { settings, path: current.path, exists: true };
}

async function revealSettings() {
  const file = await settingsPath();
  if (!appRef?.shell?.reveal) fail('NO_SHELL', 'Finderを開けませんでした。');
  let target = file;
  try {
    await tjs.stat(file);
  } catch {
    target = path.dirname(file);
  }
  await appRef.shell.reveal(target);
  return { path: target };
}

export const settingsApi = {
  getSettings,
  updateSettings,
  resetSettings,
  revealSettings,
};
