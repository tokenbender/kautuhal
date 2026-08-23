---
title: How I Bring the Best Out of Claude Code — Part 2
date: 2025-06-20
excerpt: Custom commands, multi-agent systems, and the protocols that made Claude Code actually useful.
tags: claude-code, ai-tooling, multi-agent-systems
status: evergreen
category: technical
---

Hello everyone!

In [part 1](/posts/how-i-bring-the-best-out-of-claude-code/), I covered the beginner's guide to Claude Code. Setup requirements. Context management. Basic workflows. The fundamentals you need to get started.

That was the shallow end of the pool.

This is the deep end. Intermediate techniques for people who've already hit the walls of vanilla Claude Code and always want just a little bit more.

![welcome to the future](/posts/images/deep-end-meme.jpg)

## 1. Integrating Claude Code into Tooling

In part 1, I mentioned building a local multi-agent system. Let me show you what that actually looks like.

Everything I'm about to show you comes from my [agent-guides](https://github.com/tokenbender/agent-guides) repository. It's all open source, ready to use.

## 2. What Are These Systems?

They're custom commands and tools that transform Claude Code from a chat interface into a cognitive prosthetic.

I built [agent-guides](https://github.com/tokenbender/agent-guides) because vanilla Claude Code kept failing me in predictable ways. Lost insights. Repeated work. Single-point failures.

> The more specific your tooling, the more powerful your workflow becomes. Everything I feel like doing multiple times as a prompt should be a command.

## 3. multi-mind: Solving the Hallucination Problem

Remember how models confidently tell you wrong things? Or how you are not sure if the model is being sycophantic? If only it could have opposing viewpoints.

[Multi-mind](https://github.com/tokenbender/agent-guides/blob/main/claude-commands/multi-mind.md) fixes that.

```
/multi-mind "find security vulnerabilities in our auth system"
```

This spawns 4-6 specialist subagents:
- Security analyst
- Edge case hunter
- Performance auditor
- API contract validator

Each works independently. Can't see each other's initial analysis. After they finish, they review each other's findings.

Here's a glimpse of how it assigns specialists:

```javascript
// from multi-mind.md
const specialistPrompts = {
    "Security Analyst": "Identify vulnerabilities, attack vectors...",
    "Edge Case Hunter": "Find boundary conditions, error states...",
    "Performance Auditor": "Analyze computational complexity...",
    "API Contract Validator": "Verify interface consistency..."
}
```

> Independent verification kills hallucinations. It caught a timing attack that single-agent analysis completely missed.

## 4. Conversation Search: Your Second Brain

I am quite chaotic in the way I work. Forever solving a problem and gleaming at 3am, then forgetting the solution or losing track of it in the sea of tasks that I pick up right after.

So I built [search-prompts](https://github.com/tokenbender/agent-guides/blob/main/claude-commands/search-prompts.md) to fix that.

You can search through your entire conversation history, exported JSON sessions, and current context.
You can use it in any way - to run analytics or to discover your preferences and have them reflected in your future commands.

```
/search-all "redis optimization"
```

Searches through:
- Sqlite conversation history
- Exported JSON sessions
- Current context

Here's what the command does behind the scenes:

```markdown
# from search-prompts.md
## Search Types:
1. **search-all**: Search across all conversation sources
2. **search-current**: Search only current session
3. **search-project**: Search project-specific conversations
4. **search-date**: Search by date range

Returns formatted results with:
- Timestamp and session ID
- Matching content preview
- Context around the match
```

> Your past conversations are a goldmine. Most people just let them rot or lose them. Why wait for Anthropic to fix it?

## 5. Session Paging: My Fav Infinite Context Hack

Claude's context fills up. Work gets lost.
Being originally from electrical background, I couldn't help but see the need of a paging equivalent mechanism in Claude Code.

Say no to context loss with [page command](https://github.com/tokenbender/agent-guides/blob/main/claude-commands/page.md).

```
/page "ml pipeline progress checkpoint 1"
```
It is designed to save everything you do in a session, preserving:
- Saves complete state
- Generates summaries
- Preserves citations
- Lets you pick up tomorrow exactly where you left off

Here's how it structures the saved session:

```markdown
# from page.md
## Session: ml pipeline progress checkpoint 1
### Summary
Key accomplishments and current state...

### Full History
[timestamp] User: original request...
[timestamp] Assistant: implementation details...

### Citations
- file1.py:42 - optimized batch processing
- file2.py:156 - added caching layer
```

```
claude --resume checkpoint-1
```

> Treat context like OS memory. Page out, page in, never lose work.

## 6. Deep Code Analysis That Thinks
While reviewing code, Claude can analyze it in depth, finding hidden complexity, edge cases, and optimization opportunities. I do not like simple explanations derived from docstrings and comments.

[Analyze-function](https://github.com/tokenbender/agent-guides/blob/main/claude-commands/analyze-function.md) goes beyond description.

```
/analyze-function "def batch_process(items, workers=4):"
```

Doesn't just describe code. It reasons:
- Line-by-line performance implications
- Hidden complexity (found o(n²) in "linear" code)
- Edge cases you missed
- Mathematical foundations

Here's the analysis pattern it follows:

```markdown
# from analyze-function.md
## Analysis Structure:
1. **Purpose & Context**: What this function solves
2. **Line-by-Line Breakdown**:
   - Line 3: O(n) operation, potential bottleneck
   - Line 7: Nested loop creates O(n²) complexity
3. **Edge Cases**: Empty input, single worker, overflow
4. **Performance Profile**: Time/Space complexity
5. **Optimization Opportunities**: Parallel processing, caching
```

Saved me from wasting several GPU hours on something which was a complete blindspot to me.

## 7. CRUD Commands: Build Your Own Commands
Famous saying : "teach a man to run commands, and you feed his curiosity for a day. Teach a man to build commands, and you feed him for a lifetime."

If you ever find yourself typing the same prompts over and over? Just don't.

That's exactly why I built [CRUD-claude-commands](https://github.com/tokenbender/agent-guides/blob/main/claude-commands/crud-claude-commands.md). By the time I wrote my third command, I was clear that I needed a meta-command system.

With yourself as the water that flows through the system. You can create, read, update, delete, and list commands. It allows you to build a library of reusable commands that fit your workflow.

### Create New Commands on the Fly
```
/crud-claude-commands create git-flow "automate git flow operations like creating feature branches, PRs, and merging"
```

Boom. Now you have a custom git-flow command tailored to your workflow.

### Read What a Command Does
```
/crud-claude-commands read git-flow
```

### Update When Your Needs Evolve
```
/crud-claude-commands update git-flow "enhanced git workflow with automatic PR creation and branch management"
```

### Delete Outdated Commands
```
/crud-claude-commands delete git-flow
```

### List Your Entire Arsenal
```
/crud-claude-commands list
```

Here's the magic - it generates standardized templates:

```markdown
# from crud-claude-commands output
## Command: git-flow
### Description
Automates git flow operations...

### Usage
/git-flow feature start my-feature
/git-flow pr create
/git-flow release finish

### Implementation
[detailed workflow steps...]
```

> Stop repeating yourself. If you do something twice, make it a command.

The real power? Rapid iteration. Prototype a command, test it, refine it, share it. Your personal command library grows organically with your needs.

## 8. The Workflow That Actually Works

### For Architecture Reviews:
```
/multi-mind "review our microservices for bottlenecks"
→ 5 specialists work in parallel
→ cross-pollination finds blind spots
→ /page "architecture-review-final"
```

### For Debugging:
```
/search-all "null pointer kubernetes"
→ find similar past issues
→ /analyze-function on suspect code
→ multi-mind verification of fix
```

### For Long Projects:
```
issue #142 → docs/plan_142.md
→ work until context fills
→ /page "issue-142-session-1"
→ resume seamlessly next day
```

### For Letting Claude Grow with Your Workflow:
```
/crud-claude-commands list
→ /page "command-library"
```

## 9. What Protocols Are Being Enforced?

> We want to put systems in place that accumulate knowledge bases, behavior trajectories, and preferences, and serve as a goldmine for future agents. We want to do things that snowball into something bigger.

**Single responses are hypotheses, not truth.**
always verify through multiple agents or past evidence.

**Every conversation builds lasting value.**
searchable, reusable, compounding knowledge.

**Small tools compose into powerful workflows.**
Unix philosophy for AI assistance.

**Context is precious. Manage it.**
page out before you lose work.

**Knowledge reuse is key.**
every conversation builds lasting value.

## 10. How Is Multi-agent Design Different?

**Error decorrelation**: agents make different mistakes. Consensus filters out individual errors.

**Specialist depth**: focused expertise beats generalist responses every time.

**Progressive refinement**: cross-pollination rounds systematically improve quality.

I personally say no more "Claude said so" disasters. Multiple independent verification or it didn't happen.

## 12. Setup Is Trivial

```bash
git clone https://github.com/tokenbender/agent-guides
cd agent-guides

# install commands in your project
mkdir -p /path/to/your/project/.claude/commands
cp -r claude-commands/* /path/to/your/project/.claude/commands/

# copy supporting scripts
cp -r scripts /path/to/your/project/.claude/scripts/
```

That's it. Now you have superpowers.

Want to see what commands you're getting? Peek at the [command directory](https://github.com/tokenbender/agent-guides/tree/main/claude-commands):

```
claude-commands/
├── multi-mind.md      # parallel specialist analysis
├── search-prompts.md  # conversation archaeology
├── page.md           # session state management
├── analyze-function.md # deep code reasoning
└── crud-claude-commands.md # dynamic command creation
```

## 13. The Philosophy

These aren't just tools. They're a different way of thinking about AI assistance.

- **Augment, don't replace**: enhance Claude's native abilities
- **Compose, don't monolith**: small tools that work together
- **Persist, don't repeat**: every interaction should create lasting value
- **Verify, don't trust**: multiple sources or it's probably wrong

> “People SHOULD be doubted. Many people misunderstand this concept. Doubting people is just a part of getting to know them. What many people call ‘trust’ is really just giving up on trying to understand others, and that very act is far worse than doubting. It is actually ‘apathy.”

― Shinobu Kaitani, Liar Game, Volume 4

## 14. What I'm Building Next

And for my final trick, I am building something to aid my experimentation and RL research in my main quest [avataRL](https://github.com/tokenbender/avataRL).
A complete auto-track changes, kick-off experiments, observe and auto-merge results system.

All of that and more in the next post.

---

Grab [agent-guides](https://github.com/tokenbender/agent-guides) and build your own cognitive prosthetics.

Until then, be well everyone.
