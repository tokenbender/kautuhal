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
        postCard.innerHTML = `
            <div class="post-date">${formatDate(post.date)}</div>
            <h3><a href="post.html?id=${post.id}">${post.title}</a></h3>
            <p class="post-excerpt">${post.excerpt}</p>
        `;
        postList.appendChild(postCard);
    });
}

// format date
function formatDate(dateString) {
    const date = new Date(dateString);
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
    
    try {
        const response = await fetch(`./posts/${postId}.md`);
        const markdown = await response.text();
        const { metadata, content } = parseFrontmatter(markdown);
        
        const html = marked.parse(content);
        
        const postContent = document.getElementById('post-content');
        postContent.innerHTML = `
            <div class="post-date">${formatDate(metadata.date || new Date().toISOString().split('t')[0])}</div>
            <h1>${metadata.title || 'untitled'}</h1>
            ${html}
        `;
        
        // update page title
        document.title = `${metadata.title || 'untitled'} - tokenbender`;
        
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