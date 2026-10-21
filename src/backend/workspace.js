import path from 'tjs:path';
import { fail, isMarkdown, normalizeName, realFileInRoot, resolveInRoot } from './path-guard.js';

let root = null;
let appRef = null;
let watcher = null;
let watchTimer = null;
const pendingChanges = new Map();

export function setApp(app) {
  appRef = app;
}

function notify(event, payload) {
  try {
    appRef?.push?.(event, payload);
  } catch (error) {
    console.error(`[workspace] failed to push ${event}:`, error);
  }
}

async function fileEntry(absolutePath) {
  const stat = await tjs.stat(absolutePath);
  return {
    path: absolutePath,
    name: path.basename(absolutePath),
    relativePath: path.basename(absolutePath),
    mtimeMs: stat.mtim.getTime(),
    size: stat.size,
  };
}

async function listMarkdownFiles() {
  if (!root) fail('NO_WORKSPACE', 'ワークスペースが開かれていません。');
  const dir = await tjs.readDir(root);
  const files = [];
  try {
    for await (const entry of dir) {
      if (!entry.isFile || !isMarkdown(entry.name)) continue;
      const absolutePath = path.join(root, entry.name);
      files.push(await fileEntry(absolutePath));
    }
  } finally {
    await dir.close();
  }
  files.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  return files;
}

function stopWatcher() {
  if (watchTimer) {
    clearTimeout(watchTimer);
    watchTimer = null;
  }
  pendingChanges.clear();
  if (watcher) {
    try {
      watcher.close();
    } catch (error) {
      console.error('[workspace] failed to close watcher:', error);
    }
    watcher = null;
  }
}

function startWatcher() {
  stopWatcher();
  if (!root) return;
  try {
    watcher = tjs.watch(root, (filename, event) => {
      if (!filename) return;
      const name = path.basename(filename);
      if (!isMarkdown(name)) return;
      pendingChanges.set(name, event);
      if (watchTimer) clearTimeout(watchTimer);
      watchTimer = setTimeout(() => {
        const changes = Array.from(pendingChanges, ([file, kind]) => ({ filename: file, event: kind }));
        pendingChanges.clear();
        watchTimer = null;
        notify('workspace:changed', { changes });
      }, 200);
    });
  } catch (error) {
    console.error('[workspace] failed to start watcher:', error);
  }
}

async function setRoot(nextRoot) {
  const real = await tjs.realPath(nextRoot);
  const stat = await tjs.stat(real);
  if (!stat.isDirectory) fail('NOT_A_DIRECTORY', '選択したパスはフォルダではありません。');
  stopWatcher();
  root = real;
  startWatcher();
  return root;
}

async function openWorkspace({ path: workspacePath }) {
  await setRoot(workspacePath);
  return { root, files: await listMarkdownFiles() };
}

async function openPath({ path: targetPath }) {
  if (!targetPath) fail('INVALID_PATH', 'パスが空です。');
  const real = await tjs.realPath(targetPath);
  const stat = await tjs.stat(real);
  if (stat.isDirectory) {
    const opened = await openWorkspace({ path: real });
    return { ...opened, activePath: null };
  }
  if (stat.isFile) {
    if (!isMarkdown(real)) fail('UNSUPPORTED_FILE', 'Markdownファイルのみ開けます。');
    const opened = await openWorkspace({ path: path.dirname(real) });
    return { ...opened, activePath: real };
  }
  fail('UNSUPPORTED_PATH', 'この種類のパスは開けません。');
}

async function readFile({ path: filePath }) {
  const real = await realFileInRoot(root, filePath);
  const stat = await tjs.stat(real);
  if (!stat.isFile) fail('NOT_A_FILE', 'ファイルではありません。');
  const bytes = await tjs.readFile(real);
  return {
    path: real,
    name: path.basename(real),
    content: new TextDecoder().decode(bytes),
    mtimeMs: stat.mtim.getTime(),
    size: stat.size,
  };
}

async function atomicWrite(target, content) {
  const temp = path.join(root, `.${path.basename(target)}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  try {
    await tjs.writeFile(temp, content);
    await tjs.rename(temp, target);
  } catch (error) {
    try {
      await tjs.remove(temp, { force: true });
    } catch {
      // best-effort cleanup
    }
    throw error;
  }
}

async function writeFile({ path: filePath, content, expectedMtimeMs, force = false }) {
  if (typeof content !== 'string') fail('INVALID_CONTENT', '保存内容が不正です。');
  const { candidate } = resolveInRoot(root, filePath, true);
  let target = candidate;
  let exists = false;
  try {
    target = await tjs.realPath(candidate);
    exists = true;
  } catch {
    exists = false;
  }
  if (exists) {
    const current = await tjs.stat(target);
    if (!current.isFile) fail('NOT_A_FILE', 'ファイルではありません。');
    if (!force && expectedMtimeMs !== undefined && expectedMtimeMs !== null) {
      const currentMtime = current.mtim.getTime();
      if (currentMtime !== expectedMtimeMs) {
        fail('CONFLICT', 'ファイルが外部で変更されています。', { mtimeMs: currentMtime });
      }
    }
  } else if (!force && expectedMtimeMs !== undefined && expectedMtimeMs !== null) {
    fail('CONFLICT', 'ファイルが外部で削除されています。', { mtimeMs: 0, deleted: true });
  }
  await atomicWrite(target, content);
  const saved = await fileEntry(target);
  return { path: target, mtimeMs: saved.mtimeMs, size: saved.size };
}

async function writeExport({ path: destPath, content }) {
  if (typeof content !== 'string') fail('INVALID_CONTENT', '保存内容が不正です。');
  const raw = String(destPath ?? '');
  if (!raw) fail('INVALID_PATH', '保存先が空です。');
  if (!path.isAbsolute(raw)) fail('INVALID_PATH', '保存先は絶対パスで指定してください。');
  const target = path.normalize(raw);
  const dir = path.dirname(target);
  let dirStat;
  try {
    dirStat = await tjs.stat(dir);
  } catch {
    fail('INVALID_PATH', '保存先のフォルダが存在しません。');
  }
  if (!dirStat.isDirectory) fail('INVALID_PATH', '保存先のフォルダが存在しません。');
  try {
    const existing = await tjs.stat(target);
    if (!existing.isFile) fail('NOT_A_FILE', '保存先がファイルではありません。');
  } catch (error) {
    if (error?.message?.includes('NOT_A_FILE')) throw error;
  }
  const temp = path.join(
    dir,
    `.${path.basename(target)}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  try {
    await tjs.writeFile(temp, content);
    await tjs.rename(temp, target);
  } catch (error) {
    try {
      await tjs.remove(temp, { force: true });
    } catch {
      // best-effort cleanup
    }
    throw error;
  }
  const saved = await tjs.stat(target);
  return { path: target, mtimeMs: saved.mtim.getTime(), size: saved.size };
}

async function createFile({ name, content = '' }) {
  if (!root) fail('NO_WORKSPACE', 'ワークスペースが開かれていません。');
  const fileName = normalizeName(name);
  const target = path.join(root, fileName);
  try {
    await tjs.stat(target);
    fail('EXISTS', '同じ名前のファイルが既に存在します。');
  } catch (error) {
    if (error?.message?.includes('EXISTS')) throw error;
  }
  await atomicWrite(target, content);
  const entry = await fileEntry(target);
  return { file: entry, files: await listMarkdownFiles() };
}

async function renameFile({ path: filePath, name }) {
  const source = await realFileInRoot(root, filePath);
  const fileName = normalizeName(name);
  const target = path.join(root, fileName);
  if (target !== source) {
    try {
      await tjs.stat(target);
      fail('EXISTS', '同じ名前のファイルが既に存在します。');
    } catch (error) {
      if (error?.message?.includes('EXISTS')) throw error;
    }
  }
  await tjs.rename(source, target);
  const entry = await fileEntry(target);
  return { file: entry, files: await listMarkdownFiles() };
}

async function deleteFile({ path: filePath }) {
  const real = await realFileInRoot(root, filePath);
  await tjs.remove(real);
  return { files: await listMarkdownFiles() };
}

async function statPath({ path: targetPath }) {
  if (!targetPath) fail('INVALID_PATH', 'パスが空です。');
  const real = await tjs.realPath(targetPath);
  const stat = await tjs.stat(real);
  return {
    path: real,
    name: path.basename(real),
    isFile: stat.isFile,
    isDirectory: stat.isDirectory,
    mtimeMs: stat.mtim.getTime(),
    size: stat.size,
  };
}

async function closeWorkspace() {
  stopWatcher();
  root = null;
  return { ok: true };
}

export const api = {
  ping: () => 'pong',
  openWorkspace,
  openPath,
  listFiles: listMarkdownFiles,
  readFile,
  writeFile,
  writeExport,
  createFile,
  renameFile,
  deleteFile,
  statPath,
  closeWorkspace,
  getWorkspace: () => ({ root, files: [] }),
};
