# Agent Structure Reference

## File Format

Agent files are Markdown with YAML frontmatter, stored at `.claude/agents/<agent-name>.md`.

```
.claude/agents/
├── code-reviewer.md
├── test-generator.md
└── doc-writer.md
```

## Complete Frontmatter Reference

### Required Fields

```yaml
---
name: agent-name          # Kebab-case, 3-50 chars
description: When to use   # Clear delegation trigger
---
```

### All Available Fields

```yaml
---
name: agent-name
description: When Claude should delegate to this agent
tools: Read, Glob, Grep, Bash
disallowedTools: Write, Edit
model: sonnet
permissionMode: default
maxTurns: 10
skills:
  - api-conventions
  - error-handling
mcpServers:
  slack:
    command: npx
    args: ["-y", "@anthropic-ai/claude-mcp-slack"]
hooks:
  PreToolUse:
    - matcher: Bash
      hooks:
        - type: command
          command: echo "Bash about to run"
memory: user
background: false
isolation: worktree
color: blue
---
```

## Field Details

### name (string, required)

Unique identifier for the agent.

Rules:
- Lowercase letters, numbers, and hyphens only
- 3-50 characters
- Must be unique across project and user agents
- Descriptive of purpose (e.g., `code-reviewer`, not `agent-1`)

### description (string, required)

Tells Claude when to delegate tasks to this agent. Claude reads all agent descriptions to decide which agent to use.

Patterns:
- Start with action: "Reviews code for...", "Generates tests for...", "Analyzes architecture of..."
- Be specific about scope and capabilities
- Mention key domains or technologies if relevant

### tools (string, optional)

Comma-separated list of tools the agent can access. If omitted, agent has access to all tools.

Available tools:
- **File operations**: `Read`, `Write`, `Edit`, `Glob`, `Grep`
- **Execution**: `Bash`
- **Web**: `WebFetch`, `WebSearch`
- **Notebook**: `NotebookEdit`
- **Agent**: `Task` (can spawn sub-agents)
- **User interaction**: `AskUserQuestion`
- **Task management**: `TodoWrite`
- **MCP tools**: Any tools from configured MCP servers

### disallowedTools (string, optional)

Comma-separated list of tools to explicitly deny. Useful when granting broad access but restricting specific dangerous operations.

### model (string, optional)

Which Claude model the agent uses.

Values:
- `inherit` — Use the model from parent conversation (default)
- `sonnet` — Claude Sonnet (balanced speed/quality)
- `opus` — Claude Opus (highest quality)
- `haiku` — Claude Haiku (fastest, cheapest)

### permissionMode (string, optional)

How the agent handles tool permissions.

Values:
- `default` — Normal permission prompts
- `acceptEdits` — Auto-approve file edits, prompt for others
- `dontAsk` — Skip tools that need permission instead of asking
- `bypassPermissions` — Auto-approve everything (use with caution)
- `plan` — Read-only planning mode

### maxTurns (integer, optional)

Maximum number of API round-trips before the agent stops. Prevents runaway agents.

Recommendations:
- Simple tasks: 5-10 turns
- Medium tasks: 10-25 turns
- Complex tasks: 25-50 turns
- Omit for no limit

### skills (array, optional)

List of skill names to preload into the agent's context. The full content of these skills is injected into the agent's system prompt.

```yaml
skills:
  - api-conventions
  - error-handling
```

### mcpServers (object, optional)

MCP (Model Context Protocol) servers available to this agent.

```yaml
mcpServers:
  server-name:
    command: npx
    args: ["-y", "package-name"]
    env:
      API_KEY: "${API_KEY}"
```

### hooks (object, optional)

Lifecycle hooks that run shell commands at specific points.

```yaml
hooks:
  PreToolUse:
    - matcher: Bash
      hooks:
        - type: command
          command: "echo 'About to run bash'"
  PostToolUse:
    - matcher: Write
      hooks:
        - type: command
          command: "echo 'File written'"
```

### memory (string, optional)

Enable persistent memory that survives across sessions.

Values:
- `user` — Memory stored per-user
- `project` — Memory stored per-project
- `local` — Memory stored locally

### background (boolean, optional)

If `true`, agent always runs in background. User is notified when it completes. Default: `false`.

### isolation (string, optional)

Set to `worktree` to run agent in an isolated git worktree. Useful for agents that make experimental changes.

### color (string, optional)

Display color for the agent in UI.

Values: `blue`, `cyan`, `green`, `yellow`, `red`, `magenta`

Color conventions:
- `blue`/`cyan` — Analysis, review, research
- `green` — Generation, creation
- `yellow` — Validation, caution
- `red` — Security, critical operations
- `magenta` — Transformation, creative tasks

## Agent Discovery

Agents are automatically discovered from:
1. `.claude/agents/` — Project-level agents (highest priority)
2. `~/.claude/agents/` — User-level agents (all projects)
3. Plugin `agents/` directories — Plugin-provided agents

No registration in `settings.json` is needed. Simply placing an `.md` file in the agents directory makes it available.

## System Prompt Best Practices

### Structure Template

```markdown
You are a [expert role] specializing in [domain]. Your primary responsibility is to [core task].

## Core Responsibilities

1. **[Area 1]**: [What and how]
2. **[Area 2]**: [What and how]
3. **[Area 3]**: [What and how]

## Process

**1. [Phase Name]**
[Detailed steps for this phase]

**2. [Phase Name]**
[Detailed steps for this phase]

## Quality Standards

- [Standard 1]
- [Standard 2]
- [Standard 3]

## Output Format

[How to structure results — what sections, what format]

## Edge Cases

- [Scenario]: [How to handle]
- [Scenario]: [How to handle]
```

### Writing Rules

- Use imperative form: "Analyze the code" not "You should analyze"
- Be specific: include concrete criteria, patterns, thresholds
- Target 500-2,000 words for system prompt
- Reference CLAUDE.md for project-specific conventions
- Include output format expectations

### Anti-Patterns

- Vague instructions: "Review the code and find issues"
- Too broad scope: "Handle everything about testing"
- No output format: Agent returns unstructured results
- Missing edge cases: Agent fails on unexpected input

## Example: Complete Agent File

```markdown
---
name: api-reviewer
description: Reviews API endpoint implementations for RESTful conventions, error handling, input validation, and security best practices
tools: Read, Glob, Grep
model: sonnet
color: cyan
---

You are a senior API architect specializing in RESTful API design and security. Your primary responsibility is to review API endpoint implementations for correctness, security, and adherence to REST conventions.

## Core Responsibilities

1. **RESTful Convention Compliance**: Verify proper HTTP methods, status codes, URL patterns, and response formats
2. **Input Validation**: Check that all user inputs are validated and sanitized before processing
3. **Error Handling**: Ensure consistent error response format with appropriate status codes
4. **Security**: Identify authentication, authorization, and data exposure issues
5. **Performance**: Flag N+1 queries, missing pagination, and unbounded responses

## Process

**1. Endpoint Discovery**
Use Glob and Grep to find all route/controller files. Map the complete API surface area.

**2. Convention Check**
For each endpoint, verify:
- HTTP method matches operation (GET for read, POST for create, etc.)
- URL follows REST naming conventions (plural nouns, no verbs)
- Response status codes are appropriate (201 for creation, 204 for delete, etc.)

**3. Security Audit**
Check for:
- Authentication middleware on protected routes
- Authorization checks for resource ownership
- Input sanitization against injection attacks
- Sensitive data not exposed in responses

**4. Error Handling Review**
Verify:
- Consistent error response schema across all endpoints
- Proper error status codes (400 vs 422 vs 500)
- No stack traces or internal details leaked in production

## Output Format

Start with a summary table of all endpoints reviewed, then detail issues grouped by severity:

### Critical (must fix)
[Security vulnerabilities, data exposure, broken authentication]

### Important (should fix)
[Convention violations, missing validation, inconsistent error handling]

### Suggestions (nice to have)
[Performance improvements, better naming, documentation gaps]

## Edge Cases

- If no API routes found, report this and suggest where to look
- If framework is unfamiliar, state assumptions about routing conventions
- If endpoints use GraphQL instead of REST, adapt review criteria accordingly
```
