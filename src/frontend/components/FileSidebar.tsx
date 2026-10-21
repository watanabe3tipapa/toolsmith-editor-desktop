import React from 'react';
import { FilePlus2, FileText, FolderOpen, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import type { WorkspaceFile } from '../lib/desktop';

type FileSidebarProps = {
  files: WorkspaceFile[];
  activePath: string | null;
  workspaceRoot: string | null;
  loading: boolean;
  onSelect: (path: string) => void;
  onCreate: () => void;
  onRename: (path: string) => void;
  onDelete: (path: string) => void;
  onOpenFolder: () => void;
  onRefresh: () => void;
};

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function FileSidebar({
  files,
  activePath,
  workspaceRoot,
  loading,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onOpenFolder,
  onRefresh,
}: FileSidebarProps) {
  return (
    <aside className="file-sidebar flex min-h-[320px] flex-col rounded-lg border border-primary/40 bg-black/40 p-3 text-left" aria-label="Markdownファイル一覧">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-orbitron text-xs uppercase tracking-[0.18em] text-primary/80">Workspace</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenFolder}
            title="フォルダを開く"
            aria-label="フォルダを開く"
            className="rounded border border-primary/40 p-1.5 text-primary transition-colors hover:bg-primary/15"
          >
            <FolderOpen size={15} />
          </button>
          <button
            type="button"
            onClick={onRefresh}
            title="ファイル一覧を更新"
            aria-label="ファイル一覧を更新"
            className="rounded border border-primary/40 p-1.5 text-primary transition-colors hover:bg-primary/15"
          >
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            onClick={onCreate}
            title="新しいMarkdownファイル"
            aria-label="新しいMarkdownファイル"
            className="rounded border border-primary/40 p-1.5 text-primary transition-colors hover:bg-primary/15"
          >
            <FilePlus2 size={15} />
          </button>
        </div>
      </div>

      <p className="mb-3 truncate font-mono text-[10px] text-foreground/40" title={workspaceRoot ?? undefined}>
        {workspaceRoot ?? 'フォルダ未選択'}
      </p>

      <div className="space-y-1 overflow-y-auto">
        {loading ? (
          <p className="px-1 py-3 text-xs text-foreground/40">読み込み中…</p>
        ) : files.length === 0 ? (
          <p className="px-1 py-3 text-xs text-foreground/40">
            このフォルダにはMarkdownファイルがありません。
          </p>
        ) : (
          files.map((file) => {
            const isActive = file.path === activePath;
            return (
              <div
                key={file.path}
                className={`file-item group flex items-center gap-1.5 rounded border px-2 py-1.5 transition-colors ${
                  isActive
                    ? 'is-active border-primary/60 bg-primary/15'
                    : 'border-transparent hover:border-primary/30 hover:bg-primary/8'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(file.path)}
                  className="flex min-w-0 flex-1 items-start gap-2 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-current={isActive ? 'true' : undefined}
                >
                  <FileText size={15} className={`mt-0.5 shrink-0 ${isActive ? 'text-primary' : 'text-foreground/45'}`} />
                  <span className="min-w-0">
                    <span className={`block truncate text-sm ${isActive ? 'font-medium text-foreground' : 'text-foreground/70'}`}>
                      {file.name}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10px] text-foreground/35">
                      {formatDate(file.mtimeMs)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onRename(file.path)}
                  title="名前を変更"
                  aria-label={`${file.name} の名前を変更`}
                  className="shrink-0 rounded p-1 text-foreground/30 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(file.path)}
                  title="ファイルを削除"
                  aria-label={`${file.name} を削除`}
                  className="shrink-0 rounded p-1 text-foreground/30 transition-colors hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

export default FileSidebar;
