---
title: How I Bring the Best Out of Claude Code — Part 1
date: 2025-06-15
excerpt: A comprehensive guide to effective Claude Code usage, context management, and building local multi-agent systems.
tags: claude-code, ai-tooling, developer-workflow
status: evergreen
category: technical
---

## 1. Setup Requirements

You need a set of requirements, preferably issues in a repo. Take the requirement URL and download and save it into an `issues/` folder or have GitHub integration with Claude Code. Then create a file like `<issue_no>.md` or whatever you prefer.

> **Note:** Your requirements list is very crucial, and you should treat it like a wish list for work to be done.

The more vague you are in describing what you want, the higher the chance you won't get what you wanted. Ideally, your instructions should be as unambiguous as a program.

You also want to be aware of what is already known by the model.

## 2. Most Important Thing: Context Management

A common pattern:
```
[claude code] --> [todo list]
               (fresh context)
```

Better approach:
```
well-formalized --> issues/<issue_no>.md (plan)
                --> docs/plan_<issue_no>.md (issue requirement)
```

This `plan_<issue_no>.md` serves as Claude's context. The `todo.md` is essentially exactly the same as your to-do list.

> The todo list is nice, but as you consume things in longer context in Claude Code, it becomes hard to keep up. So we store it inside the `todo.md`.

## 3. Parallel Claude Code Usage

If you're using multiple Claude Code windows in parallel, assign each one an issue and its corresponding docs, todos, and requirements. This way, everything is tracked automatically.

Currently, I don't use Claude Code in parallel much because it tends to create new files for everything, prompt to edit existing files directly, and update code based on outdated or flawed understanding.

That's why I often ask it to detail its plan so I can do smell checks and question intentions like *"oh, you were aiming to do xyz. Then why modify abc?"*

Additionally, Claude might start running commands unknowingly and fill context with needless output tokens.

> I avoid this by running it manually myself, providing a snippet of the error so it can best debug it.

## 4. Execution Strategy

Once you're going through each item, do it step by step while enforcing quality standards. You decide how frequently to execute and ensure there are no blindspots.

> Personally, I avoid diving into thousands of LoC I haven't written or understood.

## 5. Iteration and Updating Context

As I implement and ensure smooth execution, I iterate with errors and debug, then go back and update crucial observations in the planning docs.

> This allows the model to build a better understanding of the issue and what is already known.

## 6. Working Compactly

In an ideal world, you work on one issue end-to-end in one session.

But usually, context fills out faster and faster. You'll find yourself using "compact" more often.

If you ever run out of context during execution, Claude auto-compacts or asks you to go back to a previous node.

> This is useful when I see a model ignoring feedback and going in loops. In such cases, I jump to a clean node where I was satisfied, compact, generate a summary, and start fresh.

## 7. Integrating Claude Code into Tooling

Now that the Claude Code SDK exists, you can add it to your tools.

I've been using it in shell scripts and proto files. My protocols reflect opinionated views of deep research methodologies and how I debug or visit the ecosystem.

For instance, my ecosystem has `issues/` and `todo.md` folders. I use a shell script to invoke tasks in specific ways and let Claude interact with other Claude instances.

> Essentially, I'm building a local multi-agent system of my own.

## 8. Final Thoughts

What are these systems? What protocols are being enforced? How is multi-agent design different? What gives it an edge over standard usage?

These are things I'd like to cover in part 2.

---

Until then, be well everyone!
