Markdown をローカルで書き、プレビューし、書き出すための macOS デスクトップエディタです。

## ダウンロード

- **@@ASSET@@**
- 対応: **macOS 15 以降** / **Apple Silicon・Intel 両対応**（Universal）
- SHA-256: `@@SHA256@@`

## インストール

1. 上の zip をダウンロードして展開します。
2. `Toolsmith Editor Desktop.app` を `Applications` フォルダへ移動します。
3. 初回起動時に警告が出た場合は、アプリを右クリック →「開く」を選択します。
   それでも開けない場合は「システム設定 → プライバシーとセキュリティ」で
   「このまま開く」を選んでください。

> このビルドは Apple Developer ID 署名・公証を行っていないため（ad-hoc 署名）、
> Gatekeeper の警告が表示されます。必要な場合のみ、ターミナルで
> `xattr -dr com.apple.quarantine "/Applications/Toolsmith Editor Desktop.app"`
> を実行してください。

## 主な機能

- ワークスペース内の Markdown 一覧・作成・名前変更・削除
- Lexical によるリッチテキスト編集と Markdown 同期
- 停止後の自動保存、外部変更の競合検知と再読み込み／上書き
- Markdown ソースプレビュー、GFM テーブル
- ABC 記法の楽譜表示・再生・テンポ調整
- Markdown / HTML / JSON / Quarto / Plain Text への書き出し
- Finder からのドラッグ＆ドロップ
- cosmic-ui / neo-brutalism-ui の UI テーマ切替
- ネイティブメニューとキーボードショートカット

## 既知の制限

- macOS のみ（Windows / Linux は未対応）
- 署名・公証なしのため、初回起動に Gatekeeper の回避操作が必要
- 自動アップデートは未実装

## リンク

- [ランディングページ](https://watanabe3tipapa.github.io/toolsmith-editor-desktop/)
- [README](https://github.com/watanabe3tipapa/toolsmith-editor-desktop#readme)
- [開発メモ](https://github.com/watanabe3tipapa/toolsmith-editor-desktop/blob/main/DEV-MEMO.md)
