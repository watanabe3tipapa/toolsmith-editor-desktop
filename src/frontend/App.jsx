import React, { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';
import Editor from './components/Editor';
import { UI_THEMES } from './neo-brutalism-ui';
import { applyTheme, getInitialTheme, nextTheme, persistTheme } from './lib/theme';
import './App.css';
import './neo-brutalism-ui/theme.css';

function App() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = nextTheme(theme);
    setTheme(next);
    persistTheme(next);
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
          <span className="app-version rounded border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-[11px] text-primary">
            Desktop v0.1.0
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl">
        <Editor />
      </main>
      <footer className="app-footer mx-auto mt-6 w-full max-w-6xl border-t border-primary/20 pt-4 text-center text-[11px] text-foreground/35">
        <p>Toolsmith Editor Desktop · Local-first Markdown workspace</p>
      </footer>
    </div>
  );
}

export default App;
