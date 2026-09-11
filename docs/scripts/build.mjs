// 依存ゼロの静的サイトビルダー
// content/posts/*.md を読み込み、docs/posts/*.html と docs/index.html を生成する。
// docs/ を GitHub Pages の公開ルートとして使う。
//
// 使い方: node docs/scripts/build.mjs
//
// Markdownの記事は先頭にフロントマターを書く:
//   ---
//   title: 記事タイトル
//   date: 2026-09-12
//   tags: [Kiro, AWS, サーバーレス]
//   excerpt: 一覧に表示する要約文
//   ---
//   本文（Markdown）...

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", ".."); // toybox/
const CONTENT_DIR = join(ROOT, "content", "posts");
const OUT_DIR = join(ROOT, "docs", "posts");
const INDEX_OUT = join(ROOT, "docs", "index.html");

const SITE_NAME = "Kiro × AWS ラボ";
const SITE_TAGLINE = "AI開発ツール Kiro と AWS で、実際に作りながら学ぶ技術ブログ。";

// Google Analytics 4 の測定ID（G-XXXXXXXXXX 形式）。
// ここに直接書くか、環境変数 GA_MEASUREMENT_ID で渡す。
// 空のままだと計測タグは出力されない（ローカルで無駄に計測しないため）。
const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || "";

// ---------- ユーティリティ ----------
function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseFrontMatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      val = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    meta[key] = val;
  }
  return { meta, body: m[2] };
}

// ---------- 最小限のMarkdown変換 ----------
function inline(text) {
  // コード（先に退避してエスケープ対象から外す）
  const codes = [];
  text = text.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000CODE${codes.length - 1}\u0000`;
  });
  text = escapeHtml(text);
  // リンク [表示](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  // 太字・斜体
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  // コードを戻す
  text = text.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => `<code>${escapeHtml(codes[i])}</code>`);
  return text;
}

function markdownToHtml(md) {
  const lines = md.split("\n");
  const out = [];
  let i = 0;
  let inList = null; // 'ul' | 'ol'

  const closeList = () => {
    if (inList) {
      out.push(`</${inList}>`);
      inList = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // コードブロック
    if (line.startsWith("```")) {
      closeList();
      const lang = line.slice(3).trim();
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++; // 閉じる```
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : "";
      out.push(`<pre><code${cls}>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // 見出し
    const h = line.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      closeList();
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // 引用
    if (line.startsWith("> ")) {
      closeList();
      const buf = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        buf.push(lines[i].slice(2));
        i++;
      }
      out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
      continue;
    }

    // 番号なしリスト
    if (/^[-*]\s+/.test(line)) {
      if (inList !== "ul") { closeList(); out.push("<ul>"); inList = "ul"; }
      out.push(`<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`);
      i++;
      continue;
    }
    // 番号付きリスト
    if (/^\d+\.\s+/.test(line)) {
      if (inList !== "ol") { closeList(); out.push("<ol>"); inList = "ol"; }
      out.push(`<li>${inline(line.replace(/^\d+\.\s+/, ""))}</li>`);
      i++;
      continue;
    }

    // 生HTMLブロック（アフィリエイトボックスなど）。
    // ブロック要素の開始タグから次の空行まで、そのまま素通しする。
    if (/^\s*<(div|section|figure|iframe|table)/.test(line)) {
      closeList();
      while (i < lines.length && lines[i].trim() !== "") {
        out.push(lines[i]);
        i++;
      }
      continue;
    }

    // 空行
    if (line.trim() === "") {
      closeList();
      i++;
      continue;
    }

    // 通常の段落
    closeList();
    const buf = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{2,4}\s|[-*]\s|\d+\.\s|>|```)/.test(lines[i]) &&
      !/^\s*<(div|section|a|p|figure|iframe)/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  closeList();
  return out.join("\n");
}

// ---------- Google Analytics 4 タグ ----------
function analyticsTag() {
  if (!GA_MEASUREMENT_ID) return "";
  return `
  <!-- Google Analytics 4 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}');
  </script>`;
}

// ---------- HTMLテンプレート ----------
function layout({ title, description, bodyHtml, isArticle }) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description || SITE_TAGLINE)}" />
  <link rel="stylesheet" href="${isArticle ? "../assets/style.css" : "assets/style.css"}" />${analyticsTag()}
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a class="brand" href="${isArticle ? "../index.html" : "index.html"}">Kiro <span>×</span> AWS ラボ</a>
      <nav class="nav">
        <a href="${isArticle ? "../index.html" : "index.html"}">記事一覧</a>
      </nav>
    </div>
  </header>
  ${bodyHtml}
  <footer class="site-footer">
    <div class="container">
      <div>© ${new Date().getFullYear()} ${escapeHtml(SITE_NAME)}</div>
      <div class="disclosure">
        当サイトはアフィリエイトプログラムを利用しており、リンク経由の購入で報酬を得る場合があります。
      </div>
    </div>
  </footer>
</body>
</html>`;
}

function renderArticle(post) {
  const tags = (post.meta.tags || [])
    .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
    .join("");
  const body = `
  <main class="article">
    <div class="container">
      <a class="back-link" href="../index.html">← 記事一覧へ戻る</a>
      <div class="article-header">
        <h1>${escapeHtml(post.meta.title || "無題")}</h1>
        <div class="meta">${escapeHtml(post.meta.date || "")}</div>
        <div class="tags">${tags}</div>
      </div>
      <div class="article-body">
        ${post.html}
      </div>
    </div>
  </main>`;
  return layout({
    title: `${post.meta.title || "無題"} | ${SITE_NAME}`,
    description: post.meta.excerpt,
    bodyHtml: body,
    isArticle: true,
  });
}

function renderIndex(posts) {
  const items = posts
    .map((p) => {
      const tags = (p.meta.tags || [])
        .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
        .join("");
      return `      <li class="post-card">
        <a href="posts/${p.slug}.html">
          <div class="meta">${escapeHtml(p.meta.date || "")}</div>
          <h2>${escapeHtml(p.meta.title || "無題")}</h2>
          <p class="excerpt">${escapeHtml(p.meta.excerpt || "")}</p>
          <div class="tags">${tags}</div>
        </a>
      </li>`;
    })
    .join("\n");

  const body = `
  <section class="hero">
    <div class="container">
      <h1>${escapeHtml(SITE_TAGLINE)}</h1>
      <p>制作記・チュートリアル・ツール比較を発信しています。</p>
    </div>
  </section>
  <main>
    <div class="container">
      <h2 class="section-title">記事一覧</h2>
      <ul class="post-list">
${items || '        <li class="post-card"><p class="excerpt">まだ記事がありません。content/posts に Markdown を追加してビルドしてください。</p></li>'}
      </ul>
    </div>
  </main>`;
  return layout({ title: `${SITE_NAME}`, bodyHtml: body, isArticle: false });
}

// ---------- ビルド実行 ----------
function build() {
  if (!existsSync(CONTENT_DIR)) {
    console.error(`記事フォルダが見つかりません: ${CONTENT_DIR}`);
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));
  const posts = files.map((file) => {
    const raw = readFileSync(join(CONTENT_DIR, file), "utf8");
    const { meta, body } = parseFrontMatter(raw);
    return {
      slug: file.replace(/\.md$/, ""),
      meta,
      html: markdownToHtml(body),
    };
  });

  // 日付の新しい順
  posts.sort((a, b) => String(b.meta.date || "").localeCompare(String(a.meta.date || "")));

  for (const post of posts) {
    writeFileSync(join(OUT_DIR, `${post.slug}.html`), renderArticle(post), "utf8");
    console.log(`  生成: docs/posts/${post.slug}.html`);
  }

  writeFileSync(INDEX_OUT, renderIndex(posts), "utf8");
  console.log(`  生成: docs/index.html （記事 ${posts.length} 件）`);
  console.log("ビルド完了。");
}

build();
