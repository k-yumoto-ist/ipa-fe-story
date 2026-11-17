# 恋するIT用語集 — 君に届くまで

基本情報技術者試験に登場するIT用語を、連作恋愛小説を読みながら覚える非公式学習サイトです。

**公開予定URL:** https://k-yumoto-ist.github.io/ipa-fe-story/

## 初回公開の設定

**Settings → Pages → Build and deployment → Source** を **GitHub Actions** に切り替えてください。
続いて **Actions → Validate and publish to GitHub Pages → Run workflow** で main ブランチを実行します。以降、main へのプッシュで自動デプロイされます。

未設定のリポジトリでは、Actionsが最初のPagesサイト作成を実行できない場合があるため、初回のみ所有者の操作が必要です。

## 機能

- 全12章の連作。第1〜6話本文公開、第7〜12話は続刊予定
- 公開済み6話で **69語** の用語解説を収録
- 本文の色付き単語をタップすると意味と物語に結びついた覚え方を表示
- 各話7問の四択クイズ。誤答を「苦手」に登録
- 単語カードで想起練習、ブックマーク、用語検索・カテゴリ絞り込み
- 読書位置・クイズ履歴・復習履歴・テーマ・文字サイズをブラウザに自動保存
- モバイル表示、ダークモード、Service Workerでオフライン閲覧

読書履歴はブラウザの localStorage に保存されます。端末を変えても同期されず、ブラウザデータを消すと失われます。

## ローカルで動かす

ビルド不要の静的サイトです。

~~~sh
python3 -m http.server 8000
~~~

ブラウザから http://localhost:8000/ にアクセスしてください。直接 file:// で開くとService Workerは機能しません。

整合性チェック:

~~~sh
node --check app.js
node --check stories.js
node --check sw.js
node tools/verify.cjs
~~~

## 物語の追加方法

小説と用語集は stories.js の window.FE_STORIES にまとまっています。既存の公開済み章に倣い、各章の story 配列に段落を、terms 配列に対応する単語を追加します。

本文中の【term-id】をタップ可能な用語にするには、terms 配列に id / term / meaning / hook の4項目が必要です。IDは全章を通して重複させないでください。

未公開章の coming: true を外し、story と terms を追加すると読書・検索・クイズに反映されます。新しい章や語を追加した場合は tools/verify.cjs に設定された件数の期待値も更新してください。

## 範囲・注意事項

2026年11月時点の基本情報技術者試験の学習分野を参考にした独自の非公式教材です。IPA公式の監修・提供ではありません。2027年度からの試験制度見直しについては最新情報を確認してください。

- [IPA 基本情報技術者試験](https://www.ipa.go.jp/shiken/kubun/fe.html)
- [IPA 試験要綱・シラバス](https://www.ipa.go.jp/shiken/syllabus/gaiyou.html)
- [IPA 2026年度新シラバス案](https://www.ipa.go.jp/shiken/syllabus/henkou/2026/20260630.html)

単語の記憶に主眼を置いています。科目Bのプログラミング・アルゴリズムや計算問題は別途演習が必要です。

## 構成

- index.html：ページ構造
- styles.css：スマホ対応の小説リーダー用デザイン
- stories.js：物語・用語のデータ
- app.js：学習アプリの画面・状態管理
- favicon.svg：アイコン
- manifest.webmanifest / sw.js：オフライン対応
- tools/verify.cjs：小説と用語の整合性テスト
- .github/workflows/pages.yml：テストとGitHub Pagesへの自動デプロイ

小説本文と用語の記憶に関するシーンは本サイトのためのオリジナルコンテンツです。
