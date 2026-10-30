import type { AppMenuItem } from './desktop';

export const APP_MENU: AppMenuItem[] = [
  {
    title: 'ファイル',
    items: [
      { id: 'file:new', label: '新規ファイル…', key: 'n' },
      { id: 'file:open-folder', label: 'フォルダを開く…', key: 'shift+o' },
      { separator: true },
      { id: 'web:clip', label: 'Webページを取り込む…' },
      { separator: true },
      { id: 'file:save', label: '保存', key: 's' },
      { separator: true },
      {
        id: 'file:export',
        label: 'エクスポート',
        submenu: [
          { id: 'export:md', label: 'Markdown (.md)' },
          { id: 'export:html', label: 'HTML (.html)' },
          { id: 'export:json', label: 'JSON (.json)' },
          { id: 'export:qmd', label: 'Quarto (.qmd)' },
          { separator: true },
          { id: 'export:quarto-html', label: 'QuartoでHTML…' },
          { id: 'export:quarto-pdf', label: 'QuartoでPDF…' },
          { separator: true },
          { id: 'export:txt', label: 'Plain Text (.txt)' },
        ],
      },
    ],
  },
  { role: 'edit' },
  {
    title: '表示',
    items: [
      { id: 'view:refresh', label: 'ファイル一覧を更新', key: 'shift+r' },
      { id: 'view:toggle-preview', label: 'ソースプレビューの表示を切り替え', key: 'shift+p' },
    ],
  },
];
