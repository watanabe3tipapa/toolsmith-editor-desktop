import path from 'tjs:path';
import { fail } from './path-guard.js';

const RENDER_TIMEOUT_MS = 180_000;
const PROBE_TIMEOUT_MS = 15_000;
const MAX_LOG_LENGTH = 1_500;

const FORMATS = {
  html: { ext: 'html', to: 'html', embedResources: true },
  pdf: { ext: 'pdf', to: 'pdf', embedResources: false },
};

async function runProcess(args, cwd, timeoutMs) {
  let child;
  try {
    child = tjs.spawn(args, { cwd, stdout: 'pipe', stderr: 'pipe' });
  } catch (error) {
    return { spawnError: error, timedOut: false, stdout: '', stderr: '', exitStatus: null };
  }
  const stdoutPromise = child.stdout?.text() ?? Promise.resolve('');
  const stderrPromise = child.stderr?.text() ?? Promise.resolve('');
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    try {
      child.kill();
    } catch {
      // best-effort termination
    }
  }, timeoutMs);
  try {
    const status = await child.wait();
    const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise]);
    return {
      spawnError: null,
      timedOut,
      stdout: stdout ?? '',
      stderr: stderr ?? '',
      exitStatus: status?.exit_status ?? null,
    };
  } finally {
    clearTimeout(timer);
  }
}

function stripAnsi(text) {
  return text.replace(/\p{Cc}\[[0-9;]*m/gu, '').replace(/\r/g, '');
}

async function probeQuarto() {
  const result = await runProcess(['quarto', '--version'], undefined, PROBE_TIMEOUT_MS);
  if (result.spawnError) {
    return { available: false, version: null, reason: 'Quarto CLIが見つかりません。' };
  }
  if (result.timedOut) {
    return { available: false, version: null, reason: 'Quarto CLIの応答がタイムアウトしました。' };
  }
  if (result.exitStatus !== 0) {
    return {
      available: false,
      version: null,
      reason: result.stderr.trim() || 'Quarto CLIを実行できませんでした。',
    };
  }
  return { available: true, version: result.stdout.trim().split('\n')[0] || null, reason: null };
}

async function normalizeOutputPath(input, ext) {
  const raw = String(input ?? '');
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
  const actualExt = path.extname(target).toLowerCase();
  if (actualExt && actualExt !== `.${ext}`) {
    fail('INVALID_PATH', `保存先の拡張子は .${ext} にしてください。`);
  }
  return actualExt ? target : `${target}.${ext}`;
}

function buildQmd(markdown, name, format) {
  const title = String(name || 'document')
    .replace(/\.(md|markdown)$/i, '')
    .trim() || 'document';
  const header = ['---', `title: ${JSON.stringify(title)}`, `date: ${JSON.stringify(new Date().toISOString().slice(0, 10))}`];
  if (format === 'html') {
    header.push('format:', '  html:', '    toc: false');
  }
  header.push('---');
  return `${header.join('\n')}\n\n${markdown.trim()}\n`;
}

async function copyAtomically(source, target) {
  const dir = path.dirname(target);
  const temp = path.join(
    dir,
    `.${path.basename(target)}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  try {
    await tjs.copyFile(source, temp);
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

async function renderQuarto({ markdown, name, format, outputPath }) {
  if (typeof markdown !== 'string') fail('INVALID_CONTENT', 'レンダリングする内容が不正です。');
  const spec = FORMATS[format];
  if (!spec) fail('UNSUPPORTED_FORMAT', '対応していないQuarto出力形式です。');
  const target = await normalizeOutputPath(outputPath, spec.ext);

  const status = await probeQuarto();
  if (!status.available) fail('QUARTO_NOT_FOUND', status.reason ?? 'Quarto CLIが見つかりません。');

  const workDir = await tjs.makeTempDir(`${tjs.tmpDir}/toolsmith-quarto-XXXXXX`);
  try {
    const qmdPath = path.join(workDir, 'document.qmd');
    await tjs.writeFile(qmdPath, buildQmd(markdown, name, format));
    const args = [
      'quarto',
      'render',
      'document.qmd',
      '--to',
      spec.to,
      '--output-dir',
      'out',
      '--no-execute',
    ];
    if (spec.embedResources) args.push('--embed-resources');
    const result = await runProcess(args, workDir, RENDER_TIMEOUT_MS);
    if (result.spawnError) fail('QUARTO_NOT_FOUND', 'Quarto CLIが見つかりません。');
    if (result.timedOut) {
      fail('QUARTO_TIMEOUT', 'Quartoのレンダリングがタイムアウトしました。');
    }
    if (result.exitStatus !== 0) {
      const detail = stripAnsi(result.stderr || result.stdout).trim().slice(-MAX_LOG_LENGTH);
      const hint =
        format === 'pdf'
          ? 'PDF出力にはLaTeX（TinyTeX）と必要なパッケージが必要です。`quarto install tinytex` またはTeX Liveのパッケージを確認してください。'
          : 'Quartoのレンダリングに失敗しました。';
      fail('QUARTO_FAILED', detail ? `${hint}\n\n${detail}` : hint);
    }
    const rendered = path.join(workDir, 'out', `document.${spec.ext}`);
    try {
      await tjs.stat(rendered);
    } catch {
      fail('QUARTO_NO_OUTPUT', 'Quartoの出力ファイルが見つかりませんでした。');
    }
    await copyAtomically(rendered, target);
    const saved = await tjs.stat(target);
    return { path: target, size: saved.size, format, mtimeMs: saved.mtim.getTime() };
  } finally {
    try {
      await tjs.remove(workDir, { recursive: true, force: true });
    } catch (error) {
      console.error('[quarto] failed to clean temp dir:', error);
    }
  }
}

export const quartoApi = {
  checkQuarto: probeQuarto,
  renderQuarto,
};
