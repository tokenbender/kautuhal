# Kautuhal - Developer Blog

## Commands
- **Dev server**: `python3 serve.py` (runs on http://localhost:8000)
- **No build/test commands** - vanilla HTML/CSS/JS project

## Architecture
- **Type**: Static blog site with vanilla frontend
- **Structure**: Single-page app with dynamic post loading
- **Posts**: Markdown files in `/posts/` with YAML frontmatter, listed in `posts.json`
- **Dependencies**: CDN libraries (marked.js, Prism.js, KaTeX)
- **Routing**: Client-side via URL params (`post.html?id=postname`)

## Code Style
- **Naming**: camelCase for JS functions/variables, kebab-case for HTML/CSS
- **Indentation**: 4 spaces for all files
- **CSS**: CSS custom properties (variables), mobile-first responsive design
- **JS**: Modern ES6+ syntax, async/await for API calls
- **Posts**: Markdown with YAML frontmatter (title, date, excerpt required)
- **Colors**: Dark theme with sepia/amber accent (#daa520)
- **Typography**: JetBrains Mono for code, Inter for body text
- **File structure**: Keep flat - no complex nesting

## Working Preferences
- **Communication**: Keep responses concise and direct, avoid unnecessary explanations
- **Git workflow**: Push frequently but wait for explicit "push" command from user
- **Content style**: Clean, professional formatting; avoid excessive bold text
- **Blog posts**: Use lowercase for internal references, proper case for published titles
- **Dates**: Always use current/relevant dates in frontmatter (user will specify)
- **New posts**: Remember to update `posts/posts.json` when adding new posts
- **Formatting**: Prefer `-` bullets over `*`, clean paragraph spacing, proper code blocks
- **Iterations**: User likes to refine content through multiple passes - expect revisions
