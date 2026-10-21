import path from 'tjs:path';

const MARKDOWN_RE = /\.(md|markdown)$/i;

export function isMarkdown(name) {
  return MARKDOWN_RE.test(name);
}

export function fail(code, message, extra = {}) {
  throw new Error(JSON.stringify({ code, message, ...extra }));
}

export function normalizeName(name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed || trimmed === '.' || trimmed === '..') {
    fail('INVALID_NAME', 'ファイル名を入力してください。');
  }
  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('\0')) {
    fail('INVALID_NAME', 'ファイル名にパス区切りは使えません。');
  }
  return MARKDOWN_RE.test(trimmed) ? trimmed : `${trimmed}.md`;
}

export function resolveInRoot(root, input, allowMissing = false) {
  if (!root) fail('NO_WORKSPACE', 'ワークスペースが開かれていません。');
  const raw = String(input ?? '');
  if (!raw) fail('INVALID_PATH', 'ファイルパスが空です。');
  const candidate = path.normalize(path.isAbsolute(raw) ? raw : path.join(root, raw));
  if (path.dirname(candidate) !== root) {
    fail('OUTSIDE_WORKSPACE', 'ワークスペース外のファイルは操作できません。');
  }
  if (!isMarkdown(candidate)) {
    fail('UNSUPPORTED_FILE', 'Markdownファイルのみ操作できます。');
  }
  return { candidate, allowMissing };
}

export async function realFileInRoot(root, input) {
  const { candidate } = resolveInRoot(root, input);
  const real = await tjs.realPath(candidate);
  if (path.dirname(real) !== root) {
    fail('OUTSIDE_WORKSPACE', 'ワークスペース外のファイルは操作できません。');
  }
  return real;
}
