import React, { useEffect, useState } from 'react';
import { Palette, Settings2 } from 'lucide-react';
import Editor from './components/Editor';
import SettingsModal from './components/SettingsModal';
import { UI_THEMES } from './neo-brutalism-ui';
import { applyTheme, getInitialTheme, nextTheme, persistTheme } from './lib/theme';
import {
  DEFAULT_SETTINGS,
  getSettingsPath,
  loadSettings,
  patchSettings,
  resetAllSettings,
} from './lib/settings';
import { parseBridgeError, revealSettings as revealSettingsFile } from './lib/desktop';
import './App.css';
import './neo-brutalism-ui/theme.css';

function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [settings, setSettings] = useState(null);
  const [settingsPath, setSettingsPath] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    loadSettings()
      .then((next) => {
        if (cancelled) return;
        setSettings(next);
        setSettingsPath(getSettingsPath());
        setTheme(next.theme);
      })
      .catch((error) => {
        console.error('設定を読み込めませんでした。', parseBridgeError(error));
      });
    return () => {
      cancelled = true;
    };
  }, [setSettings]);

  const saveSettings = async (patch) => {
    const next = await patchSettings(patch);
    setSettings(next);
    setSettingsPath(getSettingsPath());
    setTheme(next.theme);
    return next;
  };

  const resetSettings = async () => {
    const next = await resetAllSettings();
    setSettings(next);
    setSettingsPath(getSettingsPath());
    setTheme(next.theme);
    return next;
  };

  const toggleTheme = () => {
    const next = nextTheme(theme);
    setTheme(next);
    persistTheme(next);
    void saveSettings({ theme: next }).catch((error) => {
      console.error('テーマを保存できませんでした。', parseBridgeError(error));
    });
  };

  return (
    <div className="App min-h-screen px-4 py-4 sm:px-6 sm:py-5">
      <header className="app-header mx-auto mb-5 flex w-full max-w-6xl flex-wrap items-end justify-between gap-4 border-b border-primary/25 pb-4">
        <div>
          <h1 className="app-title font-orbitron text-2xl font-bold tracking-[0.14em] text-primary drop-shadow-[0_0_20px_var(--color-primary)] sm:text-3xl">
            TOOLSMITH EDITOR
          </h1>
          <p className="app-subtitle mt-2 text-xs tracking-wide text-foreground/55">
            リッチテキストとMarkdownを往復し、ローカルファイルへ直接保存するデスクトップエディタ。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle inline-flex items-center gap-2 rounded border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-[11px] text-primary transition-colors hover:bg-primary/15"
            aria-label={`UIデザインを${UI_THEMES[nextTheme(theme)].description}に切り替え`}
            title={`UIデザインを${UI_THEMES[nextTheme(theme)].description}に切り替え`}
          >
            <Palette size={14} aria-hidden="true" />
            <span>UI: {UI_THEMES[theme].label}</span>
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-2 rounded border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-[11px] text-primary transition-colors hover:bg-primary/15"
            aria-label="設定を開く"
            title="設定を開く"
          >
            <Settings2 size={14} aria-hidden="true" />
            <span>設定</span>
          </button>
          <span className="app-version rounded border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-[11px] text-primary">
            Desktop v0.1.1
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl">
        <Editor settings={settings} onPatchSettings={saveSettings} onOpenSettings={() => setSettingsOpen(true)} />
      </main>
      <footer className="app-footer mx-auto mt-6 w-full max-w-6xl border-t border-primary/20 pt-4 text-center text-[11px] text-foreground/35">
        <p>Toolsmith Editor Desktop · Local-first Markdown workspace</p>
      </footer>
      <SettingsModal
        open={settingsOpen}
        settings={settings ?? DEFAULT_SETTINGS}
        settingsPath={settingsPath}
        onClose={() => setSettingsOpen(false)}
        onSave={saveSettings}
        onReset={resetSettings}
        onReveal={async () => {
          await revealSettingsFile();
        }}
      />
    </div>
  );
}

export default App;

