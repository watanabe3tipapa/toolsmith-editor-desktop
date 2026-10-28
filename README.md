# toolsmith-editor-desktop

**Markdown を、あなたのフォルダのまま。ローカルファイルに直接書く、macOS 向けデスクトップエディタ。**

toolsmith-editor-desktop は、tinyjs（txiki.js + ネイティブ WebView）で構築したローカルファーストの Markdown ワークスペースです。ワークスペースのフォルダを開き、配下の `.md` / `.markdown` をそのまま編集できます。リッチテキストの書き心地と Markdown の可搬性を両立し、変更は端末内のファイルへ自動保存されます。

> **書く、整える、持ち出す。その流れを、端末内で完結させる。** クラウドへのアカウント登録も、原稿の送信も不要です。ファイルは選んだフォルダに残り、他のエディタや Git とそのまま併用できます。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.1.0-blue.svg)](https://github.com/watanabe3tipapa/toolsmith-editor-desktop/releases)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-blue.svg)](https://watanabe3tipapa.github.io/toolsmith-editor-desktop/)
[![Lint and build](https://github.com/watanabe3tipapa/toolsmith-editor-desktop/actions/workflows/ci.yml/badge.svg)](https://github.com/watanabe3tipapa/toolsmith-editor-desktop/actions/workflows/ci.yml)
[![GitHub](https://img.shields.io/github/issues/watanabe3tipapa/toolsmith-editor-desktop.svg)](https://github.com/watanabe3tipapa/toolsmith-editor-desktop/issues)

**クイックリンク:** [公開サイト](https://watanabe3tipapa.github.io/toolsmith-editor-desktop/) · [Releases](https://github.com/watanabe3tipapa/toolsmith-editor-desktop/releases) · [実装プラン](./docs/toolsmith_editor_desktop_plan.html) · [開発メモ](./DEV-MEMO.md) · [Issues](https://github.com/watanabe3tipapa/toolsmith-editor-desktop/issues)

## ダウンロード

[Toolsmith Editor Desktop v0.1.0](https://github.com/watanabe3tipapa/toolsmith-editor-desktop/releases/tag/v0.1.0) を公開しています。macOS 15 以降の Apple Silicon / Intel に対応した Universal ビルドです。

> 本ビルドは Apple Developer ID 署名・公証を行っていません（ad-hoc 署名）。初回起動時に警告が出た場合は、アプリを右クリック →「開く」を選択してください。

## コンセプト

### なぜ「Desktop」なのか

ブラウザ完結の Web 版は手軽ですが、原稿の保存先はブラウザのストレージに閉じます。Desktop 版はその制約を外し、**ユーザーが選んだフォルダを唯一の保存先**にしました。エディタを閉じてもファイルはそこに残り、Finder、他のエディタ、Git、Quarto など、既存のワークフローからそのまま扱えます。

| 体験 | toolsmith-editor-desktop の対応物 |
|---|---|
| 書く | Lexical ベースのリッチテキスト編集（見出し・リスト・引用・表・リンク・コード） |
| 確かめる | Markdown ソースのリアルタイムプレビュー（GFM テーブル対応） |
| 残す | ワークスペースのファイルへ直接自動保存 |
| 守る | 外部変更・削除を監視し、競合時は再読み込み / 上書きを選択 |
| 鳴らす | ` ```abc ` / ` ```music-abc ` ブロックを楽譜描画・再生 |
| 持ち出す | Markdown / HTML / JSON / Quarto / Plain Text へネイティブ保存 |

### 設計方針

1. **ファイルが主役** — アプリ独自のデータベースを正とせず、ローカルの Markdown を直接読み書きする
2. **保存を見える化** — 保存中・保存済み・未保存・競合をステータスバーに常時表示する
3. **ネイティブな操作感** — 保存パネル、アラート、メニュー、ショートカットは OS の作法に合わせる
4. **壊さない** — 一時ファイル + rename の atomic write と、外部変更の競合検知で原稿を守る

## 主な特徴

### 機能

- **ワークスペース** — フォルダを選択すると配下の Markdown を一覧表示。作成・名前変更・削除・再読み込みに対応
- **リッチテキスト編集** — 太字、斜体、下線、取り消し線、インラインコード、下付き・上付き、H1〜H6、各種リスト、チェックリスト、引用、コードブロック、リンク、表
- **Markdown 同期** — 編集内容を Markdown へ変換してソースプレビューに反映。Markdown ショートカット入力にも対応
- **自動保存と競合解決** — 編集停止後にファイルへ保存。外部で変更・削除された場合はダイアログで「再読み込み」「上書き」「キャンセル」を選択
- **ABC 記法** — 楽譜ブロックを abcjs で描画し、再生・一時停止・停止・テンポ（QPM）調整が可能
- **ネイティブメニュー** — ファイル / 編集 / 表示メニューと、新規（⌘N）・フォルダを開く（⇧⌘O）・保存（⌘S）・プレビュー切替（⇧⌘P）などのショートカット
- **UIテーマ切替** — ヘッダーのボタンで cosmic-ui（Sci-Fi）と neo-brutalism-ui（太い罫線・ハードシャドウ）を切り替え。選択はローカルに保存
- **書き出し** — OS の保存パネルから Markdown / HTML / JSON / Quarto / Plain Text を任意の場所へ保存
- **ドラッグ＆ドロップ** — Finder から Markdown をドロップして即時オープン

### アーキテクチャ

- **フロントエンド**: Vite + React 18 + Lexical 0.32
- **スタイリング**: Tailwind CSS v4 + cosmic-ui / neo-brutalism-ui（切り替え可能な2テーマ）
- **デスクトップ基盤**: tinyjs 0.60+（txiki.js バックエンド + ネイティブ WebView）
- **バックエンド**: ファイル I/O、ワークスペース監視、パス検証、atomic write
- **ブリッジ**: `window.tiny` を薄くラップした `src/frontend/lib/desktop.ts`

### データとセキュリティ

- 原稿は選択したフォルダのファイルとして保存され、外部サーバーへ送信されません
- アカウント登録、テレメトリ、クラウド同期はありません
- 最後に開いたワークスペースのパスのみ、tinyjs のローカルストアに保存します
- ワークスペース内の読み書きはバックエンドのパスガードで検証し、エクスポート先は OS の保存パネルで選ばれたパスのみに書き込みます

## インストールとビルド

### 前提条件

| ツール | 必要バージョン | 確認コマンド |
|---|---:|---|
| macOS | 15 以降 | `sw_vers` |
| Node.js | >= 20 | `node --version` |
| tinyjs | >= 0.60 | `tinyjs --version` |

tinyjs は [公式サイト](https://tinyjs.app/) の手順でインストールしてください。

### 基本的な手順

1. リポジトリを取得

```bash
git clone https://github.com/watanabe3tipapa/toolsmith-editor-desktop.git
cd toolsmith-editor-desktop
```

2. 依存をインストール

```bash
npm install
```

3. ネイティブウィンドウで起動

```bash
tinyjs dev
```

フロントエンドは Vite（`http://127.0.0.1:5173`）で起動し、tinyjs がネイティブウィンドウで読み込みます。初回はワークスペースのフォルダを選択してください。

4. アプリをビルド

```bash
tinyjs build
```

`dist/` に `.app` が生成されます。フロントエンドのみのビルドは `npm run build` です。

### 主要コマンド

| コマンド | 用途 |
|---|---|
| `tinyjs dev` | ネイティブウィンドウで開発起動（HMR） |
| `npm run dev` | Vite 開発サーバーのみ起動 |
| `npm run build` | フロントエンドを `dist/` へビルド |
| `npm run preview` | ビルド済みフロントエンドをプレビュー |
| `npm run lint` | ESLint による静的解析 |
| `tinyjs build` | macOS アプリ（`.app`）をビルド |

### リリース

`tinyjs.json` の `version` を更新してコミットし、同じ番号のタグを push すると、[Release workflow](./.github/workflows/release.yml) が Universal ビルド、zip 作成、SHA-256 生成、GitHub Release 作成まで実行します。

```bash
git tag v0.1.1
git push origin v0.1.1
```

タグと `tinyjs.json` の version が一致しない場合は失敗します。Actions から手動実行する場合は既存のタグを指定してください。`publish` を有効にしない限り、ビルドと artifact 保存のみで Release は更新されません。

## 公開

LP は `main` ブランチへの push を契機に [GitHub Actions](./.github/workflows/pages.yml) がデプロイし、GitHub Pages で公開します。

| パス | 内容 |
|---|---|
| `/` | ランディングページ（`docs/`） |
| `/toolsmith_editor_desktop_plan.html` | tinyjs 版の実装プラン |
| `assets/` | LP 用のアイコン |

アプリ本体は Web 配信せず、macOS 向けビルドを GitHub Releases で配布する想定です（v0.1.0 時点ではビルド手順のみ）。

## ディレクトリ構成

```text
src/
├── backend/                        # txiki.js バックエンド
│   ├── main.js                     # エントリポイント / ファイルオープン通知
│   ├── workspace.js                # ワークスペース・ファイル I/O・監視
│   └── path-guard.js               # パス検証・エラー整形
└── frontend/                       # WebView フロントエンド
    ├── App.jsx                     # レイアウト
    ├── main.jsx                    # エントリポイント
    ├── components/
    │   ├── Editor.tsx              # Lexical 編集・自動保存・競合解決
    │   ├── Toolbar.tsx             # 書式・挿入・エクスポート
    │   ├── FileSidebar.tsx         # ワークスペースのファイル一覧
    │   ├── MarkdownPreview.tsx     # Markdown ソース表示
    │   ├── AbcSheet.tsx            # ABC 記法の描画・再生
    │   ├── LinkEditorModal.tsx     # リンク入力
    │   └── ErrorBoundary.tsx       # 例外フォールバック
    ├── lib/
    │   ├── desktop.ts              # tinyjs ブリッジ
    │   ├── export.ts               # エクスポート生成・ネイティブ保存
    │   ├── menu.ts                 # ネイティブメニュー定義
    │   ├── theme.ts                # UIテーマの適用・永続化
    │   ├── markdown.ts             # Lexical トランスフォーマー
    │   ├── table.ts                # GFM テーブル変換
    │   └── constants.ts            # 既定文書など
    ├── cosmic-ui/                  # Sci-Fi テーマの UI 部品
    └── neo-brutalism-ui/           # neo-brutalismテーマ（CSS + メタデータ）

docs/                               # GitHub Pages（LP）
.github/workflows/pages.yml         # Pages デプロイ
DEV-MEMO.md                         # 実装メモ
tinyjs.json                         # tinyjs アプリ設定
```

## 使い方

1. 起動後、「フォルダを選択」から原稿のあるフォルダを開きます
2. サイドバーから Markdown を選択、または「＋」で新規作成します
3. ツールバーで書式を整え、必要ならソースプレビューを確認します
4. 編集内容は自動保存されます。手動保存は ⌘S、または保存ボタンから
5. 書き出したいときはツールバーのエクスポート、または「ファイル → エクスポート」から形式を選択します

## 既知の制約とロードマップ

### v0.1.0

- [x] tinyjs プロジェクト初期化、ネイティブウィンドウ表示
- [x] Lexical によるリッチテキスト編集と Markdown 同期
- [x] ワークスペースのファイル一覧・作成・名前変更・削除
- [x] 自動保存、atomic write、外部変更の監視と競合解決
- [x] ドラッグ＆ドロップでのファイルオープン
- [x] ABC 記法の楽譜描画・再生
- [x] ネイティブ保存パネル経由のエクスポート
- [x] ネイティブメニューとキーボードショートカット
- [x] cosmic-ui / neo-brutalism-ui のUIテーマ切替
- [x] lint / build の GitHub Actions CI
- [x] タグ起点のリリース自動化（Universal ビルド / SHA-256 / GitHub Release）
- [x] GitHub Pages のランディングページ

### 次の候補

- [ ] 内蔵Webパネル / Webクリップ（[#1](https://github.com/watanabe3tipapa/toolsmith-editor-desktop/issues/1)）
- [ ] Quarto CLI 連携（`.qmd` のコンパイル）
- [ ] 設定ファイル管理（テーマ、既定の保存先）
- [ ] メニューの checked 状態とプレビュー表示の同期
- [ ] Windows / Linux 向けビルド
- [ ] 署名・公証を含む配布パイプライン

### 制約

- 現在の対象は macOS 15 以降です
- ワークスペース直下の Markdown のみを一覧表示します（サブフォルダは未対応）
- アプリ本体の Web 配信は行いません

## ドキュメント

1. [公開サイト](https://watanabe3tipapa.github.io/toolsmith-editor-desktop/) — ランディングページ
2. [実装プラン](./docs/toolsmith_editor_desktop_plan.html) — tinyjs 版の設計方針
3. [DEV-MEMO.md](./DEV-MEMO.md) — 実装の経緯・判断・検証記録

## コントリビューション

コントリビューションは歓迎します。大きな変更を行う前に [Issue](https://github.com/watanabe3tipapa/toolsmith-editor-desktop/issues) を立てて相談してください。一般的な手順:

1. リポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/your-feature`)
3. 変更をコミット (`git commit -m 'Add your feature'`)
4. ブランチをプッシュし、Pull Request を作成

## 連絡先

- GitHub: https://github.com/watanabe3tipapa/toolsmith-editor-desktop
- 公開サイト: https://watanabe3tipapa.github.io/toolsmith-editor-desktop/

## ライセンス

MIT ライセンス — 詳細はリポジトリの [LICENSE](LICENSE) ファイルを参照してください。

TOOLSMITH EDITOR は個人プロジェクトです。tinyjs、txiki.js、Lexical、abcjs、cosmic-ui はそれぞれのライセンスに従います。
