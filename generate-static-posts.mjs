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
const MARKED_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js';
const AVERAGE_READING_WPM = 220;
const CATEGORY_ORDER = ['research', 'technical', 'personal'];
const CATEGORY_LABELS = {
    research: 'research',
    technical: 'technical',
    personal: 'personal',
    uncategorized: 'other'
};

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
        parts.push(`<span class="post-status">${escapeHtml(post.status)}</span>`);
    }

    if (post.tags.length) {
        const tagLinks = post.tags
            .map((tag) => `<span class="post-tag">${escapeHtml(tag)}</span>`)
            .join('');

        parts.push('<span class="meta-sep">·</span>');
        parts.push(`<span class="post-tags">${tagLinks}</span>`);
    }

    return `<div class="post-meta">${parts.join('')}</div>`;
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

    const nav = `<nav class="post-toc-inner" aria-label="table of contents"><h2>contents</h2><ol>${items}</ol></nav>`;

    return {
        desktop: `<aside class="post-toc">${nav}</aside>`,
        mobile: `<details class="post-toc-mobile"><summary>contents</summary>${nav}</details>`
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

    return `<section class="related-posts" aria-labelledby="related-posts-heading"><h2 id="related-posts-heading">see also</h2><ul>${items}</ul></section>`;
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

function buildHomepageGroupedSections(posts) {
    const groups = getOrderedCategoryGroups(posts);

    return groups.map((group) => {
        const cards = group.posts.slice(0, 3).map((post) => {
            const title = post.metadata.title || post.id;
            const excerpt = truncateText(post.metadata.excerpt || post.plain, 180);
            return `<article class="post-card"><div class="post-date">${escapeHtml(formatDate(post.metadata.date || ''))}</div><h3><a href="/posts/${encodeURIComponent(post.id)}/">${escapeHtml(title)}</a></h3><p class="post-excerpt">${escapeHtml(excerpt)}</p></article>`;
        }).join('');

        return `<section class="category-group" id="home-${group.key}"><div class="category-group-head"><h2>${escapeHtml(group.label)}</h2><a class="see-all-link" href="/archive/#${group.key}">see all -></a></div><div class="category-post-list">${cards}</div></section>`;
    }).join('');
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
                    <a href="/archive/">archive</a>
                    <a href="https://github.com/tokenbender" target="_blank" rel="noopener">github</a>
                    <button type="button" class="theme-toggle" data-theme-toggle aria-label="switch theme">light</button>
                </div>
            </div>
        </nav>
    </header>

    <main class="post-layout">
        ${toc.desktop}
        <article class="post-content" id="post-content">
            <h1>${escapeHtml(title)}</h1>
            ${buildPostMeta(post)}
            ${toc.mobile}
            ${post.html}
            ${relatedSection}
        </article>
        <aside class="post-margin-column" aria-hidden="true"></aside>
    </main>

    <footer>
        <p>for updates and random thoughts, follow <a href="https://x.com/tokenbender" target="_blank" rel="noopener">@tokenbender</a>.</p>
    </footer>

    <script>${buildThemeToggleScript()}</script>
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

function buildArchiveHtml(posts) {
    const topicSections = buildArchiveTopicSections(posts);
    const dateSections = buildArchiveDateSections(posts);

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>archive - tokenbender</title>
    <meta name="description" content="Browse posts by topic or timeline on tokenbender.">
    <meta name="robots" content="index,follow,max-image-preview:large">
    <link rel="canonical" href="${SITE_URL}/archive/">
    <script>${buildThemeBootstrapScript()}</script>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header>
        <nav>
            <div class="nav-container">
                <a href="/index.html" class="logo">tokenbender</a>
                <div class="nav-links">
                    <a href="/archive/">archive</a>
                    <a href="https://github.com/tokenbender" target="_blank" rel="noopener">github</a>
                    <button type="button" class="theme-toggle" data-theme-toggle aria-label="switch theme">light</button>
                </div>
            </div>
        </nav>
    </header>

    <main class="container archive-page">
        <section class="archive-hero">
            <h1>archive</h1>
            <p>browse by topic or date.</p>
        </section>

        <div class="archive-view-switcher" aria-label="archive view">
            <button type="button" class="archive-view-toggle is-active" data-archive-view-toggle="topic" aria-pressed="true">[by topic]</button>
            <button type="button" class="archive-view-toggle" data-archive-view-toggle="date" aria-pressed="false">[by date]</button>
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

function buildHomepageHtml(posts) {
    const groupedSections = buildHomepageGroupedSections(posts);

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
                    <a href="/archive/">archive</a>
                    <a href="https://github.com/tokenbender" target="_blank">github</a>
                    <button type="button" class="theme-toggle" data-theme-toggle aria-label="switch theme">light</button>
                </div>
            </div>
        </nav>
    </header>

    <main class="container">
        <section class="hero">
            <h1>hi, i'm tokenbender</h1>
            <p class="subtitle">research, technical notes, and personal frameworks.</p>
        </section>

        <section class="posts grouped-posts">${groupedSections}</section>
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
        `${SITE_URL}/archive/`,
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

    posts.forEach((post) => {
        post.relatedPosts = selectRelatedPosts(posts, post, 3);
    });

    for (const post of posts) {
        const outDir = path.join(POSTS_DIR, post.id);
        await fs.mkdir(outDir, { recursive: true });
        await fs.writeFile(path.join(outDir, 'index.html'), buildPostHtml(post), 'utf8');
    }

    const archiveHtml = buildArchiveHtml(posts);
    await fs.writeFile(path.join(ARCHIVE_DIR, 'index.html'), archiveHtml, 'utf8');
    await fs.writeFile(path.join(POSTS_DIR, 'index.html'), archiveHtml, 'utf8');
    await fs.writeFile(path.join(ROOT, 'index.html'), buildHomepageHtml(posts), 'utf8');
    await fs.writeFile(SITEMAP_FILE, buildSitemap(posts), 'utf8');

    console.log(`generated ${posts.length} static posts, archive, homepage, and sitemap`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
