# TOOLSMITH EDITOR

[![Version](https://img.shields.io/badge/version-0.6.2-14A0E6?style=flat-square)](https://github.com/watanabe3tipapa/toolsmith-editor/releases)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![Lexical](https://img.shields.io/badge/Lexical-0.32-1877F2?style=flat-square)](https://lexical.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

> **TOOLSMITH EDITOR** は、リッチテキストの手軽さとMarkdownの可搬性を一つにまとめた、ローカルファーストの軽量編集環境です。書く、整える、持ち出す。その流れを、端末内でシンプルに保ちます。

| ドキュメント | リンク |
| --- | --- |
| ライブデモ | [toolsmith-editor.vercel.app](https://toolsmith-editor.vercel.app/) |
| エディタ画面 | [toolsmith-editor.vercel.app/editor](https://toolsmith-editor.vercel.app/editor) |
| GitHub | [watanabe3tipapa/toolsmith-editor](https://github.com/watanabe3tipapa/toolsmith-editor) |
| 現行バージョン | **v0.6.2** |

## これは何か

TOOLSMITH EDITOR は、Lexicalをベースにしたブラウザ完結型のMarkdownワークスペースです。文章はリッチテキストで自然に編集でき、同時にMarkdownソースを確認できます。編集した内容はブラウザの端末内ストレージ（IndexedDB）へ保存されるため、アカウント登録やサーバーへの文章送信を必要としません。

## 主な機能

| 機能 | 内容 |
| --- | --- |
| リッチテキスト編集 | 太字、斜体、下線、取り消し線、インラインコード、下付き・上付き文字を利用できます。 |
| 構造化 | H1〜H6、箇条書き、番号付きリスト、チェックリスト、引用、コードブロック、リンク、表組みを扱えます。 |
| Markdownプレビュー | Lexicalの編集内容をMarkdownへ変換し、ソースをリアルタイムで確認できます。 |
| ABC記法（楽譜） | ` ```abc ` / ` ```music-abc ` のコードブロックをabcjsで楽譜描画し、再生・一時停止・停止・テンポ調整ができます。 |
| 複数文書管理 | 文書一覧からの作成・削除・切り替えに対応。タイトルは見出しから自動抽出します。 |
| ローカル保存 | 文章はこのブラウザのIndexedDBへ自動保存されます。 |
| 書き出し | Markdown、HTML、JSON、Quarto、Plain Text形式でダウンロードできます。 |
| キーボード操作 | `Ctrl/Cmd + S` による保存、明確なフォーカス表示、ラベル付きツールバーを提供します。 |
| 安定性 | エラーバウンダリによる保護、URL入力用のアクセシブルなモーダルを備えます。 |

## クイックスタート

Node.js 20以降を用意したうえで、次の手順を実行してください。

```bash
git clone https://github.com/watanabe3tipapa/toolsmith-editor.git
cd toolsmith-editor
npm install
npm run dev
```

開発サーバーが表示したURLをブラウザで開いてください。公開ページを経由する場合は、ライブデモを選択すると `/editor` に移動します。

| コマンド | 用途 |
| --- | --- |
| `npm run dev` | Vite開発サーバーを起動します。 |
| `npm run build` | GitHub Pages向けに `docs/` へビルドします。 |
| `VITE_VERCEL=true npm run build` | Vercel向けに `dist/` へビルドします。 |
| `npm run preview` | 直近のビルドをローカルで確認します。 |
| `npm run lint` | ESLintによる静的検査を実行します。 |

## 使い方

最初にライブデモを開き、案内文を書き換えるか「新しい文書」を選択します。編集内容は自動保存され、画面下のステータスで保存状態と最終保存時刻を確認できます。手動で保存したい場合は、保存ボタンまたは `Ctrl/Cmd + S` を利用してください。

左側のサイドバーから文書の一覧・切り替え・削除ができます。「＋」ボタンで新しい文書を作成します。ツールバーから書式、見出し、リスト、引用、コードブロック、リンク、表を操作できます。右下のダウンロード操作では、原稿をMarkdownやHTMLなどの形式で端末へ書き出せます。

` ```abc ` または ` ```music-abc ` のコードブロックを書くと、下部のプレビューに楽譜が描画されます。再生・一時停止・停止とテンポ（QPM）調整ができ、音声はブラウザのWeb Audio APIで合成されます（abcjsは初回描画時に動的ロード）。

> **保存範囲について**: 文書はブラウザの `IndexedDB` に保存されます。別のブラウザ、別の端末、シークレットウィンドウでは共有されません。ブラウザデータを削除すると保存内容も失われる可能性があるため、重要な文書は定期的にエクスポートしてください。

## アーキテクチャ

```text
src/
├── components/
│   ├── Editor.tsx             # Lexical編集、Markdown同期、IndexedDB保存、文書管理
│   ├── Toolbar.tsx            # ツールバーUIと書式・挿入操作
│   ├── MarkdownPreview.tsx    # Markdownソースプレビュー（ABCブロックの楽譜描画を統合）
│   ├── AbcSheet.tsx           # ABC記法の楽譜描画（abcjs）と再生コントロール
│   ├── DocumentSidebar.tsx    # 文書一覧・切り替えUI
│   ├── LinkEditorModal.tsx    # リンク入力モーダル
│   ├── ErrorBoundary.tsx      # アプリ全体のエラーバウンダリ
│   └── LandingPage.jsx        # 製品紹介ページとライブデモ導線
├── lib/
│   ├── storage.ts             # IndexedDBによる文書CRUD
│   ├── table.ts               # GFMテーブル ↔ Lexical TableNode 変換
│   ├── markdown.ts            # トランスフォーマー統合
│   ├── export.ts              # 書き出しロジック
│   └── constants.ts           # 定数・デフォルト文書
├── cosmic-ui/                 # Sci-FiテーマのUI部品
├── App.jsx                    # 編集画面のレイアウト
├── App.css                    # Lexicalノードの表示スタイル
├── index.css                  # Tailwindテーマ、共通アクセシビリティ設定
└── main.jsx                   # `/` と `/editor` の軽量ルーター
```

アプリはReact、Vite、Lexical、Tailwind CSS v4、cosmic-uiで構成されています。Vercelでは `vercel.json` のSPAリライトにより、`/editor` への直接アクセスとリロードを処理します。GitHub PagesとVercelのビルド出力は、環境変数 `VITE_VERCEL` によって切り替わります。

## データとセキュリティ

TOOLSMITH EDITORは、通常の編集内容を外部サーバーへ送信しません。IndexedDBに保存される文章は、同じブラウザプロファイルからのみ利用できます。リンク挿入、エクスポート、共有は利用者のブラウザ操作として実行されます。

公開サイトでは、OGP・SNS共有のために製品名、説明、共有画像を提供します。原稿の内容が公開メタデータへ送られることはありません。

## 既知の制約と次の改善候補

| 項目 | 現状 | 次の改善候補 |
| --- | --- | --- |
| 文書検索・タグ | 文書は一覧でのみ管理します。 | 検索、タグ、フォルダを追加します。 |
| 保存同期 | 保存先は現在のブラウザだけです。 | 明示的なファイル保存、任意の同期先、履歴管理を検討します。 |
| Markdown変換 | 表組みのGFM対応を実装しています。 | 脚注、独自拡張の対応を検討します。 |
| 配布 | Vercelプロジェクトが未接続の場合、標準サブドメインは公開されません。 | 単一ViteプロジェクトとしてVercelへ接続します。 |

## ライセンス

このリポジトリはMIT Licenseの下で公開されています。詳細はルートの `LICENSE` ファイルを参照してください。
