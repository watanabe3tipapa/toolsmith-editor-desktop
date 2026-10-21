import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { EditorState } from 'lexical';
import { FilePlus2, FolderOpen, Save } from 'lucide-react';
import Toolbar from './Toolbar';
import MarkdownPreview from './MarkdownPreview';
import FileSidebar from './FileSidebar';
import { DEFAULT_MARKDOWN } from '../lib/constants';
import { TRANSFORMERS_WITH_TABLE } from '../lib/markdown';
import { EXPORT_OPTIONS, saveExport } from '../lib/export';
import type { ExportFormat } from '../lib/export';
import { APP_MENU } from '../lib/menu';
import {
  alertMessage,
  confirmAction,
  createFile as createWorkspaceFile,
  deleteFile as deleteWorkspaceFile,
  getLastWorkspace,
  hasDesktopBridge,
  listFiles,
  readFile as readWorkspaceFile,
  onFileDrop,
  onMenuCommand,
  onOpenPaths,
  onWorkspaceChanged,
  openPath,
  openWorkspace,
  parseBridgeError,
  pickWorkspaceFolder,
  promptText,
  rememberWorkspace,
  renameFile as renameWorkspaceFile,
  setAppMenu,
  setWindowTitle,
  writeFile,
} from '../lib/desktop';
import type { OpenWorkspaceResult, WorkspaceFile } from '../lib/desktop';

const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'editor-heading-h4',
    h5: 'editor-heading-h5',
    h6: 'editor-heading-h6',
  },
  list: {
    nested: {
      listitem: 'editor-nested-listitem',
    },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listitem',
    checklist: 'editor-checklist',
  },
  link: 'editor-link',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    underlineStrikethrough: 'editor-text-underlineStrikethrough',
    code: 'editor-text-code',
    subscript: 'editor-text-subscript',
    superscript: 'editor-text-superscript',
  },
  code: 'editor-code',
  codeHighlight: {
    atrule: 'editor-tokenAttr',
    attr: 'editor-tokenAttr',
    boolean: 'editor-tokenConstant',
    builtin: 'editor-tokenSelector',
    cdata: 'editor-tokenComment',
    char: 'editor-tokenSelector',
    class: 'editor-tokenFunction',
    'class-name': 'editor-tokenFunction',
    comment: 'editor-tokenComment',
    constant: 'editor-tokenConstant',
    decorator: 'editor-tokenFunction',
    entity: 'editor-tokenOperator',
    function: 'editor-tokenFunction',
    important: 'editor-tokenVariable',
    keyword: 'editor-tokenAtrule',
    namespace: 'editor-tokenVariable',
    number: 'editor-tokenConstant',
    operator: 'editor-tokenOperator',
    property: 'editor-tokenProperty',
    punctuation: 'editor-tokenPunctuation',
    regex: 'editor-tokenVariable',
    selector: 'editor-tokenSelector',
    string: 'editor-tokenSelector',
    symbol: 'editor-tokenConstant',
    tag: 'editor-tokenProperty',
    url: 'editor-tokenOperator',
    variable: 'editor-tokenVariable',
  },
};

const editorConfig = {
  namespace: 'CosmicEditor',
  theme,
  onError(error: Error) {
    console.error('TOOLSMITH EDITOR: Lexicalエラーです。', error);
  },
  nodes: [
    HeadingNode,
    ListNode,
    ListItemNode,
    QuoteNode,
    CodeNode,
    LinkNode,
    TableNode,
    TableCellNode,
    TableRowNode,
  ],
};

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error' | 'conflict';

type ConflictState = {
  kind: 'save' | 'external' | 'deleted';
  path: string;
  mtimeMs?: number;
  message: string;
} | null;

function InitialMarkdownPlugin({ markdown }: { markdown: string }) {
  const [editor] = useLexicalComposerContext();
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    editor.update(
      () => {
        $convertFromMarkdownString(markdown, TRANSFORMERS_WITH_TABLE);
      },
      { tag: 'initial-load' },
    );
  }, [editor, markdown]);

  return null;
}

function EditorSetupPlugin({ onReady }: { onReady: (editor: any) => void }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    onReady(editor);
  }, [editor, onReady]);
  return null;
}

function nameFromPath(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath;
}

function formatLastSaved(lastSaved: Date | null): string {
  if (!lastSaved) return '未保存';
  const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
  if (seconds < 60) return 'たった今';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分前`;
  return lastSaved.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function Editor() {
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [saveError, setSaveError] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState('');
  const [editor, setEditor] = useState(null);
  const [editorKey, setEditorKey] = useState(0);
  const [conflict, setConflictState] = useState<ConflictState>(null);
  const [previewVisible, setPreviewVisible] = useState(true);

  const workspaceRef = useRef<string | null>(null);
  const filesRef = useRef<WorkspaceFile[]>([]);
  const activePathRef = useRef<string | null>(null);
  const markdownRef = useRef('');
  const baselineRef = useRef('');
  const dirtyRef = useRef(false);
  const mtimeRef = useRef(0);
  const saveTimerRef = useRef<number | null>(null);
  const savingRef = useRef(false);
  const pendingSaveRef = useRef<string | null>(null);
  const conflictRef = useRef<ConflictState>(null);
  const saveNowRef = useRef<(content?: string, force?: boolean) => Promise<void>>(async () => {});

  const setConflict = useCallback((next: ConflictState) => {
    conflictRef.current = next;
    setConflictState(next);
  }, []);

  const resetEditor = useCallback((path: string | null) => {
    activePathRef.current = path;
    setActivePath(path);
    markdownRef.current = '';
    setMarkdown('');
    baselineRef.current = '';
    dirtyRef.current = false;
    setDirty(false);
    mtimeRef.current = 0;
    setLastSaved(null);
    setSaveStatus('saved');
    setSaveError('');
    setEditorKey((key) => key + 1);
    setWindowTitle(path ? nameFromPath(path) : null, false);
  }, []);

  const loadFile = useCallback(async (path: string) => {
    const result = await readWorkspaceFile(path);
    activePathRef.current = result.path;
    setActivePath(result.path);
    markdownRef.current = result.content;
    setMarkdown(result.content);
    baselineRef.current = result.content;
    dirtyRef.current = false;
    setDirty(false);
    mtimeRef.current = result.mtimeMs;
    setLastSaved(new Date(result.mtimeMs));
    setSaveStatus('saved');
    setSaveError('');
    setConflict(null);
    setEditorKey((key) => key + 1);
    setWindowTitle(result.name, false);
  }, [setConflict]);

  const refreshFiles = useCallback(async (): Promise<WorkspaceFile[]> => {
    if (!workspaceRef.current) return [];
    const next = await listFiles();
    filesRef.current = next;
    setFiles(next);
    return next;
  }, []);

  const applyOpenedWorkspace = useCallback(
    async (opened: OpenWorkspaceResult, preferredPath?: string | null) => {
      workspaceRef.current = opened.root;
      filesRef.current = opened.files;
      setWorkspaceRoot(opened.root);
      setFiles(opened.files);
      await rememberWorkspace(opened.root);
      const nextPath =
        preferredPath && opened.files.some((file) => file.path === preferredPath)
          ? preferredPath
          : opened.activePath && opened.files.some((file) => file.path === opened.activePath)
            ? opened.activePath
            : opened.files[0]?.path ?? null;
      if (nextPath) {
        await loadFile(nextPath);
      } else {
        resetEditor(null);
      }
      setBootError('');
      setConflict(null);
    },
    [loadFile, resetEditor, setConflict],
  );

  const startWorkspace = useCallback(
    async (path: string, preferredPath?: string | null) => {
      const opened = await openWorkspace(path);
      await applyOpenedWorkspace(opened, preferredPath);
    },
    [applyOpenedWorkspace],
  );

  const saveNow = useCallback(
    async (content?: string, force = false) => {
      const targetPath = activePathRef.current;
      if (!targetPath) return;
      if (conflictRef.current && !force) return;
      const value = content ?? markdownRef.current;
      if (!force && value === baselineRef.current) {
        dirtyRef.current = false;
        setDirty(false);
        setSaveStatus('saved');
        return;
      }
      if (savingRef.current) {
        pendingSaveRef.current = value;
        return;
      }
      savingRef.current = true;
      setSaveStatus('saving');
      try {
        const result = await writeFile(targetPath, value, mtimeRef.current, force);
        mtimeRef.current = result.mtimeMs;
        baselineRef.current = value;
        const stillDirty = markdownRef.current !== value;
        dirtyRef.current = stillDirty;
        setDirty(stillDirty);
        setSaveStatus(stillDirty ? 'unsaved' : 'saved');
        setSaveError('');
        setLastSaved(new Date(result.mtimeMs));
        setWindowTitle(nameFromPath(targetPath), stillDirty);
      } catch (error) {
        const parsed = parseBridgeError(error);
        if (parsed.code === 'CONFLICT') {
          setConflict({
            kind: parsed.deleted ? 'deleted' : 'save',
            path: targetPath,
            mtimeMs: parsed.mtimeMs,
            message: parsed.message,
          });
          setSaveStatus('conflict');
          setSaveError(parsed.message);
        } else {
          setSaveStatus('error');
          setSaveError(parsed.message);
        }
      } finally {
        savingRef.current = false;
        const pending = pendingSaveRef.current;
        pendingSaveRef.current = null;
        if (pending !== null && pending !== baselineRef.current && !conflictRef.current) {
          void saveNowRef.current(pending);
        }
      }
    },
    [setConflict],
  );

  useEffect(() => {
    saveNowRef.current = saveNow;
  }, [saveNow]);

  const exportDocument = useCallback(async (format: ExportFormat) => {
    if (!activePathRef.current) {
      await alertMessage('エクスポートするファイルがありません。');
      return;
    }
    const option = EXPORT_OPTIONS(markdownRef.current).find((entry) => entry.format === format);
    if (!option) return;
    const base = nameFromPath(activePathRef.current);
    try {
      await saveExport(option, base);
    } catch (error) {
      const parsed = parseBridgeError(error);
      await alertMessage('エクスポートできませんでした。', parsed.message);
    }
  }, []);

  const scheduleSave = useCallback((value: string) => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void saveNowRef.current(value);
    }, 800);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!hasDesktopBridge()) {
        if (!cancelled) {
          setBootError('この画面は tinyjs アプリとして起動してください。`tinyjs dev` でネイティブウィンドウが開きます。');
          setLoading(false);
        }
        return;
      }
      try {
        const last = await getLastWorkspace();
        if (last) {
          try {
            await startWorkspace(last);
          } catch (error) {
            const parsed = parseBridgeError(error);
            if (!cancelled) setBootError(`前回のワークスペースを開けませんでした: ${parsed.message}`);
          }
        }
      } catch (error) {
        const parsed = parseBridgeError(error);
        if (!cancelled) setBootError(parsed.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [startWorkspace]);

  useEffect(() => {
    const handleSave = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveNowRef.current();
      }
    };
    const flush = () => {
      if (dirtyRef.current) void saveNowRef.current();
    };
    const handleVisibility = () => {
      if (document.hidden) flush();
    };
    window.addEventListener('keydown', handleSave);
    window.addEventListener('blur', flush);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('keydown', handleSave);
      window.removeEventListener('blur', flush);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    const offChanged = onWorkspaceChanged(async (changes) => {
      if (!workspaceRef.current) return;
      const next = await refreshFiles().catch(() => null);
      if (!next) return;
      const currentPath = activePathRef.current;
      if (!currentPath) return;
      const currentName = nameFromPath(currentPath);
      if (!changes.some((change) => change.filename === currentName)) return;

      const entry = next.find((file) => file.path === currentPath);
      if (!entry) {
        if (dirtyRef.current) {
          setConflict({
            kind: 'deleted',
            path: currentPath,
            message: '編集中のファイルが外部で削除または移動されました。',
          });
          setSaveStatus('conflict');
        } else {
          const fallback = next[0]?.path ?? null;
          if (fallback) await loadFile(fallback);
          else resetEditor(null);
        }
        return;
      }

      if (entry.mtimeMs === mtimeRef.current) return;

      if (dirtyRef.current) {
        setConflict({
          kind: 'external',
          path: currentPath,
          mtimeMs: entry.mtimeMs,
          message: '編集中のファイルが外部で変更されました。',
        });
        setSaveStatus('conflict');
      } else {
        await loadFile(currentPath);
      }
    });

    return () => {
      offChanged();
    };
  }, [loadFile, refreshFiles, resetEditor, setConflict]);

  useEffect(() => {
    const handlePaths = async (paths: string[]) => {
      const first = paths.find(Boolean);
      if (!first) return;
      try {
        if (saveTimerRef.current !== null) {
          window.clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        await saveNowRef.current();
        const opened = await openPath(first);
        await applyOpenedWorkspace(opened);
      } catch (error) {
        const parsed = parseBridgeError(error);
        await alertMessage('ファイルを開けませんでした。', parsed.message);
      }
    };

    const offDrop = onFileDrop((paths) => {
      void handlePaths(paths);
    });
    const offOpen = onOpenPaths((paths) => {
      void handlePaths(paths);
    });

    return () => {
      offDrop();
      offOpen();
    };
  }, [applyOpenedWorkspace]);

  const onChange = (editorState: EditorState, _editor: unknown, tags: Set<string>) => {
    if (tags.has('initial-load')) return;
    editorState.read(() => {
      const nextMarkdown = $convertToMarkdownString(TRANSFORMERS_WITH_TABLE);
      if (nextMarkdown === markdownRef.current) return;
      markdownRef.current = nextMarkdown;
      setMarkdown(nextMarkdown);
      const nextDirty = nextMarkdown !== baselineRef.current;
      dirtyRef.current = nextDirty;
      setDirty(nextDirty);
      setSaveStatus(nextDirty ? 'unsaved' : 'saved');
      setWindowTitle(activePathRef.current ? nameFromPath(activePathRef.current) : null, nextDirty);
      if (nextDirty && !conflictRef.current) scheduleSave(nextMarkdown);
    });
  };

  const openFolder = async () => {
    const folder = await pickWorkspaceFolder();
    if (!folder) return;
    try {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      await saveNowRef.current();
      await startWorkspace(folder);
    } catch (error) {
      const parsed = parseBridgeError(error);
      await alertMessage('フォルダを開けませんでした。', parsed.message);
    }
  };

  const selectFile = async (path: string) => {
    if (path === activePathRef.current) return;
    try {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      await saveNowRef.current();
      await loadFile(path);
    } catch (error) {
      const parsed = parseBridgeError(error);
      await alertMessage('ファイルを開けませんでした。', parsed.message);
    }
  };

  const createNewFile = async () => {
    const name = await promptText('新しいMarkdownファイル名', 'untitled.md');
    if (!name) return;
    try {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      await saveNowRef.current();
      const created = await createWorkspaceFile(name, DEFAULT_MARKDOWN);
      filesRef.current = created.files;
      setFiles(created.files);
      await loadFile(created.file.path);
    } catch (error) {
      const parsed = parseBridgeError(error);
      await alertMessage('ファイルを作成できませんでした。', parsed.message);
    }
  };

  const renameActiveFile = async (path: string) => {
    const target = filesRef.current.find((file) => file.path === path);
    const name = await promptText('新しいファイル名', target?.name ?? nameFromPath(path));
    if (!name || name === target?.name) return;
    try {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      await saveNowRef.current();
      const renamed = await renameWorkspaceFile(path, name);
      filesRef.current = renamed.files;
      setFiles(renamed.files);
      if (activePathRef.current === path) {
        await loadFile(renamed.file.path);
      }
    } catch (error) {
      const parsed = parseBridgeError(error);
      await alertMessage('名前を変更できませんでした。', parsed.message);
    }
  };

  const deleteActiveFile = async (path: string) => {
    const target = filesRef.current.find((file) => file.path === path);
    const ok = await confirmAction(
      `「${target?.name ?? nameFromPath(path)}」を削除しますか？`,
      'この操作は取り消せません。',
    );
    if (!ok) return;
    try {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const removed = await deleteWorkspaceFile(path);
      filesRef.current = removed.files;
      setFiles(removed.files);
      if (activePathRef.current === path) {
        const next = removed.files[0]?.path ?? null;
        if (next) await loadFile(next);
        else resetEditor(null);
      }
    } catch (error) {
      const parsed = parseBridgeError(error);
      await alertMessage('ファイルを削除できませんでした。', parsed.message);
    }
  };

  const reloadFromDisk = async () => {
    if (!conflict) return;
    try {
      await loadFile(conflict.path);
    } catch (error) {
      const parsed = parseBridgeError(error);
      await alertMessage('ファイルを再読み込みできませんでした。', parsed.message);
    }
  };

  const overwriteConflict = async () => {
    if (!conflict) return;
    setConflict(null);
    setSaveStatus('unsaved');
    await saveNowRef.current(markdownRef.current, true);
  };

  const dismissConflict = () => {
    setConflict(null);
    setSaveStatus(dirtyRef.current ? 'unsaved' : 'saved');
    setSaveError('');
  };

  const menuActionsRef = useRef<Record<string, () => void>>({});
  menuActionsRef.current = {
    'file:new': () => void createNewFile(),
    'file:open-folder': () => void openFolder(),
    'file:save': () => void saveNowRef.current(),
    'view:refresh': () => void refreshFiles(),
    'view:toggle-preview': () => setPreviewVisible((visible) => !visible),
    'export:md': () => void exportDocument('md'),
    'export:html': () => void exportDocument('html'),
    'export:json': () => void exportDocument('json'),
    'export:qmd': () => void exportDocument('qmd'),
    'export:txt': () => void exportDocument('txt'),
  };

  useEffect(() => {
    setAppMenu(APP_MENU);
    return onMenuCommand((id) => {
      menuActionsRef.current[id]?.();
    });
  }, []);

  const statusLabel = () => {
    if (saveStatus === 'saving') return <span className="text-primary">保存中…</span>;
    if (saveStatus === 'conflict') return <span className="text-amber-300">競合を解決してください</span>;
    if (saveStatus === 'error') {
      return (
        <span className="text-red-300" role="alert">
          {saveError}{' '}
          <button type="button" onClick={() => void saveNowRef.current()} className="underline underline-offset-2">
            再試行
          </button>
        </span>
      );
    }
    if (dirty || saveStatus === 'unsaved') return <span className="text-amber-300">未保存</span>;
    return <span className="text-emerald-300">保存済み · {formatLastSaved(lastSaved)}</span>;
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <FileSidebar
        files={files}
        activePath={activePath}
        workspaceRoot={workspaceRoot}
        loading={loading}
        onSelect={(path) => void selectFile(path)}
        onCreate={() => void createNewFile()}
        onRename={(path) => void renameActiveFile(path)}
        onDelete={(path) => void deleteActiveFile(path)}
        onOpenFolder={() => void openFolder()}
        onRefresh={() => void refreshFiles()}
      />

      <div className="min-w-0">
        {loading ? (
          <section className="flex min-h-[420px] items-center justify-center rounded-lg border border-primary/40 bg-black/40 p-6">
            <p className="text-sm text-foreground/60">ワークスペースを読み込んでいます…</p>
          </section>
        ) : !workspaceRoot ? (
          <section className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-primary/40 bg-black/40 p-8 text-center">
            <FolderOpen size={36} className="text-primary/70" />
            <h2 className="mt-4 text-xl font-semibold text-foreground">ワークスペースを開く</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-foreground/60">
              Markdownファイルを保存しているフォルダを選択してください。ファイルはこのMacのローカルに直接保存されます。
            </p>
            {bootError && (
              <p className="mt-3 max-w-lg text-xs leading-5 text-amber-200/80" role="alert">
                {bootError}
              </p>
            )}
            <button
              type="button"
              onClick={() => void openFolder()}
              className="mt-6 inline-flex items-center gap-2 rounded bg-primary px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:brightness-110"
            >
              <FolderOpen size={16} />
              フォルダを選択
            </button>
          </section>
        ) : !activePath ? (
          <section className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-primary/40 bg-black/40 p-8 text-center">
            <FilePlus2 size={36} className="text-primary/70" />
            <h2 className="mt-4 text-xl font-semibold text-foreground">Markdownファイルがありません</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-foreground/60">
              このフォルダ内のMarkdownファイルを開くか、新しいファイルを作成してください。
            </p>
            <button
              type="button"
              onClick={() => void createNewFile()}
              className="mt-6 inline-flex items-center gap-2 rounded bg-primary px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:brightness-110"
            >
              <FilePlus2 size={16} />
              新しいファイル
            </button>
          </section>
        ) : (
          <LexicalComposer key={editorKey} initialConfig={editorConfig}>
            <div className="relative rounded-lg border border-primary/50 bg-black/50 p-3 text-left sm:p-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-primary/20 pb-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground" title={activePath}>
                    {nameFromPath(activePath)}
                  </p>
                  <p className="mt-1 truncate font-mono text-[10px] text-foreground/40" title={workspaceRoot}>
                    {workspaceRoot}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void createNewFile()}
                    className="inline-flex items-center gap-1.5 rounded border border-primary/40 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/15"
                  >
                    <FilePlus2 size={14} />
                    新規
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveNowRef.current()}
                    className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-background transition-colors hover:brightness-110"
                  >
                    <Save size={14} />
                    保存
                  </button>
                </div>
              </div>
              <Toolbar editor={editor} markdown={markdown} documentName={activePath ? nameFromPath(activePath) : null} />
              <div className="relative mt-2 min-h-[300px] text-left">
                <RichTextPlugin
                  contentEditable={<ContentEditable className="editor-input p-4 text-left" style={{ textAlign: 'left' }} role="textbox" ariaLabel="リッチテキストエディタ" ariaMultiline="true" />}
                  placeholder={<div className="editor-placeholder absolute left-4 top-4 pointer-events-none text-foreground/50" style={{ textAlign: 'left' }}>書き始める…</div>}
                  ErrorBoundary={LexicalErrorBoundary}
                />
                <HistoryPlugin />
                <MarkdownShortcutPlugin transformers={TRANSFORMERS_WITH_TABLE} />
                <ListPlugin />
                <CheckListPlugin />
                <LinkPlugin />
                <TablePlugin hasCellMerge hasCellBackgroundColor hasHorizontalScroll />
                <OnChangePlugin onChange={onChange} ignoreSelectionChange />
                <InitialMarkdownPlugin key={editorKey} markdown={markdown} />
                <EditorSetupPlugin onReady={setEditor} />
              </div>
              {previewVisible && <MarkdownPreview markdown={markdown} />}
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-primary/20 pt-3 text-xs text-foreground/60" aria-live="polite">
                <span>{markdown.length.toLocaleString('ja-JP')}文字</span>
                <span>{markdown.split(/\s+/).filter(Boolean).length.toLocaleString('ja-JP')}語</span>
                {statusLabel()}
              </div>
            </div>
          </LexicalComposer>
        )}
      </div>

      {conflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <section className="w-full max-w-lg rounded-xl border border-amber-400/60 bg-background p-6 shadow-[0_0_40px_color-mix(in_srgb,var(--color-primary)_25%,transparent)]" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
            <p className="font-orbitron text-xs tracking-[0.18em] text-amber-300">CONFLICT</p>
            <h2 id="conflict-title" className="mt-3 text-xl font-semibold text-foreground">
              ファイルが外部で変更されました
            </h2>
            <p className="mt-3 text-sm leading-6 text-foreground/70">{conflict.message}</p>
            <p className="mt-2 truncate font-mono text-[11px] text-foreground/40">{conflict.path}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {conflict.kind !== 'deleted' && (
                <button
                  type="button"
                  onClick={() => void reloadFromDisk()}
                  className="rounded border border-primary/40 px-4 py-2 text-sm text-foreground transition-colors hover:bg-primary/10"
                >
                  ディスクから再読み込み
                </button>
              )}
              <button
                type="button"
                onClick={() => void overwriteConflict()}
                className="rounded bg-amber-400 px-4 py-2 text-sm font-semibold text-background transition-colors hover:brightness-110"
              >
                {conflict.kind === 'deleted' ? 'ファイルを再作成' : '上書き保存'}
              </button>
              <button
                type="button"
                onClick={dismissConflict}
                className="rounded border border-primary/25 px-4 py-2 text-sm text-foreground/60 transition-colors hover:bg-primary/10"
              >
                キャンセル
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default Editor;
