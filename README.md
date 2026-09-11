# Kiro × AWS ラボ — 技術ブログ運営リポジトリ

AI開発ツール **Kiro** と **AWS** で「作りながら学ぶ」ことを発信する技術ブログの運営基盤です。
記事は Markdown で書き、依存ゼロのビルダーで静的サイト（HTML）に変換します。将来は AWS（S3 + CloudFront）にそのまま公開できます。

## ディレクトリ構成

```
toybox/
├─ content/posts/        ← 記事の元Markdown（ここに書く）
├─ docs/                 ← 公開する静的サイト（GitHub Pages 公開ルート）
│  ├─ index.html         ← トップ（記事一覧・自動生成）
│  ├─ posts/             ← 記事HTML（自動生成）
│  ├─ assets/style.css   ← 共通デザイン（ダークテーマ）
│  └─ scripts/build.mjs  ← Markdown→HTML ビルダー（Node標準のみ）
├─ templates/            ← 記事ネタ出し・構成・下書きの雛形
├─ .kiro/
│  ├─ steering/          ← ブログ方針・記事ルール・AI手順
│  └─ hooks/             ← 記事保存で自動ビルドするhook
└─ README.md
```

## 必要なもの

- Node.js（v18以上。動作確認は v24）。追加パッケージのインストールは不要です。

## 記事を書いて公開するまで（基本の流れ）

### 1. 記事を書く

`content/posts/` に `<slug>.md` を作ります。`<slug>` は半角英数とハイフン（URLになります）。
先頭に必ずフロントマターを書きます。

```
---
title: 記事タイトル
date: 2026-09-12
tags: [Kiro, AWS]
excerpt: 一覧に表示する要約
---

## はじめに
本文...
```

### 2. ビルドする

```bash
node docs/scripts/build.mjs
```

`docs/index.html` と `docs/posts/<slug>.html` が生成・更新されます。
※ Kiroセッション中は保存時に自動ビルドするhook（`.kiro/hooks/build-on-post-save.json`）が動きます。

### 3. プレビューする

`docs/index.html` をブラウザで開けば確認できます。ローカルサーバーで見たい場合は手動で以下を実行してください（このコマンドは常駐するのでKiroには実行させず、自分のターミナルで起動します）。

```bash
npx serve docs
```

## AIに記事を手伝ってもらう（レベル1ワークフロー）

Kiroとのチャットで、こう伝えると記事作成ワークフローが始まります。

> `.kiro/steering/ai-article-workflow.md` に従って、「〇〇（テーマ）」の記事を作って

Kiroは次の流れで進めます（各ステップで確認を挟みます）。

1. テーマとキーワードの確定（未指定ならネタ候補を5つ提案）
2. 構成案の提示 → あなたが承認
3. `content/posts/` に下書きを生成（要確認箇所は `<!-- TODO -->` で明示）
4. ビルドして表示確認
5. 公開前チェックリストで最終確認

テーマ探しから相談したいときは、こう伝えます。

> 記事のネタを一緒に考えたい。`templates/keyword-ideas.md` の観点で候補を出して

## ルール（steering）

Kiroは以下を参照して記事を作ります。方針を変えたいときはこれらを編集してください。

- `.kiro/steering/blog-strategy.md` — 誰に何を発信するか（ペルソナ・カテゴリ・収益方針）
- `.kiro/steering/article-rules.md` — 記事の品質基準・SEO・**アフィリエイトの法令順守ルール**
- `.kiro/steering/ai-article-workflow.md` — AIが記事を作るときの手順

## アフィリエイトの注意（必ず守る）

- 広告・PR箇所には **「PR」表記を明示**（ステマ規制対応）。
- 紹介リンクには `rel="nofollow sponsored noopener"` を付ける。
- 実際に使っていない商品は勧めない。「必ず稼げる」等の誇大表現は禁止。
- AI生成のまま公開しない。**事実確認と加筆は必ず人間が行う**。

紹介ボックスの書き方（Markdown内・空行なし）:

```
<div class="affiliate-box">
<div class="label">PR</div>
<h4>商品・サービス名</h4>
<p>読者目線の紹介文。</p>
<a class="btn" href="ASPリンク" rel="nofollow sponsored noopener" target="_blank">詳細を見る</a>
</div>
```

## アクセス解析（Google Analytics 4）

全ページにGA4の計測タグを自動で埋め込む仕組みが入っています。測定IDを設定するとタグが出力され、未設定なら出力されません（ローカルでの無駄な計測を防ぐため）。

### 測定IDの取得手順

1. [Google Analytics](https://analytics.google.com/) にログイン
2. 「管理」→「プロパティを作成」→ サイト名などを入力
3. データストリームで「ウェブ」を選び、サイトURL（`https://butio89.github.io/kiro-aws-lab/`）を登録
4. 発行される **測定ID（`G-XXXXXXXXXX` 形式）** をコピー

### 設定方法（どちらか）

- `docs/scripts/build.mjs` の `GA_MEASUREMENT_ID` に直接書く
- もしくはビルド時に環境変数で渡す:

```powershell
$env:GA_MEASUREMENT_ID = "G-XXXXXXXXXX"; node docs/scripts/build.mjs
```

設定後にビルド → コミット → プッシュすると、公開サイトで計測が始まります。

### Search Console（SEO用・推奨）

検索キーワードや順位を見るには [Google Search Console](https://search.google.com/search-console) にもサイトを登録します。GA4と連携済みのGoogleアカウントなら、所有権確認をスムーズに済ませられます。

## この先のロードマップ

- レベル1（現在）: Kiro内でAIに記事を手伝ってもらい、静的サイトを手元でビルド。
- レベル2: AWS Bedrock + Lambda で記事生成パイプラインを構築（構築過程自体が記事ネタ）。
- 公開: `docs/` を GitHub Pages で公開（現在）。将来は S3 + CloudFront も選択肢。ASP（A8.net・もしもアフィリエイト等）に登録してリンクを取得。

## 記事作成チェックリスト

- [ ] フロントマター（title/date/tags/excerpt）が揃っている
- [ ] 実際に手を動かした一次情報が入っている
- [ ] コード・手順が再現可能
- [ ] アフィリエイト箇所にPR表記と rel 属性がある
- [ ] `node docs/scripts/build.mjs` が通り、表示が崩れていない
