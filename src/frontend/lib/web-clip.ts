import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { fetchWebPage } from './desktop';

export type WebClip = {
  url: string;
  title: string;
  byline: string | null;
  siteName: string | null;
  excerpt: string | null;
  publishedTime: string | null;
  markdown: string;
  contentMarkdown: string;
  charCount: number;
};

function createTurndown(): TurndownService {
  const service = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',
  });
  service.use(gfm);
  service.remove([
    'script',
    'style',
    'noscript',
    'template',
    'iframe',
    'form',
    'button',
    'input',
    'textarea',
    'select',
    'svg',
    'canvas',
    'video',
    'audio',
  ]);
  return service;
}

function tidyMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function fallbackFromDocument(doc: Document): string {
  if (!doc.body) return '';
  return tidyMarkdown(createTurndown().turndown(doc.body));
}

function withBaseUrl(doc: Document, pageUrl: string): Document {
  doc.querySelectorAll('base').forEach((node) => node.remove());
  const base = doc.createElement('base');
  base.setAttribute('href', pageUrl);
  doc.head?.prepend(base);
  return doc;
}

export function formatClipDate(date = new Date()): string {
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function composeClipMarkdown(input: {
  title: string;
  url: string;
  siteName?: string | null;
  byline?: string | null;
  publishedTime?: string | null;
  content: string;
  capturedAt?: Date;
}): string {
  const meta = [
    input.siteName ? `**サイト:** ${input.siteName}` : null,
    input.byline ? `**著者:** ${input.byline}` : null,
    input.publishedTime ? `**公開日:** ${input.publishedTime}` : null,
    `**URL:** ${input.url}`,
    `**取得日:** ${formatClipDate(input.capturedAt)}`,
  ].filter(Boolean);
  return tidyMarkdown([`# ${input.title}`, meta.join('  \n'), input.content].join('\n\n'));
}

export function extractWebClip(html: string, pageUrl: string, capturedAt = new Date()): WebClip {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const doc = withBaseUrl(parsed, pageUrl);
  const reader = new Readability(doc.cloneNode(true) as Document, {
    charThreshold: 140,
  });
  const article = reader.parse();
  const turndown = createTurndown();

  const contentMarkdown = tidyMarkdown(
    article?.content ? turndown.turndown(article.content) : fallbackFromDocument(doc),
  );
  if (!contentMarkdown) {
    throw new Error(
      JSON.stringify({ code: 'EMPTY_CONTENT', message: '本文を抽出できませんでした。別のURLを試してください。' }),
    );
  }

  const hostname = (() => {
    try {
      return new URL(pageUrl).hostname;
    } catch {
      return '';
    }
  })();
  const title = (article?.title || doc.title || hostname || 'Web clip').replace(/\s+/g, ' ').trim();
  const siteName = (article?.siteName || hostname || '').replace(/\s+/g, ' ').trim() || null;
  const byline = article?.byline?.replace(/\s+/g, ' ').trim() || null;
  const publishedTime = article?.publishedTime?.trim() || null;
  const markdown = composeClipMarkdown({
    title,
    url: pageUrl,
    siteName,
    byline,
    publishedTime,
    content: contentMarkdown,
    capturedAt,
  });

  return {
    url: pageUrl,
    title,
    byline,
    siteName,
    excerpt: article?.excerpt?.trim() || null,
    publishedTime,
    markdown,
    contentMarkdown,
    charCount: contentMarkdown.length,
  };
}

export async function clipWebPage(url: string): Promise<WebClip> {
  const page = await fetchWebPage(url);
  return extractWebClip(page.html, page.url);
}

export function suggestedClipName(title: string, url: string): string {
  const cleaned = String(title || '')
    .replace(/[\\/:*?"<>|\p{Cc}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
  if (cleaned) return `${cleaned}.md`;
  try {
    return `${new URL(url).hostname}.md`;
  } catch {
    return 'web-clip.md';
  }
}
