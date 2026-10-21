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

## 残課題

- Quarto CLI 連携（現在の `.qmd` 出力はフロントエンド生成のみ）
- 設定ファイル管理（テーマ、既定の保存先など）
- メニューの checked 状態とプレビュー表示の同期
- README をWeb版の内容からデスクトップ版へ更新
- `tinyjs build` でのパッケージ確認と配布設定
