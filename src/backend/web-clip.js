import { fail } from './path-guard.js';

const FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 6 * 1024 * 1024;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) ToolsmithEditor/0.1';

let appRef = null;

export function setApp(app) {
  appRef = app;
}

function normalizeUrl(input) {
  const raw = String(input ?? '').trim();
  if (!raw) fail('INVALID_URL', 'URLを入力してください。');
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    fail('INVALID_URL', 'URLの形式が正しくありません。');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    fail('UNSUPPORTED_URL', 'http:// または https:// のURLのみ取り込めます。');
  }
  return url;
}

function detectCharset(contentType, bytes) {
  const fromHeader = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType ?? '');
  if (fromHeader) return fromHeader[1].toLowerCase();
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 4096));
  const fromMeta = /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(head);
  return fromMeta ? fromMeta[1].toLowerCase() : 'utf-8';
}

function decodeHtml(contentType, bytes) {
  const charset = detectCharset(contentType, bytes);
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

async function fetchWebPage({ url: input }) {
  const url = normalizeUrl(input);
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url.href, {
      redirect: 'follow',
      signal: controller?.signal,
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml;q=0.9,text/plain;q=0.5,*/*;q=0.1',
        'accept-language': 'ja,en-US;q=0.8,en;q=0.7',
      },
    });
    if (!response.ok) {
      fail('HTTP_ERROR', `ページを取得できませんでした（HTTP ${response.status}）。`);
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType && !/text\/html|application\/xhtml\+xml|text\/plain/i.test(contentType)) {
      fail('UNSUPPORTED_CONTENT', `この種類のコンテンツは取り込めません（${contentType}）。`);
    }
    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_HTML_BYTES) {
      fail('TOO_LARGE', 'ページが大きすぎるため取り込めません。');
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_HTML_BYTES) {
      fail('TOO_LARGE', 'ページが大きすぎるため取り込めません。');
    }
    return {
      url: response.url || url.href,
      contentType,
      html: decodeHtml(contentType, new Uint8Array(buffer)),
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      fail('TIMEOUT', 'ページの取得がタイムアウトしました。');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function openExternal({ url: input }) {
  const url = normalizeUrl(input);
  if (!appRef?.shell?.open) fail('NO_SHELL', '外部ブラウザを開けませんでした。');
  await appRef.shell.open(url.href);
  return { url: url.href };
}

export const webClipApi = {
  fetchWebPage,
  openExternal,
};
