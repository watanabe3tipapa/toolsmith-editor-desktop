# DEV MEMO — Toolsmith Editor Desktop

実装の経緯・判断・検証結果を時系列で追記する作業メモ。仕様書ではない。

## 2026-10-21 エクスポートのネイティブ保存対応

### 背景

Web版由来のエクスポートは `<a download>` によるブラウザダウンロードだった。
tinyjs の WebView では保存先をユーザーが選べず、デスクトップアプリとして
不自然なため、ネイティブの保存パネル → バックエンド書き込みへ変更した。

### 変更内容

- `src/backend/workspace.js`
  - `writeExport({ path, content })` を追加。
  - 絶対パスのみ許可し、保存先フォルダと既存ファイル種別を検証。
  - 同一ディレクトリ内の一時ファイルへ書いてから `tjs.rename` する
    atomic write。失敗時は一時ファイルを best-effort で削除。
  - エラーは既存の `fail()` 形式（`INVALID_PATH` / `NOT_A_FILE` /
    `INVALID_CONTENT`）で返す。
- `src/frontend/lib/desktop.ts`
  - `pickSavePath()` / `writeExportFile()` / `setAppMenu()` /
    `onMenuCommand()` を追加。
  - `TinyApi` に `dialog.saveFile` と `menu` を追加。
- `src/frontend/types/tiny.d.ts`
  - 上記に合わせて `saveFile` と `menu` の型を追加。
- `src/frontend/lib/export.ts`
  - `saveExport(option, baseName)` を追加。
  - デスクトップでは保存パネルを開き、選択先へ `writeExport` で保存。
  - 保存パネルをキャンセルした場合は `canceled` を返し、何もしない。
  - ブリッジがない場合（Webプレビュー）は従来のダウンロードにフォールバック。
  - `suggestedExportName()` で元ファイル名から拡張子だけ差し替えた
    初期ファイル名を生成（例: `memo.md` → `memo.html`）。
- `src/frontend/components/Toolbar.tsx`
  - ダウンロードメニューの各項目を `saveExport()` 経由に変更。
  - 失敗時は `alertMessage` でネイティブアラートを表示。
  - `documentName` prop を受け取り、初期ファイル名に使用。

### 挙動

| 項目 | 内容 |
| --- | --- |
| 保存先 | OS標準の保存パネルでユーザーが選択 |
| 初期ファイル名 | 現在のファイル名の拡張子を出力形式に変更 |
| 書き込み | バックエンドが atomic write |
| キャンセル | 何もせず終了 |
| Webプレビュー | 従来どおりブラウザダウンロード |

### 検証

- `tjs run` で `writeExport` を直接実行し、以下を確認。
  - 正常書き込み（内容・サイズ・mtime）
  - 相対パス拒否（`INVALID_PATH`）
  - 存在しない保存先フォルダ拒否（`INVALID_PATH`）

## 2026-10-21 ネイティブメニュー

### 変更内容

- `src/frontend/lib/menu.ts` を新規作成し、メニュー定義 `APP_MENU` を集約。
- `src/frontend/components/Editor.tsx`
  - マウント時に `setAppMenu(APP_MENU)`、`onMenuCommand()` でクリックを受信。
  - `menuActionsRef` に最新のハンドラを保持し、メニューイベントが
    古いクロージャを掴まないようにした。
  - `previewVisible` state を追加し、表示メニューからソースプレビューを
    切り替え可能にした。

### メニュー構成

| メニュー | 項目 | ショートカット |
| --- | --- | --- |
| ファイル | 新規ファイル… | ⌘N |
| ファイル | フォルダを開く… | ⇧⌘O |
| ファイル | 保存 | ⌘S |
| ファイル | エクスポート → Markdown / HTML / JSON / Quarto / Plain Text | — |
| 編集 | OS標準の Undo / Redo / Cut / Copy / Paste / Select All | 標準 |
| 表示 | ファイル一覧を更新 | ⇧⌘R |
| 表示 | ソースプレビューの表示を切り替え | ⇧⌘P |

### 判断メモ

- メニュー登録はバックエンドではなくフロントエンドの `tiny.menu.set` で行った。
  クリック時の処理が React の状態（保存・エクスポート・プレビュー）に
  強く依存するため、ページ側で完結させる方が結合を減らせる。
- エクスポート項目はメニューからもツールバーからも同じ
  `exportDocument()` / `saveExport()` を通す。
- メニューの checked 状態（プレビュー表示中など）はまだ同期していない。

### 検証

- `TINYJS_DEBUG=1 tinyjs dev` のトレースで `menu.set` が受理され、
  各項目・ショートカット・サブメニューがランチャーへ渡ることを確認。

## 2026-10-21 LP / GitHub Pages

### 方針

- LP は `docs/index.html` の静的 HTML として配置し、GitHub Pages で公開する。
- デプロイはブランチ配信ではなく **GitHub Actions** で行う
  （`docs/` をアーティファクトとしてアップロードし `deploy-pages` で公開）。
- ダウンロード導線は GitHub Releases へ送る。初回リリース前は Releases ページに
  何もない状態だが、ビルド公開後にそのまま機能する。
- 公開URLは `https://watanabe3tipapa.github.io/toolsmith-editor-desktop/` を前提。

### 変更内容

- `docs/index.html`
  - デスクトップ版のLP。Hero、特徴6項目、3ステップ、データ方針、CTA、Footer。
  - アプリ画面は実スクリーンショットではなく HTML/CSS のモックで再現。
  - OGP / Twitter Card / canonical / favicon を設定。
  - レスポンシブ、`:focus-visible`、`prefers-reduced-motion` に対応。
- `docs/assets/icon.svg` / `docs/assets/icon.png`
  - アプリアイコンを Pages 配信ルート内へコピー。
- `docs/.nojekyll`
  - Jekyll 処理を無効化。
- `.github/workflows/pages.yml`
  - `main` への `docs/**` 変更、または手動実行でデプロイ。
  - `actions/configure-pages` → `upload-pages-artifact` → `deploy-pages`。
- `.gitignore`
  - tinyjs の一時出力 `.build/` を追加。

### 検証

- `gh` で `watanabe3tipapa/toolsmith-editor-desktop` を public で作成し、
  `main` へ初回push。
- Pages の Source を GitHub Actions に設定（`build_type: workflow`）。
- 「Deploy LP to GitHub Pages」が成功することを確認。
- 公開URLとアセットをHTTP確認（いずれも 200）。
  - LP: https://watanabe3tipapa.github.io/toolsmith-editor-desktop/
  - icon: https://watanabe3tipapa.github.io/toolsmith-editor-desktop/assets/icon.svg
- 初回リリース未作成のため、LP上のダウンロード表現は
  「配布予定」とし、リンク先は Releases ページにした。

## 2026-10-21 README / GitHub About

### README

- 参考リポジトリ `watanabe3tipapa/sarashina-mercury` の構成に合わせて全面改修。
- 見出し・バッジ・クイックリンク・コンセプト・主な特徴・インストールとビルド・
  公開・ディレクトリ構成・使い方・既知の制約とロードマップ・ドキュメント・
  コントリビューション・連絡先・ライセンスの順で統一。
- 対象バージョンは **v0.1.0**、ライセンスは **MIT**。
- Web版の説明（IndexedDB / Vercel / docs へのビルド）を削除し、
  デスクトップ版の実態（ローカルフォルダ、tinyjs、GitHub Pages は LP のみ、
  アプリ配布は GitHub Releases）に合わせた。
- 存在しない `README_en.md` へのリンクは付けていない。

### GitHub About

- description: ローカルファーストの Markdown デスクトップエディタであることを
  日英で要約。
- homepage: LP の公開URL。
- topics: tinyjs / txiki-js / markdown-editor / lexical / react / macos /
  desktop-app / local-first / abc-notation など。

## 2026-10-21 UIテーマ切替（cosmic-ui / neo-brutalism-ui）

### 方針

- 既存の cosmic-ui を維持したまま、neo-brutalism-ui を追加する。
- デザイン参考: https://lexical-on-void.watanabe3ti.workers.dev
  - クリーム色の紙面（`#ece8da`）、白パネル、太い黒罫線、ハードオフセット
    シャドウ、黄色のアクション、モノスペースフォント。
- テーマは `document.documentElement.dataset.theme` で切り替え、
  CSS変数（Tailwind v4 の `--color-*`）を上書きして既存ユーティリティを
  そのまま活かす。
- 選択したテーマは `localStorage`
  （`toolsmith-editor-desktop:ui-theme`）に保存する。

### 変更内容

- `src/frontend/neo-brutalism-ui/index.ts`
  - `UiTheme` 型、テーマ定義 `UI_THEMES`、`isUiTheme()`。
- `src/frontend/neo-brutalism-ui/theme.css`
  - `[data-theme="brutalist"]` のデザイントークンとコンポーネント上書き。
  - ヘッダー（黒帯 + 黄色トグル）、サイドバー、ツールバー、エディタ、
    ソースプレビュー、モーダル、ABCコントロール、ボタン類を再スタイル。
- `src/frontend/lib/theme.ts`
  - 初期テーマ取得、CSS適用、永続化、次テーマ算出。
- `src/frontend/main.jsx`
  - React描画前にテーマを適用し、初回のちらつきを防止。
- `src/frontend/App.jsx`
  - ヘッダーに `Palette` アイコンのテーマ切替ボタンを追加。
  - 現在のテーマ名を表示し、クリックで cosmic ↔ brutalist を切り替え。
  - `app-header` / `app-title` / `app-subtitle` / `app-version` /
    `app-footer` を追加。
- 各コンポーネントにテーマ用フックを追加:
  `file-sidebar` / `file-item` / `editor-shell` / `state-panel` /
  `editor-toolbar` / `toolbar-button` / `toolbar-divider` /
  `source-preview` / `source-preview-header` / `export-menu` /
  `modal-backdrop` / `modal-panel`。

### 検証

- `npm run lint` / `npm run build` 成功。
- ビルド済みフロントエンドを Chrome headless で表示し、
  cosmic / brutalist の両テーマをスクリーンショットで確認。
  - ワークスペース未選択時と、モックブリッジでエディタ表示時
    （ツールバー、ソースプレビュー、ABC）の両方を確認。
- cosmic-ui 側の見た目に回帰がないことを確認。

## 2026-10-21 v0.1.0 配布

- GitHub Releases に `v0.1.0` を作成。
  - https://github.com/watanabe3tipapa/toolsmith-editor-desktop/releases/tag/v0.1.0
- 配布物: `Toolsmith-Editor-Desktop-v0.1.0-macos-universal.zip`（約 6.9 MB）
  - `tinyjs build --universal` で x86_64 + arm64 を同梱
  - SHA-256: `54378c029b149a297d0d4e407d24700bc4aaf8bd76c6b7d14db917f72935aac1`
- 署名は ad-hoc のみ。Developer ID 署名・公証は未実施のため、
  Gatekeeper で初回起動がブロックされる。Release 本文と LP / README に
  「右クリック → 開く」の回避手順を明記した。
- LP の配布導線を `v0.1.0` のタグと Universal 対応表記へ更新。
- 配布物は `ditto` で zip 化し、ダウンロード後に再展開・
  `codesign --verify --deep --strict` と `lipo -archs` を確認済み。

## 2026-10-21 lint / build CI とコードブロック修正

### CI

- `.github/workflows/ci.yml` を追加。
  - `main` への push、Pull Request、手動実行で起動。
  - Node.js 22 + `npm ci` で依存を固定し、`npm run lint` と
    `npm run build` を実行。
  - 同時実行は同じ ref 単位でキャンセル。
- README に CI バッジを追加。

### コードブロックの行装飾

- brutalism で ABC コードブロックの各行に罫線が付いて見える問題を修正。
- 原因: Lexical の `CodeNode` は `<code>` を生成するが、
  `.editor-code` がインライン表示のままで、改行ごとにボーダーが
  描画されていた。太い brutalism の罫線で特に目立っていた。
- `src/frontend/App.css` の `.editor-code` に
  `display: block` / `white-space: pre-wrap` / `overflow-x: auto` /
  `word-break: break-word` を追加。
- cosmic / brutalist の両テーマで、コードブロックが1つの枠に
  収まることをスクリーンショットで確認。

## 2026-10-28 リリース自動化

- `.github/workflows/release.yml` を追加。
  - `v*` タグの push、または既存タグを指定した手動実行で起動。
  - `macos-14` 上で Node.js 22 + tinyjs 0.60.0（`TINYJS_VERSION` で固定）を用意し、
    `tinyjs build --universal` を実行。
  - zip 化、SHA-256 生成、リリースノートのプレースホルダ置換、
    GitHub Release の作成または更新まで自動化。
  - ビルド成果物と `SHA256SUMS.txt` は Actions の artifact にも 14 日間保存。
  - 手動実行の `publish` は既定で無効。有効にした場合のみ Release を更新する。
- `.github/release-notes.md` を追加。バージョン・ファイル名・SHA-256 を
  `sed` で差し込むテンプレートにした。テンプレートを持たない古いタグを
  再ビルドする場合は、main ブランチのテンプレートへフォールバックする。
- タグ名と `tinyjs.json` の `version` が一致しない場合はジョブを失敗させる。
- README にタグ push によるリリース手順を追記。

## 残課題

- Quarto CLI 連携（現在の `.qmd` 出力はフロントエンド生成のみ）
- 設定ファイル管理（テーマ、既定の保存先など）
- メニューの checked 状態とプレビュー表示の同期
- README をWeb版の内容からデスクトップ版へ更新
- `tinyjs build` でのパッケージ確認と配布設定
