export type WorkspaceFile = {
  path: string;
  name: string;
  relativePath: string;
  mtimeMs: number;
  size: number;
};

export type OpenWorkspaceResult = {
  root: string;
  files: WorkspaceFile[];
  activePath?: string | null;
};

export type ReadFileResult = {
  path: string;
  name: string;
  content: string;
  mtimeMs: number;
  size: number;
};

export type SaveFileResult = {
  path: string;
  mtimeMs: number;
  size: number;
};

export type SaveExportResult = {
  path: string;
  mtimeMs: number;
  size: number;
};

export type WorkspaceChange = {
  filename: string;
  event: 'change' | 'rename';
};

export type AppMenuItem = {
  id?: string;
  label?: string;
  title?: string;
  key?: string;
  role?: string;
  checked?: boolean;
  enabled?: boolean;
  separator?: boolean;
  standard?: boolean;
  items?: AppMenuItem[];
  submenu?: AppMenuItem[];
};

export type BridgeError = {
  code: string;
  message: string;
  mtimeMs?: number;
  deleted?: boolean;
};

type TinyApi = {
  api: {
    call<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
    on(event: string, handler: (payload: unknown) => void): () => void;
  };
  dialog: {
    pickFolder(): Promise<string | null>;
    saveFile(options?: { types?: string[]; name?: string }): Promise<string | null>;
    prompt(message: string, options?: { default?: string; ok?: string; cancel?: string }): Promise<string | null>;
    confirm(message: string, options?: { detail?: string; ok?: string; cancel?: string }): Promise<boolean>;
    alert(message: string, options?: { detail?: string; ok?: string }): Promise<void>;
  };
  menu: {
    set(items: AppMenuItem[]): void;
    on(handler: (id: string) => void): () => void;
  };
  store: {
    get<T = unknown>(key: string): Promise<T | null>;
    set(key: string, value: unknown): Promise<boolean>;
  };
  win: {
    setTitle(title: string): void;
    onDrop(handler: (paths: string[]) => void): () => void;
  };
};

declare global {
  interface Window {
    tiny?: TinyApi;
  }
}

const LAST_WORKSPACE_KEY = 'toolsmith-editor-desktop:last-workspace';

export function hasDesktopBridge(): boolean {
  return Boolean(window.tiny?.api?.call);
}

function bridge(): TinyApi {
  if (!window.tiny) {
    throw new Error(JSON.stringify({ code: 'NO_BRIDGE', message: 'デスクトップ環境で起動してください。' }));
  }
  return window.tiny;
}

async function call<T>(name: string, params?: Record<string, unknown>): Promise<T> {
  return bridge().api.call<T>(name, params);
}

export function parseBridgeError(error: unknown): BridgeError {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as BridgeError;
      if (parsed && typeof parsed.code === 'string') return parsed;
    } catch {
      // not a structured bridge error
    }
    return { code: 'UNKNOWN', message: error.message };
  }
  return { code: 'UNKNOWN', message: String(error) };
}

export async function getLastWorkspace(): Promise<string | null> {
  if (!hasDesktopBridge()) return null;
  return bridge().store.get<string>(LAST_WORKSPACE_KEY);
}

export async function rememberWorkspace(path: string): Promise<void> {
  if (!hasDesktopBridge()) return;
  await bridge().store.set(LAST_WORKSPACE_KEY, path);
}

export async function pickWorkspaceFolder(): Promise<string | null> {
  if (!hasDesktopBridge()) return null;
  return bridge().dialog.pickFolder();
}

export async function promptText(message: string, defaultValue = ''): Promise<string | null> {
  if (!hasDesktopBridge()) return window.prompt(message, defaultValue);
  return bridge().dialog.prompt(message, { default: defaultValue, ok: 'OK', cancel: 'キャンセル' });
}

export async function confirmAction(message: string, detail?: string): Promise<boolean> {
  if (!hasDesktopBridge()) return window.confirm(detail ? `${message}\n\n${detail}` : message);
  return bridge().dialog.confirm(message, { detail, ok: '続ける', cancel: 'キャンセル' });
}

export async function alertMessage(message: string, detail?: string): Promise<void> {
  if (!hasDesktopBridge()) {
    window.alert(detail ? `${message}\n\n${detail}` : message);
    return;
  }
  await bridge().dialog.alert(message, { detail, ok: 'OK' });
}

export async function pickSavePath(types: string[], name: string): Promise<string | null> {
  if (!hasDesktopBridge()) return null;
  return bridge().dialog.saveFile({ types, name });
}

export function setAppMenu(items: AppMenuItem[]): void {
  if (!hasDesktopBridge()) return;
  bridge().menu.set(items);
}

export function onMenuCommand(handler: (id: string) => void): () => void {
  if (!hasDesktopBridge()) return () => {};
  return bridge().menu.on(handler);
}

export function setWindowTitle(fileName: string | null, dirty: boolean): void {
  if (!hasDesktopBridge()) return;
  const prefix = dirty ? '● ' : '';
  bridge().win.setTitle(fileName ? `${prefix}${fileName} — Toolsmith Editor Desktop` : 'Toolsmith Editor Desktop');
}

export function onFileDrop(handler: (paths: string[]) => void): () => void {
  if (!hasDesktopBridge()) return () => {};
  return bridge().win.onDrop(handler);
}

export function onWorkspaceChanged(handler: (changes: WorkspaceChange[]) => void): () => void {
  if (!hasDesktopBridge()) return () => {};
  return bridge().api.on('workspace:changed', (payload) => {
    const changes = (payload as { changes?: WorkspaceChange[] })?.changes;
    if (Array.isArray(changes)) handler(changes);
  });
}

export function onOpenPaths(handler: (paths: string[]) => void): () => void {
  if (!hasDesktopBridge()) return () => {};
  return bridge().api.on('workspace:open-paths', (payload) => {
    const paths = (payload as { paths?: string[] })?.paths;
    if (Array.isArray(paths) && paths.length > 0) handler(paths);
  });
}

export async function openWorkspace(path: string): Promise<OpenWorkspaceResult> {
  return call<OpenWorkspaceResult>('openWorkspace', { path });
}

export async function openPath(path: string): Promise<OpenWorkspaceResult> {
  return call<OpenWorkspaceResult>('openPath', { path });
}

export async function listFiles(): Promise<WorkspaceFile[]> {
  return call<WorkspaceFile[]>('listFiles');
}

export async function readFile(path: string): Promise<ReadFileResult> {
  return call<ReadFileResult>('readFile', { path });
}

export async function writeFile(path: string, content: string, expectedMtimeMs?: number, force = false): Promise<SaveFileResult> {
  return call<SaveFileResult>('writeFile', { path, content, expectedMtimeMs, force });
}

export async function writeExportFile(path: string, content: string): Promise<SaveExportResult> {
  return call<SaveExportResult>('writeExport', { path, content });
}

export async function createFile(name: string, content = ''): Promise<{ file: WorkspaceFile; files: WorkspaceFile[] }> {
  return call('createFile', { name, content });
}

export async function renameFile(path: string, name: string): Promise<{ file: WorkspaceFile; files: WorkspaceFile[] }> {
  return call('renameFile', { path, name });
}

export async function deleteFile(path: string): Promise<{ files: WorkspaceFile[] }> {
  return call('deleteFile', { path });
}
