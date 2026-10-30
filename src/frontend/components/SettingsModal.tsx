import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  FileJson,
  FolderOpen,
  FolderX,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { UI_THEMES } from '../neo-brutalism-ui';
import type { UiTheme } from '../neo-brutalism-ui';
import { confirmAction, parseBridgeError, pickWorkspaceFolder } from '../lib/desktop';
import type { AppSettings } from '../lib/desktop';

type SettingsModalProps = {
  open: boolean;
  settings: AppSettings;
  settingsPath: string;
  onClose: () => void;
  onSave: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  onReset: () => Promise<AppSettings>;
  onReveal: () => Promise<void>;
};

function SettingsModal({ open, settings, settingsPath, onClose, onSave, onReset, onReveal }: SettingsModalProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setDraft(settings);
    setError('');
    setBusy(false);
  }, [open, settings]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const chooseExportDir = async () => {
    try {
      const folder = await pickWorkspaceFolder();
      if (folder) setDraft((current) => ({ ...current, defaultExportDir: folder }));
    } catch (caught) {
      setError(parseBridgeError(caught).message);
    }
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const delay = Number(draft.autoSaveDelayMs);
      if (!Number.isInteger(delay) || delay < 300 || delay > 5000) {
        setError('自動保存の待ち時間は300〜5000msで指定してください。');
        return;
      }
      await onSave({
        theme: draft.theme,
        previewVisible: draft.previewVisible,
        autoSaveDelayMs: delay,
        defaultExportDir: draft.defaultExportDir,
      });
      onClose();
    } catch (caught) {
      setError(parseBridgeError(caught).message);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    const ok = await confirmAction(
      '設定を初期化しますか？',
      'テーマ、プレビュー表示、自動保存、既定の書き出し先が既定値に戻ります。',
    );
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      const next = await onReset();
      setDraft(next);
    } catch (caught) {
      setError(parseBridgeError(caught).message);
    } finally {
      setBusy(false);
    }
  };

  const reveal = async () => {
    try {
      await onReveal();
    } catch (caught) {
      setError(parseBridgeError(caught).message);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <section
        className="modal-panel flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl border border-primary/60 bg-background p-6 shadow-[0_0_40px_color-mix(in_srgb,var(--color-primary)_25%,transparent)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 font-orbitron text-xs tracking-[0.18em] text-primary">
              <SlidersHorizontal size={14} aria-hidden="true" />
              SETTINGS
            </p>
            <h2 id="settings-title" className="mt-3 text-xl font-semibold text-foreground">
              設定
            </h2>
            <p className="mt-2 text-sm leading-6 text-foreground/60">
              設定はアプリのデータフォルダにあるJSONファイルへ保存されます。
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

        <div className="mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
          <section>
            <h3 className="text-sm font-medium text-foreground">UIテーマ</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(Object.keys(UI_THEMES) as UiTheme[]).map((themeId) => {
                const theme = UI_THEMES[themeId];
                const selected = draft.theme === themeId;
                return (
                  <button
                    key={themeId}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, theme: themeId }))}
                    aria-pressed={selected}
                    className={`rounded border px-3 py-2 text-left transition-colors ${
                      selected
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-primary/25 text-foreground/70 hover:bg-primary/8'
                    }`}
                  >
                    <span className="block text-sm font-medium">{theme.label}</span>
                    <span className="mt-0.5 block text-[11px] text-foreground/45">{theme.description}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={draft.previewVisible}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, previewVisible: event.target.checked }))
                }
                className="mt-0.5"
              />
              <span>
                Markdownソースプレビューを表示する
                <span className="mt-0.5 block text-[11px] text-foreground/40">
                  表示メニューの「プレビューの表示を切り替え」と同じ設定です。
                </span>
              </span>
            </label>
            <label className="block text-sm text-foreground">
              自動保存の待ち時間
              <span className="ml-2 font-mono text-[11px] text-foreground/40">300〜5000ms</span>
              <input
                type="number"
                min={300}
                max={5000}
                step={100}
                value={draft.autoSaveDelayMs}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, autoSaveDelayMs: Number(event.target.value) }))
                }
                className="mt-1.5 block w-full rounded border border-primary/40 bg-black/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
          </section>

          <section>
            <h3 className="text-sm font-medium text-foreground">既定の書き出し先</h3>
            <p className="mt-1 text-[11px] leading-5 text-foreground/40">
              設定すると、エクスポート時に保存パネルを開かずこのフォルダへ書き出します。同名ファイルがある場合は連番を付けます。
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p
                className="min-w-0 flex-1 truncate rounded border border-primary/25 bg-black/30 px-3 py-2 font-mono text-[11px] text-foreground/60"
                title={draft.defaultExportDir ?? undefined}
              >
                {draft.defaultExportDir ?? '未設定（保存パネルを使用）'}
              </p>
              <button
                type="button"
                onClick={() => void chooseExportDir()}
                className="inline-flex items-center gap-1.5 rounded border border-primary/40 px-3 py-2 text-xs text-primary transition-colors hover:bg-primary/10"
              >
                <FolderOpen size={14} />
                選択
              </button>
              <button
                type="button"
                onClick={() => setDraft((current) => ({ ...current, defaultExportDir: null }))}
                disabled={!draft.defaultExportDir}
                className="inline-flex items-center gap-1.5 rounded border border-primary/25 px-3 py-2 text-xs text-foreground/60 transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FolderX size={14} />
                クリア
              </button>
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileJson size={14} aria-hidden="true" />
              設定ファイル
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p
                className="min-w-0 flex-1 truncate rounded border border-primary/25 bg-black/30 px-3 py-2 font-mono text-[11px] text-foreground/45"
                title={settingsPath}
              >
                {settingsPath || '（デスクトップ環境で表示されます）'}
              </p>
              <button
                type="button"
                onClick={() => void reveal()}
                className="rounded border border-primary/40 px-3 py-2 text-xs text-primary transition-colors hover:bg-primary/10"
              >
                Finderで表示
              </button>
            </div>
          </section>

          {error && (
            <p
              className="flex items-start gap-2 rounded border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs leading-5 text-red-200"
              role="alert"
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-primary/20 pt-4">
          <button
            type="button"
            onClick={() => void reset()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded border border-primary/25 px-3 py-2 text-xs text-foreground/60 transition-colors hover:bg-primary/10 disabled:opacity-40"
          >
            <RotateCcw size={14} />
            初期化
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-primary/25 px-4 py-2 text-sm text-foreground/60 transition-colors hover:bg-primary/10"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-semibold text-background transition-colors hover:brightness-110 disabled:opacity-40"
            >
              <Check size={15} />
              保存
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SettingsModal;
