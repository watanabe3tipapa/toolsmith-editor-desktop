import React from 'react';
import Editor from './components/Editor';
import './App.css';

function App() {
  return (
    <div className="App min-h-screen px-4 py-4 sm:px-6 sm:py-5">
      <header className="mx-auto mb-5 flex w-full max-w-6xl flex-wrap items-end justify-between gap-4 border-b border-primary/25 pb-4">
        <div>
          <h1 className="font-orbitron text-2xl font-bold tracking-[0.14em] text-primary drop-shadow-[0_0_20px_var(--color-primary)] sm:text-3xl">
            TOOLSMITH EDITOR
          </h1>
          <p className="mt-2 text-xs tracking-wide text-foreground/55">
            リッチテキストとMarkdownを往復し、ローカルファイルへ直接保存するデスクトップエディタ。
          </p>
        </div>
        <span className="rounded border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-[11px] text-primary">
          Desktop v0.1.0
        </span>
      </header>
      <main className="mx-auto w-full max-w-6xl">
        <Editor />
      </main>
      <footer className="mx-auto mt-6 w-full max-w-6xl border-t border-primary/20 pt-4 text-center text-[11px] text-foreground/35">
        <p>Toolsmith Editor Desktop · Local-first Markdown workspace</p>
      </footer>
    </div>
  );
}

export default App;
