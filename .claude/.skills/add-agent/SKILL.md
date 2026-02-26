---
name: add-agent
description: This skill should be used when the user asks to "add an agent", "create a custom agent", "make an agent", "register an agent", "add a claude agent to this project", "set up a subagent", or wants to create and register a new Claude Code custom agent in the project's .claude/agents/ directory following the official format.
allowed-tools: Read, Write, Edit, Glob, Grep, AskUserQuestion, TodoWrite
---

# Add Custom Agent to Local Project

This skill guides the process of creating and registering a custom Claude Code agent in the current project at `.claude/agents/` following the official agent definition format.

## Overview

Agents (subagents) are specialized AI assistants that run in isolated contexts with their own tool access, model selection, and system prompts. Unlike skills (which inject instructions into the main conversation), agents operate as independent entities that Claude delegates work to via the Task tool.

### Agent vs Skill — When to Use Which

| Aspect | Agent | Skill |
|--------|-------|-------|
| Context | Isolated (own context window) | Shared (main conversation) |
| Tool access | Independently configured | Inherits or limited via `allowed-tools` |
| Invocation | Claude delegates via Task tool | Automatic or `/name` |
| Best for | Autonomous tasks, code review, research | Workflow guidance, templates, instructions |

## Agent Creation Workflow

### Step 1: Gather Requirements

Before creating an agent, clarify the following with the user:

1. **Agent name** — A kebab-case identifier (e.g., `code-reviewer`, `test-generator`, `doc-writer`)
2. **Purpose** — What the agent does and when Claude should delegate to it
3. **Persona** — What kind of expert the agent should embody
4. **Tools needed** — Which tools the agent requires (principle of least privilege)
5. **Model preference** — `inherit` (default), `sonnet`, `opus`, or `haiku`

If the user provides insufficient information, ask targeted questions. Avoid asking too many questions at once — maximum 3 per round.

### Step 2: Create Agent File

Create the agent markdown file at `.claude/agents/<agent-name>.md`.

The file consists of YAML frontmatter + markdown body (system prompt):

```markdown
---
name: agent-name
description: Concise description of when Claude should delegate to this agent
tools: Tool1, Tool2, Tool3
model: inherit
---

System prompt content here...
```

### Step 3: Write Frontmatter

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Kebab-case identifier (lowercase, hyphens, 3-50 chars) |
| `description` | string | When Claude should delegate to this agent |

#### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `tools` | string | All tools | Comma-separated list of allowed tools |
| `disallowedTools` | string | None | Tools to explicitly deny |
| `model` | string | `inherit` | `sonnet`, `opus`, `haiku`, or `inherit` |
| `maxTurns` | integer | None | Maximum agentic turns before stopping |
| `permissionMode` | string | `default` | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, or `plan` |
| `skills` | array | None | Skills to preload into agent context |
| `mcpServers` | object | None | MCP servers available to agent |
| `hooks` | object | None | Lifecycle hooks for this agent |
| `memory` | string | None | Persistent memory scope: `user`, `project`, or `local` |
| `background` | boolean | `false` | Always run in background |
| `isolation` | string | None | Set to `worktree` for isolated git worktree |

#### Tool Selection Guide

Select tools based on agent purpose following least privilege:

- **Read-only agents** (reviewers, analyzers): `Read, Glob, Grep, WebFetch, WebSearch`
- **Write agents** (generators, fixers): `Read, Edit, Write, Glob, Grep, Bash`
- **Research agents**: `Read, Glob, Grep, WebFetch, WebSearch, Bash`
- **Full-access agents**: Omit `tools` field to grant all tools

Available internal tools:
`Read`, `Write`, `Edit`, `Glob`, `Grep`, `Bash`, `WebFetch`, `WebSearch`, `Task`, `TodoWrite`, `NotebookEdit`, `AskUserQuestion`

#### Model Selection Guide

| Model | Best for |
|-------|----------|
| `inherit` | Use parent conversation's model (recommended default) |
| `haiku` | Fast, simple tasks — formatting, sorting, extraction |
| `sonnet` | Balanced — code review, generation, analysis |
| `opus` | Complex reasoning — architecture, debugging, research |

### Step 4: Write System Prompt (Body)

The markdown body after frontmatter becomes the agent's system prompt. Follow these patterns:

1. **Open with expert persona**: "You are a senior/expert [role] specializing in [domain]."
2. **Define core responsibilities**: Numbered list of what the agent does
3. **Describe process**: Step-by-step workflow the agent follows
4. **Set quality standards**: What "good output" looks like
5. **Specify output format**: How results should be structured
6. **Handle edge cases**: What to do when things go wrong

System prompt guidelines:
- Target 500–2,000 words
- Use imperative form ("Analyze the code", not "You should analyze")
- Be specific — include concrete examples, patterns, and criteria
- Reference project conventions from CLAUDE.md when relevant

### Step 5: Validate

Run through this checklist:
- [ ] `.claude/agents/<agent-name>.md` exists with valid YAML frontmatter
- [ ] `name` field is kebab-case (lowercase, hyphens, 3-50 chars)
- [ ] `description` field clearly states when to delegate
- [ ] `tools` field follows least privilege (or omitted for full access)
- [ ] System prompt has expert persona, responsibilities, process, and output format
- [ ] System prompt is 500–2,000 words
- [ ] No second person ("You should...") in system prompt — use imperative form

## Agent Patterns

### Read-Only Reviewer

```markdown
---
name: code-reviewer
description: Reviews code for bugs, security vulnerabilities, and quality issues
tools: Read, Glob, Grep
model: sonnet
---

You are an expert code reviewer...
```

### Code Generator

```markdown
---
name: test-generator
description: Generates comprehensive test suites for existing code
tools: Read, Write, Glob, Grep, Bash
model: sonnet
---

You are a testing specialist...
```

### Research Agent

```markdown
---
name: codebase-explorer
description: Deep analysis of codebase architecture and patterns
tools: Read, Glob, Grep, WebSearch, WebFetch
model: sonnet
---

You are a senior software architect...
```

### Background Worker

```markdown
---
name: lint-checker
description: Runs linting and reports issues in background
tools: Bash, Read, Glob
model: haiku
background: true
---

You are a code quality specialist...
```

### Agent with Memory

```markdown
---
name: project-mentor
description: Provides guidance using accumulated project knowledge
tools: Read, Glob, Grep, Write
memory: project
---

You are a project mentor with institutional knowledge...
```

## Quality Guidelines

### Description Best Practices

**Good:**
```yaml
description: Reviews code for bugs, logic errors, security vulnerabilities, and adherence to project conventions using confidence-based filtering
```

**Bad:**
```yaml
description: Use this for code stuff.
```

### System Prompt Structure

Follow this proven template:

```markdown
You are a [expert role] specializing in [domain].

## Core Responsibilities

1. [Primary task]
2. [Secondary task]
3. [Quality assurance]

## Process

**1. [First Phase]**
[What to do and how]

**2. [Second Phase]**
[What to do and how]

## Output Format

[How to structure results]

## Edge Cases

[What to do when things go wrong]
```

## Important Notes

1. **Agent files go in `.claude/agents/`** — not `.claude/.skills/` or `.claude/skills/`
2. **Agents are auto-discovered** — no need to register in `settings.json` (unlike skills)
3. **One file per agent** — each `.md` file in `.claude/agents/` defines one agent
4. **Agents run in isolation** — they have their own context window, separate from the main conversation
5. **Test after creation** — suggest the user trigger the agent to verify it works as expected

## Additional Resources

### Reference Files

For detailed guidance on agent frontmatter fields and advanced patterns:
- **`references/agent-structure.md`** — Complete agent anatomy, all frontmatter fields, and advanced configuration patterns
