import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, ExternalLink, FilePlus2, Globe2, Loader2, X } from 'lucide-react';
import { clipWebPage, suggestedClipName } from '../lib/web-clip';
import type { WebClip } from '../lib/web-clip';
import { openExternal, parseBridgeError } from '../lib/desktop';

type WebClipModalProps = {
  open: boolean;
  canInsert: boolean;
  canSave: boolean;
  onClose: () => void;
  onInsert: (markdown: string) => void;
  onSave: (markdown: string, name: string) => Promise<boolean>;
};

type BusyKind = 'fetch' | 'browser' | null;

function WebClipModal({ open, canInsert, canSave, onClose, onInsert, onSave }: WebClipModalProps) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState<BusyKind>(null);
  const [error, setError] = useState('');
  const [clip, setClip] = useState<WebClip | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const fetchClip = async () => {
    const value = url.trim();
    if (!value || busy) return;
    setBusy('fetch');
    setError('');
    try {
      const result = await clipWebPage(value);
      setClip(result);
      setUrl(result.url);
    } catch (caught) {
      setClip(null);
      setError(parseBridgeError(caught).message);
    } finally {
      setBusy(null);
    }
  };

  const openInBrowser = async () => {
    const value = url.trim();
    if (!value || busy) return;
    setBusy('browser');
    setError('');
    try {
      await openExternal(value);
    } catch (caught) {
      setError(parseBridgeError(caught).message);
    } finally {
      setBusy(null);
    }
  };

  const saveAsFile = async () => {
    if (!clip) return;
    const saved = await onSave(clip.markdown, suggestedClipName(clip.title, clip.url));
    if (saved) onClose();
  };

  const insertIntoDocument = () => {
    if (!clip) return;
    onInsert(clip.markdown);
    onClose();
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <section
        className="modal-panel flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-primary/60 bg-background p-6 shadow-[0_0_40px_color-mix(in_srgb,var(--color-primary)_25%,transparent)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="web-clip-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 font-orbitron text-xs tracking-[0.18em] text-primary">
              <Globe2 size={14} aria-hidden="true" />
              WEB CLIP
            </p>
            <h2 id="web-clip-title" className="mt-3 text-xl font-semibold text-foreground">
              Webページを取り込む
            </h2>
            <p className="mt-2 text-sm leading-6 text-foreground/60">
              URLから本文を抽出してMarkdownにします。ログインが必要なページは外部ブラウザで開いてください。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="rounded border border-primary/30 p-1.5 text-foreground/50 transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <X size={16} />
          </button>
        </div>

        <form
          className="mt-5 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void fetchClip();
          }}
        >
          <input
            ref={inputRef}
            type="text"
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/article"
            aria-label="取り込むURL"
            spellCheck={false}
            className="min-w-0 flex-1 rounded border border-primary/40 bg-black/40 px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-foreground/30 focus:border-primary"
          />
          <button
            type="submit"
            disabled={Boolean(busy) || !url.trim()}
            className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-semibold text-background transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === 'fetch' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            取得
          </button>
          <button
            type="button"
            onClick={() => void openInBrowser()}
            disabled={Boolean(busy) || !url.trim()}
            className="inline-flex items-center gap-1.5 rounded border border-primary/40 px-4 py-2 text-sm text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ExternalLink size={15} />
            ブラウザで開く
          </button>
        </form>

        {error && (
          <p
            className="mt-4 flex items-start gap-2 rounded border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs leading-5 text-red-200"
            role="alert"
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {clip ? (
            <div className="rounded border border-primary/30 bg-black/30 p-4">
              <h3 className="text-base font-semibold text-foreground">{clip.title}</h3>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-foreground/45">
                {clip.siteName && <span>{clip.siteName}</span>}
                {clip.byline && <span>· {clip.byline}</span>}
                {clip.publishedTime && <span>· {clip.publishedTime}</span>}
                <span>· {clip.charCount.toLocaleString('ja-JP')}文字</span>
              </p>
              <p className="mt-1 truncate font-mono text-[11px] text-foreground/35" title={clip.url}>
                {clip.url}
              </p>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-primary/20 bg-black/40 p-3 text-left font-mono text-xs leading-5 text-foreground/75">
                {clip.markdown}
              </pre>
            </div>
          ) : (
            <div className="flex min-h-[180px] items-center justify-center rounded border border-dashed border-primary/25 bg-black/20 p-6 text-center text-xs leading-5 text-foreground/35">
              URLを入力して「取得」を押すと、本文を抽出したMarkdownをここに表示します。
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-primary/20 pt-4">
          <p className="text-[11px] leading-5 text-foreground/40">
            {canInsert
              ? '「文書に追加」は現在のファイルの末尾へ追記します。'
              : '文書へ追加するには、先にワークスペースのファイルを開いてください。'}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-primary/25 px-4 py-2 text-sm text-foreground/60 transition-colors hover:bg-primary/10"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => void saveAsFile()}
              disabled={!clip || !canSave}
              title={canSave ? undefined : 'ワークスペースを開いてください'}
              className="inline-flex items-center gap-1.5 rounded border border-primary/40 px-4 py-2 text-sm text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FilePlus2 size={15} />
              新規ファイルに保存
            </button>
            <button
              type="button"
              onClick={insertIntoDocument}
              disabled={!clip || !canInsert}
              title={canInsert ? undefined : 'ファイルを開いてください'}
              className="rounded bg-primary px-4 py-2 text-sm font-semibold text-background transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              文書に追加
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default WebClipModal;
