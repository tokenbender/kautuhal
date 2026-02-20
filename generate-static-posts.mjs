#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import https from 'node:https';

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'posts');
const POSTS_INDEX_FILE = path.join(POSTS_DIR, 'posts.json');
const SITEMAP_FILE = path.join(ROOT, 'sitemap.xml');

const SITE_URL = 'https://tokenbender.com';
const MARKED_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js';

function get(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`failed to fetch ${url}: ${response.statusCode}`));
                return;
            }

            let data = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => {
                data += chunk;
            });
            response.on('end', () => {
                resolve(data);
            });
        }).on('error', reject);
    });
}

async function loadMarkedParser() {
    const markedUmd = await get(MARKED_CDN_URL);
    const sandbox = { module: { exports: {} }, exports: {} };
    sandbox.global = sandbox;
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;

    vm.createContext(sandbox);
    vm.runInContext(markedUmd, sandbox);

    const candidate = sandbox.marked || sandbox.module.exports.marked || sandbox.exports.marked || sandbox.module.exports || sandbox.exports;
    if (!candidate || typeof candidate.parse !== 'function') {
        throw new Error('could not initialize marked parser');
    }

    return candidate;
}

function parseFrontmatter(markdown) {
    const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);

    if (!match) {
        return { metadata: {}, content: markdown };
    }

    const frontmatter = match[1];
    const content = match[2];
    const metadata = {};

    frontmatter.split('\n').forEach((line) => {
        const [key, ...value] = line.split(':');
        if (key && value.length > 0) {
            metadata[key.trim()] = value.join(':').trim().replace(/^"|"$/g, '');
        }
    });

    return { metadata, content };
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function stripMarkdown(markdown) {
    return markdown
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/[>*_~]/g, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }

    return text.slice(0, maxLength).trimEnd() + '...';
}

function toIsoDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString();
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value || '';
    }

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function buildThemeBootstrapScript() {
    return [
        '(function () {',
        "    const storageKey = 'tokenbender-theme';",
        '    const root = document.documentElement;',
        '    let storedTheme = null;',
        '    try {',
        '        storedTheme = window.localStorage.getItem(storageKey);',
        '    } catch (error) {}',
        '',
        "    if (storedTheme === 'light' || storedTheme === 'dark') {",
        "        root.setAttribute('data-theme', storedTheme);",
        '        return;',
        '    }',
        '',
        "    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;",
        "    root.setAttribute('data-theme', prefersLight ? 'light' : 'dark');",
        '})();'
    ].join('\n');
}

function buildThemeToggleScript() {
    return [
        '(function () {',
        "    const storageKey = 'tokenbender-theme';",
        '    const root = document.documentElement;',
        "    const toggle = document.querySelector('[data-theme-toggle]');",
        '',
        "    const getTheme = () => root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';",
        '',
        '    const renderToggle = (activeTheme) => {',
        '        if (!toggle) {',
        '            return;',
        '        }',
        '',
        "        const targetTheme = activeTheme === 'light' ? 'dark' : 'light';",
        '        toggle.textContent = targetTheme;',
        "        toggle.setAttribute('aria-label', `switch to ${targetTheme} theme`);",
        "        toggle.setAttribute('aria-pressed', activeTheme === 'light' ? 'true' : 'false');",
        '    };',
        '',
        '    const setTheme = (theme, persist) => {',
        "        root.setAttribute('data-theme', theme);",
        '        renderToggle(theme);',
        '        if (persist) {',
        '            try {',
        '                window.localStorage.setItem(storageKey, theme);',
        '            } catch (error) {}',
        '        }',
        '    };',
        '',
        '    setTheme(getTheme(), false);',
        '',
        '    if (toggle) {',
        "        toggle.addEventListener('click', () => {",
        "            const nextTheme = getTheme() === 'light' ? 'dark' : 'light';",
        '            setTheme(nextTheme, true);',
        '        });',
        '    }',
        '',
        '    if (window.matchMedia) {',
        "        const media = window.matchMedia('(prefers-color-scheme: light)');",
        '        const onChange = (event) => {',
        '            let storedTheme = null;',
        '            try {',
        '                storedTheme = window.localStorage.getItem(storageKey);',
        '            } catch (error) {}',
        '',
        "            if (storedTheme === 'light' || storedTheme === 'dark') {",
        '                return;',
        '            }',
        '',
        "            setTheme(event.matches ? 'light' : 'dark', false);",
        '        };',
        '',
        "        if (typeof media.addEventListener === 'function') {",
        "            media.addEventListener('change', onChange);",
        '        } else if (typeof media.addListener === "function") {',
        '            media.addListener(onChange);',
        '        }',
        '    }',
        '})();'
    ].join('\n');
}

function buildPostHtml(post) {
    const title = post.metadata.title || post.id;
    const plain = stripMarkdown(post.content);
    const description = truncateText(post.metadata.excerpt || plain, 180);
    const canonicalUrl = `${SITE_URL}/posts/${encodeURIComponent(post.id)}/`;
    const isoDate = toIsoDate(post.metadata.date);

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        description,
        author: { '@type': 'Person', name: 'tokenbender' },
        publisher: { '@type': 'Person', name: 'tokenbender' },
        url: canonicalUrl,
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl }
    };

    if (isoDate) {
        schema.datePublished = isoDate;
        schema.dateModified = isoDate;
    }

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} - tokenbender</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index,follow,max-image-preview:large">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="tokenbender">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <script>${buildThemeBootstrapScript()}</script>
    <link rel="stylesheet" href="/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/katex.min.css">
    <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
    <header>
        <nav>
            <div class="nav-container">
                <a href="/index.html" class="logo">tokenbender</a>
                <div class="nav-links">
                    <a href="/posts/">archive</a>
                    <a href="${escapeHtml(canonicalUrl)}">post</a>
                    <button type="button" class="theme-toggle" data-theme-toggle aria-label="switch theme">light</button>
                </div>
            </div>
        </nav>
    </header>

    <main class="container">
        <article class="post-content" id="post-content">
            <div class="post-date">${escapeHtml(formatDate(post.metadata.date || ''))}</div>
            <h1>${escapeHtml(title)}</h1>
            ${post.html}
        </article>
    </main>

    <footer>
        <p>for updates and random thoughts, follow <a href="https://x.com/tokenbender" target="_blank" rel="noopener">@tokenbender</a>.</p>
    </footer>

    <script>${buildThemeToggleScript()}</script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/katex.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/contrib/auto-render.min.js"></script>
    <script>
        if (window.renderMathInElement) {
            window.renderMathInElement(document.getElementById('post-content'), {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\\\(', right: '\\\\)', display: false },
                    { left: '\\\\[', right: '\\\\]', display: true }
                ],
                throwOnError: false,
                trust: false
            });
        }

        if (window.Prism) {
            window.Prism.highlightAll();
        }
    </script>
</body>
</html>
`;
}

function buildPostIndexHtml(posts) {
    const cards = posts.map((post) => {
        const title = post.metadata.title || post.id;
        const excerpt = truncateText(post.metadata.excerpt || stripMarkdown(post.content), 220);
        return `
        <div class="post-card">
            <div class="post-date">${escapeHtml(formatDate(post.metadata.date || ''))}</div>
            <h3><a href="/posts/${encodeURIComponent(post.id)}/">${escapeHtml(title)}</a></h3>
            <p class="post-excerpt">${escapeHtml(excerpt)}</p>
        </div>`;
    }).join('\n');

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>posts - tokenbender</title>
    <meta name="description" content="Crawlable archive of tokenbender posts.">
    <meta name="robots" content="index,follow,max-image-preview:large">
    <link rel="canonical" href="${SITE_URL}/posts/">
    <script>${buildThemeBootstrapScript()}</script>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header>
        <nav>
            <div class="nav-container">
                <a href="/index.html" class="logo">tokenbender</a>
                <div class="nav-links">
                    <a href="/index.html">home</a>
                    <a href="/posts/">archive</a>
                    <button type="button" class="theme-toggle" data-theme-toggle aria-label="switch theme">light</button>
                </div>
            </div>
        </nav>
    </header>

    <main class="container">
        <div class="posts">
            <h2>all posts</h2>
            <div class="post-list">${cards}
            </div>
        </div>
    </main>

    <script>${buildThemeToggleScript()}</script>
</body>
</html>
`;
}

function buildHomepageHtml(posts) {
    const cards = posts.map((post) => {
        const title = post.metadata.title || post.id;
        const excerpt = truncateText(post.metadata.excerpt || stripMarkdown(post.content), 220);
        return `
                <div class="post-card">
                    <div class="post-date">${escapeHtml(formatDate(post.metadata.date || ''))}</div>
                    <h3><a href="/posts/${encodeURIComponent(post.id)}/">${escapeHtml(title)}</a></h3>
                    <p class="post-excerpt">${escapeHtml(excerpt)}</p>
                </div>`;
    }).join('\n');

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>tokenbender - developer blog</title>
    <meta name="description" content="Technical notes and essays from tokenbender — ml researcher.">
    <meta name="robots" content="index,follow,max-image-preview:large">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="tokenbender">
    <meta property="og:title" content="tokenbender - developer blog">
    <meta property="og:description" content="Technical notes and essays from tokenbender — ml researcher.">
    <meta property="og:url" content="${SITE_URL}/">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="tokenbender - developer blog">
    <meta name="twitter:description" content="Technical notes and essays from tokenbender — ml researcher.">
    <link rel="canonical" href="${SITE_URL}/">
    <script>${buildThemeBootstrapScript()}</script>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/katex.min.css">
</head>
<body>
    <header>
        <nav>
            <div class="nav-container">
                <a href="./" class="logo">tokenbender</a>
                <div class="nav-links">
                    <a href="./">home</a>
                    <a href="https://github.com/tokenbender" target="_blank">github</a>
                    <button type="button" class="theme-toggle" data-theme-toggle aria-label="switch theme">light</button>
                </div>
            </div>
        </nav>
    </header>

    <main class="container">
        <section class="hero">
            <h1>hi, i'm tokenbender</h1>
            <p class="subtitle">ml researcher</p>
        </section>

        <section class="posts">
            <h2>recent posts</h2>
            <div id="post-list">${cards}
            </div>
        </section>
    </main>

    <footer>
        <p>&copy; 2025 tokenbender. just vanilla html/css/js.</p>
    </footer>

    <script>${buildThemeToggleScript()}</script>
</body>
</html>
`;
}

function buildSitemap(posts) {
    const urls = [
        `${SITE_URL}/`,
        `${SITE_URL}/index.html`,
        `${SITE_URL}/posts/`,
        ...posts.map((post) => `${SITE_URL}/posts/${encodeURIComponent(post.id)}/`)
    ];

    const items = urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>
`;
}

async function main() {
    const marked = await loadMarkedParser();
    const postsIndexRaw = await fs.readFile(POSTS_INDEX_FILE, 'utf8');
    const postFiles = JSON.parse(postsIndexRaw);

    await fs.mkdir(POSTS_DIR, { recursive: true });

    const posts = [];

    for (const fileName of postFiles) {
        const filePath = path.join(POSTS_DIR, fileName);
        const raw = await fs.readFile(filePath, 'utf8');
        const { metadata, content } = parseFrontmatter(raw);
        const id = fileName.replace(/\.md$/, '');
        const html = marked.parse(content);

        const post = { id, metadata, content, html };
        posts.push(post);

        const outDir = path.join(POSTS_DIR, id);
        await fs.mkdir(outDir, { recursive: true });

        const outPath = path.join(outDir, 'index.html');
        await fs.writeFile(outPath, buildPostHtml(post), 'utf8');
    }

    posts.sort((a, b) => new Date(b.metadata.date) - new Date(a.metadata.date));

    await fs.writeFile(path.join(POSTS_DIR, 'index.html'), buildPostIndexHtml(posts), 'utf8');
    await fs.writeFile(path.join(ROOT, 'index.html'), buildHomepageHtml(posts), 'utf8');
    await fs.writeFile(SITEMAP_FILE, buildSitemap(posts), 'utf8');

    console.log(`generated ${posts.length} static posts, homepage, and sitemap`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
