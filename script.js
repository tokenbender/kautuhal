// configure marked for markdown rendering
marked.setOptions({
    highlight: function(code, lang) {
        if (Prism.languages[lang]) {
            return Prism.highlight(code, Prism.languages[lang], lang);
        }
        return code;
    },
    breaks: true,
    gfm: true
});

// parse frontmatter from markdown
function parseFrontmatter(markdown) {
    console.log('parseFrontmatter called with:', markdown.substring(0, 50) + '...');
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = markdown.match(frontmatterRegex);
    console.log('Regex match result:', match ? 'MATCHED' : 'NO MATCH');
    
    if (!match) {
        return { metadata: {}, content: markdown };
    }
    
    const metadata = {};
    const frontmatter = match[1];
    const content = match[2];
    
    // parse yaml-like frontmatter
    frontmatter.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
            const value = valueParts.join(':').trim();
            metadata[key.trim()] = value.replace(/^["']|["']$/g, '');
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

function setMetaTag(kind, key, content) {
    if (!content) {
        return;
    }

    let tag = document.head.querySelector(`meta[${kind}="${key}"]`);
    if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(kind, key);
        document.head.appendChild(tag);
    }

    tag.setAttribute('content', content);
}

function toIsoDate(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString();
}

function updatePostMetadata(postId, metadata, content) {
    const title = metadata.title || 'untitled';
    const plainContent = stripMarkdown(content);
    const rawDescription = metadata.excerpt || plainContent;
    const description = truncateText(rawDescription, 180);
    const canonicalUrl = `${window.location.origin}/posts/${encodeURIComponent(postId)}/`;

    document.title = `${title} - tokenbender`;

    const canonicalLink = document.getElementById('canonical-link');
    if (canonicalLink) {
        canonicalLink.setAttribute('href', canonicalUrl);
    }

    setMetaTag('name', 'description', description);
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);

    const isoDate = toIsoDate(metadata.date);
    if (isoDate) {
        setMetaTag('property', 'article:published_time', isoDate);
    }

    const structuredDataTag = document.getElementById('article-structured-data');
    if (structuredDataTag) {
        const schema = {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: title,
            description,
            author: {
                '@type': 'Person',
                name: 'tokenbender'
            },
            publisher: {
                '@type': 'Person',
                name: 'tokenbender'
            },
            url: canonicalUrl,
            mainEntityOfPage: {
                '@type': 'WebPage',
                '@id': canonicalUrl
            }
        };

        if (isoDate) {
            schema.datePublished = isoDate;
            schema.dateModified = isoDate;
        }

        structuredDataTag.textContent = JSON.stringify(schema);
    }
}

// load all posts from posts.json
async function loadPosts() {
    console.log('=== STARTING loadPosts() ===');
    try {
        const response = await fetch('./posts/posts.json');
        const postFiles = await response.json();
        console.log('Posts JSON loaded:', postFiles);
        
        const posts = [];
        
        for (const file of postFiles) {
            console.log(`\n--- Processing ${file} ---`);
            const postResponse = await fetch(`./posts/${file}`);
            console.log(`Fetch response status: ${postResponse.status}`);
            const markdown = await postResponse.text();
            console.log(`Markdown length: ${markdown.length} chars`);
            console.log(`First 100 chars: ${markdown.substring(0, 100)}`);
            const { metadata, content } = parseFrontmatter(markdown);
            console.log('Parsed metadata:', JSON.stringify(metadata));
            
            console.log('checking metadata:', metadata, 'has title?', !!metadata.title, 'has date?', !!metadata.date);
            if (metadata.title && metadata.date) {
                const id = file.replace('.md', '');
                const firstParagraph = content.split('\n\n')[0].replace(/[#*`]/g, '');
                const excerpt = metadata.excerpt || firstParagraph.substring(0, 150) + '...';
                
                posts.push({
                    id,
                    title: metadata.title,
                    date: metadata.date,
                    excerpt,
                    file: `posts/${file}`
                });
            } else {
                console.error(`Skipping ${file}: missing title or date`, metadata);
            }
        }
        
        // sort posts by date (newest first)
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        console.log('Final sorted posts:', posts);
        
        console.log(`\n=== FINAL POSTS ARRAY (${posts.length} posts) ===`);
        console.log(posts);
        return posts;
    } catch (error) {
        console.error('ERROR in loadPosts():', error);
        console.error('Stack trace:', error.stack);
        return [];
    }
}

// render latex in element
function renderMath(element) {
    renderMathInElement(element, {
        delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\(', right: '\\)', display: false},
            {left: '\\[', right: '\\]', display: true}
        ]
    });
}

// load and display posts on homepage
async function loadPostList() {
    console.log('\n=== loadPostList() called ===');
    const postList = document.getElementById('post-list');
    console.log('post-list element found:', !!postList);
    if (!postList) return;
    
    const posts = await loadPosts();
    if (posts.length === 0) {
        postList.innerHTML = '<p>No posts found. Check console for errors.</p>';
    }

    posts.forEach(post => {
        const postCard = document.createElement('div');
        postCard.className = 'post-card';
        const safeTitle = escapeHtml(post.title);
        const safeExcerpt = escapeHtml(post.excerpt);
        const safeId = encodeURIComponent(post.id);
        postCard.innerHTML = `
            <div class="post-date">${formatDate(post.date)}</div>
            <h3><a href="/posts/${safeId}/">${safeTitle}</a></h3>
            <p class="post-excerpt">${safeExcerpt}</p>
        `;
        postList.appendChild(postCard);
    });
}

// format date
function formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString('en-us', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// load individual post
async function loadPost() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    
    if (!postId) return;

    window.location.replace(`/posts/${encodeURIComponent(postId)}/`);
    return;
    
    try {
        const response = await fetch(`./posts/${encodeURIComponent(postId)}.md`);
        if (!response.ok) {
            throw new Error(`failed to load post: ${response.status}`);
        }

        const markdown = await response.text();
        const { metadata, content } = parseFrontmatter(markdown);
        
        const html = marked.parse(content);
        const safeTitle = escapeHtml(metadata.title || 'untitled');
        const displayDate = metadata.date || new Date().toISOString().split('T')[0];
        
        const postContent = document.getElementById('post-content');
        postContent.innerHTML = `
            <div class="post-date">${formatDate(displayDate)}</div>
            <h1>${safeTitle}</h1>
            ${html}
        `;

        updatePostMetadata(postId, metadata, content);
        
        // render math
        renderMath(postContent);
        
        // re-highlight code blocks
        Prism.highlightAllUnder(postContent);
        
    } catch (error) {
        console.error('error loading post:', error);
    }
}

// reading progress indicator
function updateReadingProgress() {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    
    const progressBar = document.querySelector('.reading-progress-bar');
    if (progressBar) {
        progressBar.style.width = scrolled + '%';
    }
}


// initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('post-list')) {
        loadPostList();
    }
    
    if (document.getElementById('post-content')) {
        loadPost();
        
        // add reading progress bar
        const progressDiv = document.createElement('div');
        progressDiv.className = 'reading-progress';
        progressDiv.innerHTML = '<div class="reading-progress-bar"></div>';
        document.body.appendChild(progressDiv);
        
        // update progress on scroll
        window.addEventListener('scroll', updateReadingProgress);
    }
});
