#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import https from 'node:https';

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'posts');
const ARCHIVE_DIR = path.join(ROOT, 'archive');
const POSTS_INDEX_FILE = path.join(POSTS_DIR, 'posts.json');
const SITEMAP_FILE = path.join(ROOT, 'sitemap.xml');

const SITE_URL = 'https://tokenbender.com';
const AUTHOR_NAME = 'Abhishek Harshvardhan Mishra';
const AUTHOR_HANDLE = 'tokenbender';
const AUTHOR_IMAGE_PATH = '/portrait-tokenbender.webp';
const AUTHOR_IMAGE_URL = `${SITE_URL}/portrait-tokenbender.jpg`;
const AUTHOR_IMAGE_WIDTH = 1158;
const AUTHOR_IMAGE_HEIGHT = 1359;
const FAVICON_LINKS = '<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n    <link rel="alternate icon" href="/favicon.ico">';
const HOMEPAGE_TITLE = `Kautuhal — ${AUTHOR_HANDLE}`;
const HOMEPAGE_DESCRIPTION = `Authored research, experiments, and working theories from ${AUTHOR_NAME} on learning systems for models, agents, and people.`;
const HOMEPAGE_HERO_SUMMARY = 'Research on RL and metaharnesses.';
const STYLE_HREF = '/style.css?v=press-20260826-4';
const MARKED_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js';
const AVERAGE_READING_WPM = 220;
const CATEGORY_ORDER = ['research', 'technical', 'personal'];
const CATEGORY_LABELS = {
    research: 'Research',
    technical: 'Technical',
    personal: 'Personal',
    uncategorized: 'Other'
};

const LABEL_OVERRIDES = {
    ai: 'AI',
    api: 'API',
    llm: 'LLM',
    lora: 'LoRA',
    ml: 'ML',
    prism: 'PRISM',
    rl: 'RL'
};

function formatUiLabel(value) {
    return String(value)
        .replace(/[-_]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((word) => LABEL_OVERRIDES[word.toLowerCase()] || `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
        .join(' ');
}

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

function parseFrontmatterValue(key, rawValue) {
    const stripped = rawValue
        .trim()
        .replace(/^"(.*)"$/s, '$1')
        .replace(/^'(.*)'$/s, '$1');

    if (['tags', 'related'].includes(key)) {
        const listString = stripped.startsWith('[') && stripped.endsWith(']')
            ? stripped.slice(1, -1)
            : stripped;

        return listString
            .split(',')
            .map((item) => item.trim().replace(/^"(.*)"$/s, '$1').replace(/^'(.*)'$/s, '$1'))
            .filter(Boolean);
    }

    return stripped;
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
        const separator = line.indexOf(':');
        if (separator < 0) {
            return;
        }

        const key = line.slice(0, separator).trim();
        const rawValue = line.slice(separator + 1);
        if (!key) {
            return;
        }

        metadata[key] = parseFrontmatterValue(key, rawValue);
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

function formatMonthDay(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value || '';
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

function formatYear(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'unknown';
    }

    return date.toLocaleDateString('en-US', {
        year: 'numeric'
    });
}

function normalizeTags(rawTags) {
    const values = Array.isArray(rawTags)
        ? rawTags
        : typeof rawTags === 'string'
            ? rawTags.split(',')
            : [];

    return Array.from(new Set(values
        .map((tag) => String(tag).trim().toLowerCase())
        .filter(Boolean)));
}

function normalizeStatus(rawStatus) {
    if (typeof rawStatus !== 'string') {
        return null;
    }

    const normalized = rawStatus.trim().toLowerCase();
    return normalized || null;
}

function isPublishedPost(post) {
    return !['placeholder', 'draft'].includes(post.status);
}

function normalizeRelated(rawRelated) {
    const values = Array.isArray(rawRelated)
        ? rawRelated
        : typeof rawRelated === 'string'
            ? rawRelated.split(',')
            : [];

    return Array.from(new Set(values
        .map((item) => String(item).trim())
        .filter(Boolean)));
}

function normalizeCategory(rawCategory) {
    if (typeof rawCategory !== 'string') {
        return 'uncategorized';
    }

    const normalized = rawCategory.trim().toLowerCase();
    if (CATEGORY_ORDER.includes(normalized)) {
        return normalized;
    }

    return 'uncategorized';
}

function getCategoryLabel(category) {
    return CATEGORY_LABELS[category] || CATEGORY_LABELS.uncategorized;
}

async function resolvePostFiles() {
    const entries = await fs.readdir(POSTS_DIR, { withFileTypes: true });
    const discoveredMarkdownFiles = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));

    const discoveredSet = new Set(discoveredMarkdownFiles);
    const resolvedFiles = [];
    const seen = new Set();

    try {
        const postsIndexRaw = await fs.readFile(POSTS_INDEX_FILE, 'utf8');
        const indexedFiles = JSON.parse(postsIndexRaw);

        if (Array.isArray(indexedFiles)) {
            indexedFiles.forEach((fileName) => {
                if (typeof fileName !== 'string') {
                    return;
                }

                const trimmed = fileName.trim();
                if (!trimmed || seen.has(trimmed) || !discoveredSet.has(trimmed)) {
                    return;
                }

                resolvedFiles.push(trimmed);
                seen.add(trimmed);
            });
        }
    } catch (error) {
        if (error && error.code !== 'ENOENT') {
            throw error;
        }
    }

    discoveredMarkdownFiles.forEach((fileName) => {
        if (!seen.has(fileName)) {
            resolvedFiles.push(fileName);
            seen.add(fileName);
        }
    });

    return resolvedFiles;
}

function estimateReadingTimeMinutes(plainText) {
    if (!plainText) {
        return 1;
    }

    const words = plainText.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / AVERAGE_READING_WPM));
}

function slugify(value) {
    return value
        .toLowerCase()
        .replace(/&(?:[a-z]+|#\d+);/gi, ' ')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function stripHtmlTags(html) {
    return html.replace(/<[^>]+>/g, '');
}

function extractFootnotes(markdown) {
    const lines = markdown.split('\n');
    const footnotes = {};
    const keptLines = [];

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const match = line.match(/^\[\^([^\]]+)\]:\s*(.*)$/);

        if (!match) {
            keptLines.push(line);
            continue;
        }

        const key = match[1].trim();
        const noteLines = [match[2]];

        while (index + 1 < lines.length) {
            const nextLine = lines[index + 1];
            if (nextLine.trim() === '') {
                noteLines.push('');
                index += 1;
                continue;
            }

            if (/^( {2,}|\t)/.test(nextLine)) {
                noteLines.push(nextLine.replace(/^( {2,}|\t)/, ''));
                index += 1;
                continue;
            }

            break;
        }

        footnotes[key] = noteLines.join('\n').trim();
    }

    return {
        contentWithoutFootnotes: keptLines.join('\n'),
        footnotes
    };
}

function renderInlineMarkdown(marked, markdown) {
    if (typeof marked.parseInline === 'function') {
        return marked.parseInline(markdown);
    }

    const rendered = marked.parse(markdown).trim();
    return rendered.replace(/^<p>/, '').replace(/<\/p>$/, '');
}

function replaceFootnoteReferences(marked, html, footnotes, postId) {
    const footnoteKeys = Object.keys(footnotes);
    if (!footnoteKeys.length) {
        return html;
    }

    const assignedNumbers = new Map();
    let counter = 0;

    return html.replace(/\[\^([^\]]+)\]/g, (match, rawKey) => {
        const key = rawKey.trim();
        const noteMarkdown = footnotes[key];

        if (!noteMarkdown) {
            return match;
        }

        if (!assignedNumbers.has(key)) {
            counter += 1;
            assignedNumbers.set(key, counter);
        }

        const number = assignedNumbers.get(key);
        const toggleId = `sn-${slugify(postId)}-${number}`;
        const noteHtml = renderInlineMarkdown(marked, noteMarkdown);

        return `<label for="${toggleId}" class="sidenote-number">${number}</label><input type="checkbox" id="${toggleId}" class="sidenote-toggle"><span class="sidenote"><span class="sidenote-prefix">${number}. </span>${noteHtml}</span>`;
    });
}

function addHeadingIdsAndCollect(html) {
    const headings = [];
    const slugCounts = new Map();

    const updatedHtml = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/g, (fullMatch, level, attrs, innerHtml) => {
        const plainHeading = stripHtmlTags(innerHtml)
            .replace(/&(?:[a-z]+|#\d+);/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!plainHeading) {
            return fullMatch;
        }

        const existingIdMatch = attrs.match(/\sid="([^"]+)"/);
        let headingId = existingIdMatch ? existingIdMatch[1] : slugify(plainHeading);

        if (!headingId) {
            headingId = `section-${headings.length + 1}`;
        }

        const count = slugCounts.get(headingId) || 0;
        slugCounts.set(headingId, count + 1);
        if (count > 0) {
            headingId = `${headingId}-${count + 1}`;
        }

        headings.push({
            level: Number(level),
            text: plainHeading,
            id: headingId
        });

        const attrsWithoutId = attrs.replace(/\sid="[^"]*"/, '');
        return `<h${level}${attrsWithoutId} id="${headingId}">${innerHtml}</h${level}>`;
    });

    return {
        html: updatedHtml,
        headings
    };
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
        "        const targetLabel = `${targetTheme.charAt(0).toUpperCase()}${targetTheme.slice(1)}`;",
        '        toggle.textContent = targetLabel;',
        "        toggle.setAttribute('aria-label', `Switch to ${targetTheme} theme`);",
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

function buildJourneyGlazeScript() {
    return `(function () {
    document.querySelectorAll('.journey-glaze-toggle').forEach((toggle) => {
        toggle.addEventListener('click', () => {
            const glaze = toggle.closest('.journey-glaze');
            if (!glaze) return;
            const isOpen = glaze.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
    });
})();`;
}

function buildTocEnhancementScript() {
    return [
        '(function () {',
        "    const links = Array.from(document.querySelectorAll('[data-toc-link]'));",
        '    if (!links.length) {',
        '        return;',
        '    }',
        '',
        '    const mapping = links.map((link) => {',
        "        const headingId = link.getAttribute('data-toc-link');",
        '        return {',
        '            link,',
        '            heading: document.getElementById(headingId)',
        '        };',
        '    }).filter((entry) => entry.heading);',
        '',
        '    if (!mapping.length) {',
        '        return;',
        '    }',
        '',
        '    const setActive = (id) => {',
        '        mapping.forEach((entry) => {',
        "            entry.link.classList.toggle('is-active', entry.heading.id === id);",
        '        });',
        '    };',
        '',
        '    const update = () => {',
        '        let activeId = mapping[0].heading.id;',
        '        mapping.forEach((entry) => {',
        '            if (entry.heading.getBoundingClientRect().top <= 140) {',
        '                activeId = entry.heading.id;',
        '            }',
        '        });',
        '        setActive(activeId);',
        '    };',
        '',
        '    update();',
        "    window.addEventListener('scroll', update, { passive: true });",
        '})();'
    ].join('\n');
}

function buildPostMeta(post) {
    const parts = [];
    parts.push(`<span class="meta-item">${escapeHtml(formatDate(post.metadata.date || ''))}</span>`);
    parts.push('<span class="meta-sep">·</span>');
    parts.push(`<span class="post-category">${escapeHtml(getCategoryLabel(post.category))}</span>`);
    parts.push('<span class="meta-sep">·</span>');
    parts.push(`<span class="meta-item">${post.readingTimeMinutes} min read</span>`);

    if (post.status) {
        parts.push('<span class="meta-sep">·</span>');
        parts.push(`<span class="post-status">${escapeHtml(formatUiLabel(post.status))}</span>`);
    }

    if (post.tags.length) {
        const tagLinks = post.tags
            .map((tag) => `<span class="post-tag">${escapeHtml(formatUiLabel(tag))}</span>`)
            .join('');

        parts.push('<span class="meta-sep">·</span>');
        parts.push(`<span class="post-tags">${tagLinks}</span>`);
    }

    return `<div class="post-meta">${parts.join('')}</div>`;
}

function buildPrimaryNavigation(active = '') {
    const navLink = (href, label, key, extraClass = '') => {
        const activeAttributes = active === key ? ' class="is-active" aria-current="page"' : extraClass ? ` class="${extraClass}"` : '';
        return `<a href="${href}"${activeAttributes}>${label}</a>`;
    };

    return `${navLink('/posts/', 'Writing', 'writing')}${navLink('/kalpataru/', 'Kalpataru', 'kalpataru')}${navLink('/archive/', 'Archive', 'archive')}${navLink('https://github.com/tokenbender', 'GitHub', 'github', 'nav-github')}<button type="button" class="theme-toggle" data-theme-toggle aria-label="Switch theme">Light</button>`;
}

function buildPressIssueRule(left, right) {
    return `<div class="site-issue-rule" aria-hidden="true"><span>${escapeHtml(left)}</span><span>${escapeHtml(right)}</span></div>`;
}

function buildTocMarkup(headings) {
    if (headings.length < 3) {
        return {
            desktop: '<aside class="post-toc post-toc-empty" aria-hidden="true"></aside>',
            mobile: ''
        };
    }

    const items = headings.map((heading) => {
        return `<li class="toc-item toc-level-${heading.level}"><a href="#${escapeHtml(heading.id)}" data-toc-link="${escapeHtml(heading.id)}">${escapeHtml(heading.text)}</a></li>`;
    }).join('');

    const nav = `<nav class="post-toc-inner" aria-label="Table of contents"><h2>Contents</h2><ol>${items}</ol></nav>`;

    return {
        desktop: `<aside class="post-toc">${nav}</aside>`,
        mobile: `<details class="post-toc-mobile"><summary>Contents</summary>${nav}</details>`
    };
}

function selectRelatedPosts(posts, currentPost, maxItems) {
    const byId = new Map(posts.map((post) => [post.id, post]));
    const selected = [];
    const selectedIds = new Set();

    currentPost.relatedIds.forEach((id) => {
        const match = byId.get(id);
        if (match && match.id !== currentPost.id && !selectedIds.has(match.id)) {
            selected.push(match);
            selectedIds.add(match.id);
        }
    });

    const currentTagSet = new Set(currentPost.tags);
    const scored = posts
        .filter((post) => post.id !== currentPost.id && !selectedIds.has(post.id))
        .map((post) => {
            const overlap = post.tags.filter((tag) => currentTagSet.has(tag)).length;
            const timestamp = new Date(post.metadata.date).getTime() || 0;
            return { post, overlap, timestamp };
        })
        .filter((item) => item.overlap > 0)
        .sort((left, right) => {
            if (right.overlap !== left.overlap) {
                return right.overlap - left.overlap;
            }

            return right.timestamp - left.timestamp;
        });

    scored.forEach((item) => {
        if (selected.length >= maxItems) {
            return;
        }

        if (!selectedIds.has(item.post.id)) {
            selected.push(item.post);
            selectedIds.add(item.post.id);
        }
    });

    posts.forEach((post) => {
        if (selected.length >= maxItems) {
            return;
        }

        if (post.id !== currentPost.id && !selectedIds.has(post.id)) {
            selected.push(post);
            selectedIds.add(post.id);
        }
    });

    return selected.slice(0, maxItems);
}

function buildRelatedPostsSection(post) {
    if (!post.relatedPosts.length) {
        return '';
    }

    const items = post.relatedPosts.map((relatedPost) => {
        const title = relatedPost.metadata.title || relatedPost.id;
        const excerpt = truncateText(relatedPost.metadata.excerpt || relatedPost.plain, 160);

        return `<li><a href="/posts/${encodeURIComponent(relatedPost.id)}/">${escapeHtml(title)}</a><p>${escapeHtml(excerpt)}</p></li>`;
    }).join('');

    return `<section class="related-posts" aria-labelledby="related-posts-heading"><h2 id="related-posts-heading">See Also</h2><ul>${items}</ul></section>`;
}

function getOrderedCategoryGroups(posts) {
    const groups = CATEGORY_ORDER.map((category) => {
        const categoryPosts = posts.filter((post) => post.category === category);
        return {
            key: category,
            label: getCategoryLabel(category),
            posts: categoryPosts
        };
    }).filter((group) => group.posts.length > 0);

    const uncategorizedPosts = posts.filter((post) => !CATEGORY_ORDER.includes(post.category));
    if (uncategorizedPosts.length) {
        groups.push({
            key: 'uncategorized',
            label: getCategoryLabel('uncategorized'),
            posts: uncategorizedPosts
        });
    }

    return groups;
}

function buildArchiveTopicSections(posts) {
    const groups = getOrderedCategoryGroups(posts);

    return groups.map((group) => {
        const items = group.posts.map((post) => {
            const title = post.metadata.title || post.id;
            const excerpt = truncateText(post.metadata.excerpt || post.plain, 180);
            return `<li><a href="/posts/${encodeURIComponent(post.id)}/">${escapeHtml(title)}</a><span class="archive-item-meta">${escapeHtml(formatDate(post.metadata.date || ''))} · ${post.readingTimeMinutes} min</span><p>${escapeHtml(excerpt)}</p></li>`;
        }).join('');

        return `<section class="archive-group" id="${group.key}"><div class="archive-group-head"><h2>${escapeHtml(group.label)}</h2><span>${group.posts.length}</span></div><ul class="archive-topic-list">${items}</ul></section>`;
    }).join('');
}

function buildArchiveDateSections(posts) {
    const byYear = new Map();

    posts.forEach((post) => {
        const year = formatYear(post.metadata.date);
        if (!byYear.has(year)) {
            byYear.set(year, []);
        }

        byYear.get(year).push(post);
    });

    return Array.from(byYear.entries()).map(([year, yearPosts]) => {
        const items = yearPosts.map((post) => {
            const title = post.metadata.title || post.id;
            return `<li><span class="archive-date-stamp">${escapeHtml(formatMonthDay(post.metadata.date || ''))}</span><a href="/posts/${encodeURIComponent(post.id)}/">${escapeHtml(title)}</a><span class="archive-date-category">${escapeHtml(getCategoryLabel(post.category))}</span></li>`;
        }).join('');

        return `<section class="archive-year-block"><h2>${escapeHtml(year)}</h2><ul class="archive-date-list">${items}</ul></section>`;
    }).join('');
}

function buildArchiveViewScript() {
    return [
        '(function () {',
        "    const toggles = Array.from(document.querySelectorAll('[data-archive-view-toggle]'));",
        "    const views = Array.from(document.querySelectorAll('[data-archive-view]'));",
        '    if (!toggles.length || !views.length) {',
        '        return;',
        '    }',
        '',
        "    const resolveViewFromHash = () => {",
        "        const hash = window.location.hash.replace('#', '').trim().toLowerCase();",
        "        if (hash === 'date' || hash === 'view-date') {",
        "            return 'date';",
        '        }',
        "        return 'topic';",
        '    };',
        '',
        '    const setView = (view, updateHash) => {',
        '        toggles.forEach((toggle) => {',
        "            const isActive = toggle.getAttribute('data-archive-view-toggle') === view;",
        "            toggle.classList.toggle('is-active', isActive);",
        "            toggle.setAttribute('aria-pressed', isActive ? 'true' : 'false');",
        '        });',
        '',
        '        views.forEach((section) => {',
        "            const isActive = section.getAttribute('data-archive-view') === view;",
        '            section.hidden = !isActive;',
        '        });',
        '',
        '        if (updateHash) {',
        "            const nextHash = view === 'date' ? '#date' : '#topic';",
        '            history.replaceState(null, "", nextHash);',
        '        }',
        '    };',
        '',
        '    toggles.forEach((toggle) => {',
        "        toggle.addEventListener('click', () => {",
        "            const view = toggle.getAttribute('data-archive-view-toggle');",
        '            setView(view, true);',
        '        });',
        '    });',
        '',
        '    setView(resolveViewFromHash(), false);',
        "    window.addEventListener('hashchange', () => setView(resolveViewFromHash(), false));",
        '})();'
    ].join('\n');
}

function buildPostHtml(post) {
    const title = post.metadata.title || post.id;
    const description = truncateText(post.metadata.excerpt || post.plain, 180);
    const canonicalUrl = `${SITE_URL}/posts/${encodeURIComponent(post.id)}/`;
    const isoDate = toIsoDate(post.metadata.date);
    const toc = buildTocMarkup(post.headings);
    const relatedSection = buildRelatedPostsSection(post);
    const hasSidenotes = post.html.includes('class="sidenote"');
    const bodyClass = hasSidenotes ? 'post-page has-sidenotes' : 'post-page no-sidenotes';
    const layoutClass = hasSidenotes ? 'post-layout has-sidenotes' : 'post-layout no-sidenotes';

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

    if (post.tags.length) {
        schema.keywords = post.tags.join(', ');
    }

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} - tokenbender</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="${isPublishedPost(post) ? 'index,follow,max-image-preview:large' : 'noindex,nofollow'}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="tokenbender">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    ${FAVICON_LINKS}
    <script>${buildThemeBootstrapScript()}</script>
    <link rel="stylesheet" href="${STYLE_HREF}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/katex.min.css">
    <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body class="${bodyClass}">
    <header>
        <nav>
            <div class="nav-container">
                <a href="/index.html" class="logo">tokenbender</a>
                <div class="nav-links">
                    ${buildPrimaryNavigation('writing')}
                </div>
            </div>
        </nav>
        ${buildPressIssueRule('Kautuhal / Authored Work', `${getCategoryLabel(post.category)} Note · ${formatDate(post.metadata.date || '')}`)}
    </header>

    <main class="${layoutClass}">
        ${toc.desktop}
        <article class="post-content" id="post-content">
            <p class="post-press-kind" aria-hidden="true">Claim-conditioned field note</p>
            <h1>${escapeHtml(title)}</h1>
            ${buildPostMeta(post)}
${toc.mobile ? `            ${toc.mobile}` : ''}
            ${post.html}
            <div class="post-press-endmark" aria-hidden="true"><span>End of authored note</span><span>Kautuhal / tokenbender</span></div>
${relatedSection}
        </article>
        <aside class="post-margin-column" aria-hidden="true"></aside>
    </main>

    <footer>
        <p>For updates and random thoughts, follow <a href="https://x.com/tokenbender" target="_blank" rel="noopener">@tokenbender</a>.</p>
    </footer>

    <script>${buildThemeToggleScript()}</script>
    <script>${buildJourneyGlazeScript()}</script>
    <script>${buildTocEnhancementScript()}</script>
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

function buildArchiveHtml(posts, mode = 'archive') {
    const topicSections = buildArchiveTopicSections(posts);
    const dateSections = buildArchiveDateSections(posts);
    const isWritingIndex = mode === 'writing';
    const pageTitle = isWritingIndex ? 'Writing' : 'Archive';
    const pageDescription = isWritingIndex ? 'All published work from Kautuhal.' : 'Browse posts by topic or timeline on tokenbender.';
    const canonicalPath = isWritingIndex ? '/posts/' : '/archive/';

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle} - tokenbender</title>
    <meta name="description" content="${pageDescription}">
    <meta name="robots" content="index,follow,max-image-preview:large">
    <link rel="canonical" href="${SITE_URL}${canonicalPath}">
    ${FAVICON_LINKS}
    <script>${buildThemeBootstrapScript()}</script>
    <link rel="stylesheet" href="${STYLE_HREF}">
</head>
<body class="archive-shell-page ${isWritingIndex ? 'writing-index-page' : 'archive-index-page'}">
    <header>
        <nav>
            <div class="nav-container">
                <a href="/index.html" class="logo">tokenbender</a>
                <div class="nav-links">
                    ${buildPrimaryNavigation(isWritingIndex ? 'writing' : 'archive')}
                </div>
            </div>
        </nav>
        ${buildPressIssueRule('Kautuhal / Authored Index', `${pageTitle} · ${posts.length} Published`)}
    </header>

    <main class="container archive-page">
        <section class="archive-hero">
            <h1>${pageTitle}</h1>
            <p>${isWritingIndex ? 'All published work, organized two ways.' : 'Browse by topic or date.'}</p>
        </section>

        <div class="archive-view-switcher" aria-label="Archive view">
            <button type="button" class="archive-view-toggle is-active" data-archive-view-toggle="topic" aria-pressed="true">[By Topic]</button>
            <button type="button" class="archive-view-toggle" data-archive-view-toggle="date" aria-pressed="false">[By Date]</button>
        </div>

        <section class="archive-view archive-view-topic" data-archive-view="topic">${topicSections}</section>
        <section class="archive-view archive-view-date" data-archive-view="date" hidden>${dateSections}</section>
    </main>

    <script>${buildThemeToggleScript()}</script>
    <script>${buildArchiveViewScript()}</script>
</body>
</html>
`;
}

function buildHomepageHeroHtml() {
    return `<section class="home-hero kautuhal-ambient-entry" aria-label="Kautuhal"><header class="kautuhal-ambient-masthead"><strong>01 / Kautuhal</strong><span>Authored Work</span></header><div class="home-identity kautuhal-ambient-copy"><div><p class="home-identity-eyebrow kautuhal-ambient-kicker">Research · Experiments · Working Theories</p><h1 class="home-identity-summary">${escapeHtml(HOMEPAGE_HERO_SUMMARY)}</h1></div><div class="home-actions"><a class="intro-action" href="/posts/welcome/">Hello, I am Tokenbender <span aria-hidden="true">↗</span></a><a class="primary-action" href="/posts/">Read my latest writing/research. <span aria-hidden="true">↗</span></a><a class="secondary-action" href="/kalpataru/">Visit Kalpataru. <span aria-hidden="true">↗</span></a></div></div><p class="kautuhal-ambient-label" aria-live="polite"><strong>Circuit Coral NCA / Loading</strong>Page Content Does Not Depend on It</p></section>`;
}

function buildKautuhalRawWebGpuScript() {
    return `(function () {
        const canvas = document.getElementById('kautuhal-neural-background');
        const label = document.querySelector('.kautuhal-ambient-label');
        if (!canvas || !label) return;
        if (!navigator.gpu) {
            label.innerHTML = '<strong>Neural Background Unavailable</strong>WebGPU Is Not Available on This Device';
            return;
        }

        const width = 72;
        const height = 48;
        const channels = 12;
        const hidden = 48;
        const cellCount = width * height;
        const stateFloatCount = cellCount * channels;
        const stateByteSize = stateFloatCount * 4;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const pointer = { active: false, x: 0, y: 0, clientX: -1, clientY: -1 };
        let device = null;
        let context = null;
        let format = null;
        let stateBuffers = [];
        let readbackBuffer = null;
        let updateBindGroups = [];
        let maskBindGroups = [];
        let renderBindGroups = [];
        let updatePipeline = null;
        let maskPipeline = null;
        let renderPipeline = null;
        let damageBuffer = null;
        let renderParamsBuffer = null;
        let simParamsBuffer = null;
        let currentState = 0;
        let steps = 0;
        let stopped = false;
        let lastInferenceMs = 0;
        let lastFrameAt = 0;

        const updateShader = \`
            const WIDTH: u32 = 72u;
            const HEIGHT: u32 = 48u;
            const CHANNELS: u32 = 12u;
            const HIDDEN: u32 = 48u;
            const CELLS: u32 = WIDTH * HEIGHT;

            @group(0) @binding(0) var<storage, read> state_in: array<f32>;
            @group(0) @binding(1) var<storage, read_write> proposal: array<f32>;
            @group(0) @binding(2) var<storage, read> w1: array<f32>;
            @group(0) @binding(3) var<storage, read> b1: array<f32>;
            @group(0) @binding(4) var<storage, read> w2: array<f32>;
            @group(0) @binding(5) var<storage, read> b2: array<f32>;
            @group(0) @binding(6) var<uniform> sim_params: vec4<f32>;

            fn random01(x: u32, y: u32, step: u32) -> f32 {
                var value = x * 1664525u + y * 1013904223u + step * 747796405u + 2891336453u;
                value = (value ^ (value >> 16u)) * 2246822519u;
                value = (value ^ (value >> 13u)) * 3266489917u;
                value = value ^ (value >> 16u);
                return f32(value & 16777215u) / 16777215.0;
            }

            fn read_state(channel: u32, x: i32, y: i32) -> f32 {
                if (x < 0 || y < 0 || x >= i32(WIDTH) || y >= i32(HEIGHT)) { return 0.0; }
                return state_in[channel * CELLS + u32(y) * WIDTH + u32(x)];
            }

            @compute @workgroup_size(8, 8)
            fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
                if (gid.x >= WIDTH || gid.y >= HEIGHT) { return; }
                let x = i32(gid.x);
                let y = i32(gid.y);
                var hidden_values: array<f32, 48>;

                for (var h: u32 = 0u; h < HIDDEN; h = h + 1u) {
                    var sum = b1[h];
                    for (var c: u32 = 0u; c < CHANNELS; c = c + 1u) {
                        let center = read_state(c, x, y);
                        let sobel_x = (
                            -read_state(c, x - 1, y - 1) + read_state(c, x + 1, y - 1)
                            -2.0 * read_state(c, x - 1, y) + 2.0 * read_state(c, x + 1, y)
                            -read_state(c, x - 1, y + 1) + read_state(c, x + 1, y + 1)
                        ) / 8.0;
                        let sobel_y = (
                            -read_state(c, x - 1, y - 1) - 2.0 * read_state(c, x, y - 1) - read_state(c, x + 1, y - 1)
                            +read_state(c, x - 1, y + 1) + 2.0 * read_state(c, x, y + 1) + read_state(c, x + 1, y + 1)
                        ) / 8.0;
                        let laplace = read_state(c, x - 1, y) + read_state(c, x + 1, y)
                            + read_state(c, x, y - 1) + read_state(c, x, y + 1) - 4.0 * center;
                        let base = h * (CHANNELS * 4u);
                        sum = sum
                            + w1[base + c] * center
                            + w1[base + CHANNELS + c] * sobel_x
                            + w1[base + CHANNELS * 2u + c] * sobel_y
                            + w1[base + CHANNELS * 3u + c] * laplace;
                    }
                    hidden_values[h] = max(sum, 0.0);
                }

                let cell = gid.y * WIDTH + gid.x;
                let should_update = random01(gid.x, gid.y, u32(sim_params.x)) <= sim_params.y;
                for (var c: u32 = 0u; c < CHANNELS; c = c + 1u) {
                    var delta = b2[c];
                    for (var h: u32 = 0u; h < HIDDEN; h = h + 1u) {
                        delta = delta + w2[c * HIDDEN + h] * hidden_values[h];
                    }
                    let index = c * CELLS + cell;
                    proposal[index] = state_in[index] + select(0.0, delta, should_update);
                }
            }
        \`;

        const maskShader = \`
            const WIDTH: u32 = 72u;
            const HEIGHT: u32 = 48u;
            const CHANNELS: u32 = 12u;
            const CELLS: u32 = WIDTH * HEIGHT;

            @group(0) @binding(0) var<storage, read> state_before: array<f32>;
            @group(0) @binding(1) var<storage, read> proposal: array<f32>;
            @group(0) @binding(2) var<storage, read_write> state_next: array<f32>;
            @group(0) @binding(3) var<uniform> damage: vec4<f32>;

            fn alpha_before(x: i32, y: i32) -> f32 {
                if (x < 0 || y < 0 || x >= i32(WIDTH) || y >= i32(HEIGHT)) { return 0.0; }
                return state_before[3u * CELLS + u32(y) * WIDTH + u32(x)];
            }

            fn alpha_after(x: i32, y: i32) -> f32 {
                if (x < 0 || y < 0 || x >= i32(WIDTH) || y >= i32(HEIGHT)) { return 0.0; }
                return proposal[3u * CELLS + u32(y) * WIDTH + u32(x)];
            }

            fn alive_before(x: i32, y: i32) -> bool {
                var value = -1e9;
                for (var dy: i32 = -1; dy <= 1; dy = dy + 1) {
                    for (var dx: i32 = -1; dx <= 1; dx = dx + 1) {
                        value = max(value, alpha_before(x + dx, y + dy));
                    }
                }
                return value > 0.08;
            }

            fn alive_after(x: i32, y: i32) -> bool {
                var value = -1e9;
                for (var dy: i32 = -1; dy <= 1; dy = dy + 1) {
                    for (var dx: i32 = -1; dx <= 1; dx = dx + 1) {
                        value = max(value, alpha_after(x + dx, y + dy));
                    }
                }
                return value > 0.08;
            }

            @compute @workgroup_size(8, 8)
            fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
                if (gid.x >= WIDTH || gid.y >= HEIGHT) { return; }
                let x = i32(gid.x);
                let y = i32(gid.y);
                let dx = f32(gid.x) - damage.x;
                let dy = f32(gid.y) - damage.y;
                let is_damaged = damage.w > 0.5 && dx * dx + dy * dy <= damage.z * damage.z;
                let keep = alive_before(x, y) && alive_after(x, y) && !is_damaged;
                let cell = gid.y * WIDTH + gid.x;
                for (var c: u32 = 0u; c < CHANNELS; c = c + 1u) {
                    let index = c * CELLS + cell;
                    state_next[index] = select(0.0, proposal[index], keep);
                }
            }
        \`;

        const renderShader = \`
            const WIDTH: u32 = 72u;
            const HEIGHT: u32 = 48u;
            const CELLS: u32 = WIDTH * HEIGHT;

            @group(0) @binding(0) var<storage, read> state: array<f32>;
            @group(0) @binding(1) var<uniform> params: vec4<f32>;

            fn channel_at(channel: u32, x: i32, y: i32) -> f32 {
                let cx = clamp(x, 0, i32(WIDTH) - 1);
                let cy = clamp(y, 0, i32(HEIGHT) - 1);
                return state[channel * CELLS + u32(cy) * WIDTH + u32(cx)];
            }

            fn sample_channel(channel: u32, position: vec2<f32>) -> f32 {
                let base = vec2<i32>(floor(position));
                let fraction = fract(position);
                let top = mix(
                    channel_at(channel, base.x, base.y),
                    channel_at(channel, base.x + 1, base.y),
                    fraction.x
                );
                let bottom = mix(
                    channel_at(channel, base.x, base.y + 1),
                    channel_at(channel, base.x + 1, base.y + 1),
                    fraction.x
                );
                return mix(top, bottom, fraction.y);
            }

            @vertex
            fn vertex_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
                var positions = array<vec2<f32>, 3>(
                    vec2<f32>(-1.0, -1.0),
                    vec2<f32>(3.0, -1.0),
                    vec2<f32>(-1.0, 3.0)
                );
                return vec4<f32>(positions[vertex_index], 0.0, 1.0);
            }

            @fragment
            fn fragment_main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
                let uv = position.xy / params.xy;
                let grid = uv * vec2<f32>(f32(WIDTH - 1u), f32(HEIGHT - 1u));
                let gradient_x = sample_channel(3u, grid + vec2<f32>(1.0, 0.0))
                    - sample_channel(3u, grid - vec2<f32>(1.0, 0.0));
                let gradient_y = sample_channel(3u, grid + vec2<f32>(0.0, 1.0))
                    - sample_channel(3u, grid - vec2<f32>(0.0, 1.0));
                let edge = length(vec2<f32>(gradient_x, gradient_y)) * 2.2;
                let alive = clamp(sample_channel(3u, grid) * 2.0, 0.0, 1.0);
                let hidden = sample_channel(4u, grid);
                let groove = (1.0 / (1.0 + exp(6.0 * (hidden + 0.15)))) * alive;
                let intensity = clamp(edge + groove * 0.18, 0.0, 1.0);
                let dark_gold = vec3<f32>(218.0, 165.0, 32.0) / 255.0;
                let light_automaton = vec3<f32>(18.0, 73.0, 105.0) / 255.0;
                let color = select(light_automaton, dark_gold, params.z > 0.5);
                let alpha = intensity * params.w;
                return vec4<f32>(color * alpha, alpha);
            }
        \`;

        const makeStorageBuffer = function (values) {
            const buffer = device.createBuffer({
                size: Math.max(16, values.byteLength),
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            device.queue.writeBuffer(buffer, 0, values);
            return buffer;
        };

        const makeStateBuffer = function () {
            return device.createBuffer({
                size: stateByteSize,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
            });
        };

        const resizeCanvas = function () {
            const scale = Math.min(window.devicePixelRatio || 1, 1.25);
            const nextWidth = Math.max(320, Math.ceil(window.innerWidth * scale));
            const nextHeight = Math.max(240, Math.ceil(window.innerHeight * scale));
            if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
                canvas.width = nextWidth;
                canvas.height = nextHeight;
                context.configure({ device: device, format: format, alphaMode: 'premultiplied' });
            }
        };

        const isDark = function () {
            const value = getComputedStyle(document.body).backgroundColor;
            const match = value.match(/rgba?\\(([^)]+)\\)/);
            if (!match) return true;
            const values = match[1].split(',').slice(0, 3).map(Number);
            return values.reduce(function (sum, item) { return sum + item; }, 0) / 3 < 128;
        };

        const updateUniforms = function () {
            device.queue.writeBuffer(damageBuffer, 0, new Float32Array([
                pointer.x, pointer.y, 4.0, pointer.active ? 1.0 : 0.0
            ]));
            device.queue.writeBuffer(renderParamsBuffer, 0, new Float32Array([
                canvas.width, canvas.height, isDark() ? 1.0 : 0.0, isDark() ? 0.48 : 0.90
            ]));
            device.queue.writeBuffer(simParamsBuffer, 0, new Float32Array([
                steps, 0.5, 0.0, 0.0
            ]));
        };

        const step = function () {
            const startedAt = performance.now();
            resizeCanvas();
            updateUniforms();
            const nextState = currentState === 0 ? 1 : 0;
            const encoder = device.createCommandEncoder();

            const updatePass = encoder.beginComputePass();
            updatePass.setPipeline(updatePipeline);
            updatePass.setBindGroup(0, updateBindGroups[currentState]);
            updatePass.dispatchWorkgroups(Math.ceil(width / 8), Math.ceil(height / 8));
            updatePass.end();

            const maskPass = encoder.beginComputePass();
            maskPass.setPipeline(maskPipeline);
            maskPass.setBindGroup(0, maskBindGroups[currentState]);
            maskPass.dispatchWorkgroups(Math.ceil(width / 8), Math.ceil(height / 8));
            maskPass.end();

            const renderPass = encoder.beginRenderPass({
                colorAttachments: [{
                    view: context.getCurrentTexture().createView(),
                    clearValue: { r: 0, g: 0, b: 0, a: 0 },
                    loadOp: 'clear',
                    storeOp: 'store'
                }]
            });
            renderPass.setPipeline(renderPipeline);
            renderPass.setBindGroup(0, renderBindGroups[nextState]);
            renderPass.draw(3);
            renderPass.end();

            device.queue.submit([encoder.finish()]);
            currentState = nextState;
            steps += 1;
            lastInferenceMs = performance.now() - startedAt;
        };

        const loop = function (now) {
            if (stopped) {
                return;
            }
            if (document.hidden) {
                lastFrameAt = now;
                window.requestAnimationFrame(loop);
                return;
            }
            if (!lastFrameAt || now - lastFrameAt >= 33) {
                step();
                lastFrameAt = now;
            }
            if (reducedMotion && steps >= 128) return;
            window.requestAnimationFrame(loop);
        };

        const setPointer = function (event, immediate) {
            if (event.pointerType === 'touch' && !immediate) return;
            pointer.clientX = event.clientX;
            pointer.clientY = event.clientY;
            pointer.x = event.clientX / window.innerWidth * width;
            pointer.y = event.clientY / window.innerHeight * height;
            pointer.active = true;
        };

        window.addEventListener('pointermove', function (event) { setPointer(event, false); }, { passive: true });
        window.addEventListener('pointerdown', function (event) { setPointer(event, true); }, { passive: true });
        window.addEventListener('pointerup', function (event) {
            if (event.pointerType === 'touch') pointer.active = false;
        }, { passive: true });
        document.documentElement.addEventListener('mouseleave', function () { pointer.active = false; });
        window.addEventListener('blur', function () { pointer.active = false; });

        const alphaAt = async function (x, y, radius) {
            const encoder = device.createCommandEncoder();
            encoder.copyBufferToBuffer(stateBuffers[currentState], 0, readbackBuffer, 0, stateByteSize);
            device.queue.submit([encoder.finish()]);
            await readbackBuffer.mapAsync(GPUMapMode.READ);
            const values = new Float32Array(readbackBuffer.getMappedRange().slice(0));
            readbackBuffer.unmap();
            let total = 0;
            let count = 0;
            for (let yy = Math.max(0, y - radius); yy <= Math.min(height - 1, y + radius); yy += 1) {
                for (let xx = Math.max(0, x - radius); xx <= Math.min(width - 1, x + radius); xx += 1) {
                    total += Math.max(0, values[3 * cellCount + yy * width + xx]);
                    count += 1;
                }
            }
            return count ? total / count : 0;
        };

        const initialize = async function () {
            const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
            if (!adapter) throw new Error('No WebGPU adapter');
            device = await adapter.requestDevice();
            device.lost.then(function () {
                stopped = true;
                label.innerHTML = '<strong>Neural Background Stopped</strong>The Page Still Works Without It';
            });
            context = canvas.getContext('webgpu');
            format = navigator.gpu.getPreferredCanvasFormat();

            const weightsResponse = await fetch('/kautuhal-nca.weights.bin');
            if (!weightsResponse.ok) throw new Error('Weights unavailable');
            const weights = new Float32Array(await weightsResponse.arrayBuffer());
            if (weights.length !== 2940) throw new Error('Unexpected weight count');
            const w1 = weights.slice(0, 2304);
            const b1 = weights.slice(2304, 2352);
            const w2 = weights.slice(2352, 2928);
            const b2 = weights.slice(2928, 2940);

            const stateA = makeStateBuffer();
            const stateB = makeStateBuffer();
            const proposal = makeStateBuffer();
            stateBuffers = [stateA, stateB];
            const seed = new Float32Array(stateFloatCount);
            seed[3 * cellCount + 24 * width + 62] = 1;
            seed[4 * cellCount + 24 * width + 62] = 1;
            device.queue.writeBuffer(stateA, 0, seed);
            device.queue.writeBuffer(stateB, 0, seed);

            const w1Buffer = makeStorageBuffer(w1);
            const b1Buffer = makeStorageBuffer(b1);
            const w2Buffer = makeStorageBuffer(w2);
            const b2Buffer = makeStorageBuffer(b2);
            damageBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
            renderParamsBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
            simParamsBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
            readbackBuffer = device.createBuffer({ size: stateByteSize, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });

            updatePipeline = device.createComputePipeline({
                layout: 'auto',
                compute: { module: device.createShaderModule({ code: updateShader }), entryPoint: 'main' }
            });
            maskPipeline = device.createComputePipeline({
                layout: 'auto',
                compute: { module: device.createShaderModule({ code: maskShader }), entryPoint: 'main' }
            });
            renderPipeline = device.createRenderPipeline({
                layout: 'auto',
                vertex: { module: device.createShaderModule({ code: renderShader }), entryPoint: 'vertex_main' },
                fragment: {
                    module: device.createShaderModule({ code: renderShader }),
                    entryPoint: 'fragment_main',
                    targets: [{
                        format: format,
                        blend: {
                            color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
                        }
                    }]
                },
                primitive: { topology: 'triangle-list' }
            });

            const makeUpdateGroup = function (stateBuffer) {
                return device.createBindGroup({
                    layout: updatePipeline.getBindGroupLayout(0),
                    entries: [
                        { binding: 0, resource: { buffer: stateBuffer } },
                        { binding: 1, resource: { buffer: proposal } },
                        { binding: 2, resource: { buffer: w1Buffer } },
                        { binding: 3, resource: { buffer: b1Buffer } },
                        { binding: 4, resource: { buffer: w2Buffer } },
                        { binding: 5, resource: { buffer: b2Buffer } },
                        { binding: 6, resource: { buffer: simParamsBuffer } }
                    ]
                });
            };
            const makeMaskGroup = function (stateBuffer, nextBuffer) {
                return device.createBindGroup({
                    layout: maskPipeline.getBindGroupLayout(0),
                    entries: [
                        { binding: 0, resource: { buffer: stateBuffer } },
                        { binding: 1, resource: { buffer: proposal } },
                        { binding: 2, resource: { buffer: nextBuffer } },
                        { binding: 3, resource: { buffer: damageBuffer } }
                    ]
                });
            };
            const makeRenderGroup = function (stateBuffer) {
                return device.createBindGroup({
                    layout: renderPipeline.getBindGroupLayout(0),
                    entries: [
                        { binding: 0, resource: { buffer: stateBuffer } },
                        { binding: 1, resource: { buffer: renderParamsBuffer } }
                    ]
                });
            };

            updateBindGroups = [makeUpdateGroup(stateA), makeUpdateGroup(stateB)];
            maskBindGroups = [makeMaskGroup(stateA, stateB), makeMaskGroup(stateB, stateA)];
            renderBindGroups = [makeRenderGroup(stateA), makeRenderGroup(stateB)];
            resizeCanvas();
            label.innerHTML = '<strong>Circuit Coral NCA / 2,940 Parameters</strong>Hover to Obstruct · Branches Reroute';

            window.__kautuhalNca = {
                get status() { return stopped ? 'stopped' : 'running'; },
                get backend() { return 'raw-webgpu'; },
                get steps() { return steps; },
                get lastInferenceMs() { return lastInferenceMs; },
                get fireRate() { return 0.5; },
                get damageActive() { return pointer.active; },
                damageAt: function (x, y) { pointer.x = x; pointer.y = y; pointer.active = true; },
                clearDamage: function () { pointer.active = false; },
                alphaAt: alphaAt
            };
            window.requestAnimationFrame(loop);
        };

        initialize().catch(function () {
            stopped = true;
            label.innerHTML = '<strong>Neural Background Unavailable</strong>The Page Still Works Without It';
        });
    }());`;
}

function buildHomepageStructuredData() {
    return JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Person',
                name: AUTHOR_NAME,
                alternateName: AUTHOR_HANDLE,
                url: `${SITE_URL}/`,
                image: AUTHOR_IMAGE_URL,
                sameAs: [
                    `https://github.com/${AUTHOR_HANDLE}`,
                    `https://huggingface.co/${AUTHOR_HANDLE}`,
                    `https://x.com/${AUTHOR_HANDLE}`
                ],
                jobTitle: 'ML researcher'
            },
            {
                '@type': 'WebSite',
                name: HOMEPAGE_TITLE,
                url: `${SITE_URL}/`,
                author: {
                    '@type': 'Person',
                    name: AUTHOR_NAME
                }
            }
        ]
    });
}

function buildHomepageHtml() {
    const homepageHero = buildHomepageHeroHtml();
    const homepageStructuredData = buildHomepageStructuredData();
    const portraitAlt = `Portrait of ${AUTHOR_NAME}`;

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(HOMEPAGE_TITLE)}</title>
    <meta name="description" content="${escapeHtml(HOMEPAGE_DESCRIPTION)}">
    <meta name="author" content="${escapeHtml(AUTHOR_NAME)}">
    <meta name="robots" content="index,follow,max-image-preview:large">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="tokenbender">
    <meta property="og:title" content="${escapeHtml(HOMEPAGE_TITLE)}">
    <meta property="og:description" content="${escapeHtml(HOMEPAGE_DESCRIPTION)}">
    <meta property="og:url" content="${SITE_URL}/">
    <meta property="og:image" content="${escapeHtml(AUTHOR_IMAGE_URL)}">
    <meta property="og:image:alt" content="${escapeHtml(portraitAlt)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(HOMEPAGE_TITLE)}">
    <meta name="twitter:description" content="${escapeHtml(HOMEPAGE_DESCRIPTION)}">
    <meta name="twitter:image" content="${escapeHtml(AUTHOR_IMAGE_URL)}">
    <link rel="canonical" href="${SITE_URL}/">
    ${FAVICON_LINKS}
    <script>${buildThemeBootstrapScript()}</script>
    <link rel="stylesheet" href="${STYLE_HREF}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/katex.min.css">
    <script type="application/ld+json">${homepageStructuredData}</script>
</head>
<body class="home-page">
    <canvas id="kautuhal-neural-background" width="288" height="192" aria-hidden="true"></canvas>
    <header>
        <nav>
            <div class="nav-container">
                <a href="./" class="logo">tokenbender</a>
                <div class="nav-links">
                    ${buildPrimaryNavigation('writing')}
                </div>
            </div>
        </nav>
        ${buildPressIssueRule('Kautuhal / Authored Work', 'Research · Experiments · Working Theories')}
    </header>

    <main class="container">
        ${homepageHero}
    </main>

    <footer>
        <p>&copy; 2026 tokenbender. Kautuhal is the authored edge of the garden.</p>
    </footer>

    <script>${buildThemeToggleScript()}</script>
    <script>${buildKautuhalRawWebGpuScript()}</script>
</body>
</html>
`;
}

function buildSitemap(posts) {
    const urls = [
        `${SITE_URL}/`,
        `${SITE_URL}/index.html`,
        `${SITE_URL}/posts/`,
        `${SITE_URL}/archive/`,
        `${SITE_URL}/kalpataru/`,
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
    const postFiles = await resolvePostFiles();

    await fs.mkdir(POSTS_DIR, { recursive: true });
    await fs.mkdir(ARCHIVE_DIR, { recursive: true });

    const posts = [];

    for (const fileName of postFiles) {
        const filePath = path.join(POSTS_DIR, fileName);
        const raw = await fs.readFile(filePath, 'utf8');
        const { metadata, content } = parseFrontmatter(raw);
        const id = fileName.replace(/\.md$/, '');

        const { contentWithoutFootnotes, footnotes } = extractFootnotes(content);
        let html = marked.parse(contentWithoutFootnotes);
        html = replaceFootnoteReferences(marked, html, footnotes, id);
        html = html.replace(/^(\s*)<p><em>/, '$1<p class="post-deck"><em>');
        html = html.replace(/<p>(By [^<]+)<\/p>/, '<p class="post-byline">$1</p>');

        const headingResult = addHeadingIdsAndCollect(html);
        const plain = stripMarkdown(contentWithoutFootnotes);

        posts.push({
            id,
            metadata,
            content: contentWithoutFootnotes,
            plain,
            html: headingResult.html,
            headings: headingResult.headings,
            category: normalizeCategory(metadata.category),
            tags: normalizeTags(metadata.tags),
            status: normalizeStatus(metadata.status),
            relatedIds: normalizeRelated(metadata.related),
            readingTimeMinutes: estimateReadingTimeMinutes(plain),
            relatedPosts: []
        });
    }

    posts.sort((left, right) => new Date(right.metadata.date) - new Date(left.metadata.date));
    const publishedPosts = posts.filter(isPublishedPost);

    posts.forEach((post) => {
        post.relatedPosts = selectRelatedPosts(publishedPosts, post, 3);
    });

    for (const post of posts) {
        const outDir = path.join(POSTS_DIR, post.id);
        await fs.mkdir(outDir, { recursive: true });
        await fs.writeFile(path.join(outDir, 'index.html'), buildPostHtml(post), 'utf8');
    }

    const archiveHtml = buildArchiveHtml(publishedPosts, 'archive');
    const writingIndexHtml = buildArchiveHtml(publishedPosts, 'writing');
    await fs.writeFile(path.join(ARCHIVE_DIR, 'index.html'), archiveHtml, 'utf8');
    await fs.writeFile(path.join(POSTS_DIR, 'index.html'), writingIndexHtml, 'utf8');
    await fs.writeFile(path.join(ROOT, 'index.html'), buildHomepageHtml(), 'utf8');
    await fs.writeFile(SITEMAP_FILE, buildSitemap(publishedPosts), 'utf8');

    console.log(`generated ${posts.length} static posts, archive, homepage, and sitemap`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
