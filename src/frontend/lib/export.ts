import { hasDesktopBridge, pickSavePath, writeExportFile } from './desktop';

export type ExportFormat = 'md' | 'html' | 'json' | 'qmd' | 'txt';

export type ExportOption = {
  format: ExportFormat;
  label: string;
  ext: string;
  mime: string;
  content: string;
};

export type SaveExportOutcome = 'saved' | 'downloaded' | 'canceled';

export function getFilename(ext: string): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.${ext}`;
}

export function convertToHtml(markdown: string): string {
  const html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/\n/gim, '<br>');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>TOOLSMITH EDITOR Export</title><style>body{font-family:sans-serif;padding:20px;max-width:800px;margin:0 auto;color:#fff;background:#0a1929}h1,h2,h3{color:#14a0e6}code{background:#14a0e622;padding:2px 6px;border-radius:4px}strong{color:#14a0e6}</style></head><body>${html}</body></html>`;
}

export function convertToJson(markdown: string): string {
  const data = {
    content: markdown,
    createdAt: new Date().toISOString(),
    format: 'markdown',
    editor: 'TOOLSMITH EDITOR',
  };
  return JSON.stringify(data, null, 2);
}

export function convertToQmd(markdown: string): string {
  return `---
title: "TOOLSMITH EDITOR Document"
date: ${new Date().toISOString()}
---

${markdown}`;
}

export function downloadFile(content: string, ext: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = getFilename(ext);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function suggestedExportName(baseName: string | null | undefined, ext: string): string {
  const base = String(baseName ?? '')
    .split(/[\\/]/)
    .pop()
    ?.replace(/\.(md|markdown)$/i, '')
    .trim();
  return `${base || 'document'}.${ext}`;
}

export async function saveExport(option: ExportOption, baseName: string | null | undefined): Promise<SaveExportOutcome> {
  if (hasDesktopBridge()) {
    const target = await pickSavePath([option.ext], suggestedExportName(baseName, option.ext));
    if (!target) return 'canceled';
    await writeExportFile(target, option.content);
    return 'saved';
  }
  downloadFile(option.content, option.ext, option.mime);
  return 'downloaded';
}

export const EXPORT_OPTIONS = (markdown: string): ExportOption[] => [
  { format: 'md', label: 'Markdown (.md)', ext: 'md', mime: 'text/markdown', content: markdown },
  { format: 'html', label: 'HTML (.html)', ext: 'html', mime: 'text/html', content: convertToHtml(markdown) },
  { format: 'json', label: 'JSON (.json)', ext: 'json', mime: 'application/json', content: convertToJson(markdown) },
  { format: 'qmd', label: 'Quarto (.qmd)', ext: 'qmd', mime: 'text/markdown', content: convertToQmd(markdown) },
  { format: 'txt', label: 'Plain Text (.txt)', ext: 'txt', mime: 'text/plain', content: markdown },
];