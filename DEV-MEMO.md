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

## 2026-10-28 内蔵Webパネルの検討

- Meta Muse のようなアプリ内蔵ブラウザ／Webクリップの要望を Issue #1 に記録。
  - https://github.com/watanabe3tipapa/toolsmith-editor-desktop/issues/1
- tinyjs は1ウィンドウ1 WebViewで、`win.open` は自前HTMLのみ。
  `<iframe>` もX-Frame-Options / CSPで多くのサイトが拒否するため、
  Muse同等の内蔵ブラウザはブラウザ基盤の追加になる。
- 段階案:
  1. 外部ブラウザ連携＋本文抽出／Markdown取り込み（推奨MVP）
  2. macOSネイティブWebViewの追加（tinyjs拡張）
  3. Chromium + CDPによるエージェントブラウザ
- まずは1の「閲覧＋クリップ」を想定。ログイン・購入・フォーム入力は
  外部ブラウザへ誘導し、認証情報をアプリ内に保持しない。

## 2026-10-30 Webクリップ（MVP）

- Issue #1 の段階案1「外部ブラウザ連携＋本文抽出／Markdown取り込み」を実装。
  - `src/backend/web-clip.js`
    - `fetchWebPage({ url })`: http/https のみ許可。15秒タイムアウト、
      Content-Length / 実バイト数の上限（6MB）、`charset` と `<meta charset>`
      から文字コードを判定してHTMLを返す。
    - `openExternal({ url })`: `app.shell.open` で既定ブラウザへ渡す。
    - URLは `URL` オブジェクトではなく `href` 文字列で `fetch` に渡す
      （txiki.js の fetch は URL オブジェクトを受け付けない）。
  - `src/frontend/lib/web-clip.ts`
    - `@mozilla/readability` で本文抽出、`turndown` + GFM プラグインで
      Markdown化。相対URL解決用に `<base href>` を注入。
    - タイトル・サイト名・著者・公開日・URL・取得日を先頭メタ情報として付与。
    - 本文が取れない場合は `EMPTY_CONTENT` の構造化エラー。
  - `src/frontend/components/WebClipModal.tsx`
    - URL入力、取得、外部ブラウザで開く、抽出結果プレビュー。
    - 「文書に追加」（現在の文書末尾へ `---` 区切りで追記）と
      「新規ファイルに保存」（ワークスペースへ `.md` 作成）。
  - エディタヘッダーの「Webクリップ」ボタンと、ファイルメニューの
    「Webページを取り込む…」から起動。
- 認証情報は保持しない。ログインが必要なページは外部ブラウザへ誘導する。
- アプリ内ブラウザ（ネイティブWebViewの追加）は引き続き未着手。

## 2026-10-30 Quarto CLI 連携

- `src/backend/quarto.js` を追加。
  - `checkQuarto()`: `quarto --version` を実行して導入状況とバージョンを返す。
    `tjs.spawn` は未導入時に同期例外（ENOENT）を投げるため捕捉して
    `available: false` に変換する。
  - `renderQuarto({ markdown, name, format, outputPath })`:
    - `html` / `pdf` に対応。`tjs.makeTempDir` に `document.qmd` を書き、
      `quarto render ... --no-execute` を実行してから、選ばれた保存先へ
      atomic copy（同一ディレクトリの一時ファイル + rename）。
    - HTMLは `--embed-resources` で単体ファイル化。PDFはLaTeX（TinyTeX）が
      必要で、失敗時は導入手順をメッセージに含める。
    - タイムアウト（180秒）、ANSIエスケープ除去、stderrの末尾1,500文字を
      エラー詳細として返す。一時ディレクトリは finally で再帰削除。
  - セキュリティ: 文書内のコードチャンクは `--no-execute` で実行しない。
- `src/frontend/lib/desktop.ts` に `checkQuarto` / `renderQuarto` を追加。
- エクスポートメニューとツールバーに「QuartoでHTML…」「QuartoでPDF…」を追加。
  - 実行前にQuartoの有無を確認し、未導入かつHTML出力の場合は
    既存のHTML単体エクスポートへフォールバックできる。
  - 保存先は OS の保存パネルで選択。拡張子は出力形式に合わせて検証。
- 検証: Quarto 1.9.37 でHTMLレンダリング（表・タイトル・単体ファイル化）を
  確認。PDFはTeX Liveのパッケージ不足で失敗し、エラーメッセージに
  詳細と導入手順が含まれることを確認。

## 2026-10-30 設定ファイル管理

- `src/backend/settings.js` を追加。設定は `(await app.paths()).data` 配下の
  `settings.json` に保存する。
  - 既定値: `theme` / `lastWorkspace` / `previewVisible` /
    `autoSaveDelayMs` / `defaultExportDir`。
  - `getSettings` / `updateSettings` / `resetSettings` / `revealSettings`。
  - 更新値は種類・範囲・絶対パスを検証。既定の書き出し先は実在する
    フォルダのみ許可。書き込みは同一フォルダの一時ファイル + rename。
  - 壊れたJSONは `settings.json.corrupt-<timestamp>` に退避して既定値で再開。
  - 初期化時は最後に開いたワークスペースだけ引き継ぐ（UIから編集できない
    値を暗黙に失わないため）。
- `src/frontend/lib/settings.ts`
  - 初回起動時、旧 localStorage のテーマと tinyjs store の
    last workspace を `settings.json` へ移行。
  - 更新は直列化して read-modify-write の競合を防止。
  - ブラウザプレビュー（ブリッジなし）では localStorage フォールバック。
- `src/frontend/components/SettingsModal.tsx`
  - テーマ、プレビュー表示、自動保存の待ち時間（300〜5000ms）、
    既定の書き出し先、設定ファイルのパス表示 / Finderで表示、初期化。
- 既定の書き出し先が設定されている場合、エクスポートとQuarto出力は
  保存パネルを開かずにそのフォルダへ書き出す。同名ファイルがある場合は
  `suggestExportPath` が ` (2)`, ` (3)` と連番を付ける。
- エクスポート処理を Toolbar から Editor へ集約し、既定フォルダの扱いを
  メニュー / ツールバーで共通化した。
- ヘッダーの「設定」ボタンと、表示メニューの「設定…」から開ける。

## 2026-10-30 v0.1.1

- `package.json` / `package-lock.json` / `tinyjs.json` のバージョンを
  `0.1.1` へ更新。ヘッダー表示と README のバッジも追随。
- codespell でリポジトリ全体のタイポチェックを実施。
  - 検出されたのは ABC 記譜の `afe`（コード進行）と、lockfile 内の
    ハッシュ片（`bu` / `TAHt`）のみで、いずれも誤検出。修正なし。
- v0.1.1 の内容は設定ファイル管理と Webクリップ / Quarto 連携の改善。

## 残課題

- 内蔵Webパネル（Issue #1、MVPの外部ブラウザ連携＋本文取り込みは実装済み）
- メニューの checked 状態とプレビュー表示の同期
- Windows / Linux 向けビルド
- 署名・公証を含む配布パイプライン
- Apple Silicon実機での起動確認
