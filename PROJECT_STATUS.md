# プロジェクト進捗メモ（再開用）

このファイルは作業の再開ポイントを記録するものです。
次にKiroと作業するとき、チャットで「#PROJECT_STATUS.md を読んで続きから」と伝えれば、ここから再開できます。

最終更新: 2026-09-12

## プロジェクト概要

- 目的: アフィリエイトで稼ぐための技術ブログ運営
- テーマ: AI開発ツール Kiro と AWS で「作りながら学ぶ」ことを発信
- 公開URL: https://butio89.github.io/kiro-aws-lab/
- GitHubリポジトリ: butio89/kiro-aws-lab（独立リポジトリ、リモート名は `blog`）

## 完了したこと

- [x] ジャンル決定（Kiro × AWS の技術ブログ）
- [x] 静的サイトのひな形（依存ゼロ。content/posts の Markdown → docs/ に HTML 生成）
- [x] AI記事作成ワークフロー（.kiro/steering に方針・ルール・手順、templates に雛形）
- [x] 保存時に自動ビルドする hook（.kiro/hooks/build-on-post-save.json）
- [x] 記事1本目「Kiroで『AIに記事を手伝わせる技術ブログ』をゼロから作ってみた」公開
- [x] GitHub Pages で公開（docs/ を公開ルートに設定）
- [x] A8.net 登録・提携、1本目の PR 枠に広告リンク設置（Udemy案件）
- [x] Google Analytics 4 導入（測定ID: G-M9VW0HZ77K、全ページにタグ）
- [x] sitemap.xml / robots.txt の自動生成（ビルド時に更新）

## 保留中（次にやること）

- [ ] Google Search Console の所有権確認
      - URLプレフィックスで https://butio89.github.io/kiro-aws-lab/ を登録
      - 確認方法は「Googleアナリティクス」を選ぶ（GA4と同じGoogleアカウントで）
      - 「取得できませんでした」エラーで一旦保留。時間をおいて再試行する
      - 通らない場合は「HTMLファイル方式」に切替（google〜.html を docs/ に置く。Kiroが代行可能）
      - 確認後、サイトマップ `sitemap.xml` を送信する

## この先の候補（運用フェーズ）

- [ ] 2本目以降の記事を書く（アフィリエイトは記事数と継続が命）
- [ ] X で公開URLを発信して読者を呼ぶ
- [ ] レベル2: AWS へのデプロイやAI記事生成パイプライン構築（その過程も記事ネタ）

## 開発メモ（操作方法）

- 記事を書く: `content/posts/<slug>.md` を作成（フロントマター必須: title/date/tags/excerpt）
- ビルド: `node docs/scripts/build.mjs`
- ローカル確認: `npx serve docs`（自分のターミナルで。常駐するのでKiroには実行させない）
- 公開: git add → commit → `git push blog main`。1〜2分で GitHub Pages に反映
- 記事作成をAIに頼む: 「.kiro/steering/ai-article-workflow.md に従って『〇〇』の記事を作って」

## ディレクトリ構成

```
toybox/
├─ content/posts/        ← 記事の元Markdown（ここに書く）
├─ docs/                 ← 公開する静的サイト（GitHub Pages 公開ルート）
│  ├─ index.html / posts/  ← 自動生成
│  ├─ assets/style.css
│  ├─ scripts/build.mjs  ← ビルダー（GA4・sitemap生成を含む）
│  ├─ sitemap.xml / robots.txt ← 自動生成
├─ templates/            ← 記事ネタ出し・構成・下書きの雛形
├─ .kiro/
│  ├─ steering/          ← ブログ方針・記事ルール・AI手順
│  └─ hooks/             ← 保存時に自動ビルド
├─ README.md             ← 運用ガイド
└─ PROJECT_STATUS.md     ← このファイル（再開用）
```
