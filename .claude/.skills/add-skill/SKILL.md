---
name: add-skill
description: This skill should be used when the user asks to "add a skill", "create a new skill", "make a skill", "register a skill", "install a skill locally", "add a claude skill to this project", or wants to create and register a new Claude Code skill in the current workspace's .claude/.skills/ directory.
---

# Add Skill to Local Workspace

This skill guides the process of creating and registering a new Claude Code skill in the current workspace at `.claude/.skills/`.

## Overview

Skills are modular packages that extend Claude's capabilities with specialized knowledge, workflows, and tools. This skill automates the creation and registration of new skills within the local workspace.

## Skill Creation Workflow

### Step 1: Gather Requirements

Before creating a skill, clarify the following with the user:

1. **Skill name** — A kebab-case identifier (e.g., `api-generator`, `test-helper`)
2. **Purpose** — What the skill does and when it should activate
3. **Trigger phrases** — Specific user phrases that should activate the skill (e.g., "generate API", "create test")
4. **Resources needed** — Whether the skill needs references/, examples/, or scripts/ directories

If the user provides insufficient information, ask targeted questions to fill in the gaps. Avoid asking too many questions at once.

### Step 2: Create Directory Structure

Create the skill directory under `.claude/.skills/`:

```
.claude/.skills/<skill-name>/
├── SKILL.md              (required)
├── references/            (optional - detailed docs)
├── examples/              (optional - working code samples)
└── scripts/               (optional - utility scripts)
```

Only create subdirectories that the skill actually needs.

### Step 3: Write SKILL.md

The SKILL.md file has two parts:

#### Frontmatter (YAML)

```yaml
---
name: <skill-name>
description: This skill should be used when the user asks to "<trigger phrase 1>", "<trigger phrase 2>", "<trigger phrase 3>". <Brief description of what the skill provides>.
---
```

Requirements:
- `name`: kebab-case identifier
- `description`: Third-person format with specific trigger phrases
- Include 3+ concrete trigger phrases that users would actually say

#### Body (Markdown)

Write the skill body following these rules:
- Use **imperative/infinitive form** (verb-first: "Create the file", "Parse the input")
- Do NOT use second person ("You should...", "You need to...")
- Do NOT use first person ("I will...", "I can...")
- Target 1,500–2,000 words for the body
- Move detailed content to `references/` files to keep SKILL.md lean
- Reference all bundled resource files so Claude knows they exist

### Step 4: Add Bundled Resources (if needed)

- **references/** — Detailed documentation, schemas, API docs loaded into context as needed
- **examples/** — Complete, runnable code samples users can copy and adapt
- **scripts/** — Executable utility scripts for deterministic or repeated tasks

### Step 5: Register the Skill

Add the skill path to `.claude/settings.json` under the `skills` array:

```json
{
  "skills": [
    ".skills/<skill-name>"
  ]
}
```

If `settings.json` already has other skills registered, append the new skill to the existing array without removing existing entries.

### Step 6: Validate

Run through this checklist:
- [ ] `.claude/.skills/<skill-name>/SKILL.md` exists with valid YAML frontmatter
- [ ] Frontmatter has `name` and `description` fields
- [ ] Description uses third person ("This skill should be used when...")
- [ ] Description includes 3+ specific trigger phrases
- [ ] Body uses imperative/infinitive form, not second person
- [ ] Body is under 3,000 words (ideally 1,500–2,000)
- [ ] All referenced files actually exist
- [ ] Skill is registered in `.claude/settings.json`

## Quality Guidelines

### Description Best Practices

**Good:**
```yaml
description: This skill should be used when the user asks to "generate API endpoints", "create REST routes", "scaffold an API". Provides guidance for creating RESTful API endpoints with proper error handling and validation.
```

**Bad:**
```yaml
description: Use this for API stuff.
```

### Writing Style

**Good (imperative):**
```markdown
Create the configuration file in the project root.
Parse the input data before processing.
Validate all required fields exist.
```

**Bad (second person):**
```markdown
You should create the configuration file.
You need to parse the input data.
You can validate the required fields.
```

### Progressive Disclosure

Keep SKILL.md lean by moving detailed content to references:

| Content Type | Location |
|---|---|
| Core concepts & workflow | SKILL.md |
| Detailed patterns | references/patterns.md |
| API documentation | references/api-reference.md |
| Working code samples | examples/ |
| Utility scripts | scripts/ |

## Additional Resources

### Reference Files

For detailed guidance on skill structure and best practices:
- **`references/skill-structure.md`** — Complete skill anatomy, file format details, and advanced patterns

## Quick Reference

### Minimal Skill (single file)
```
skill-name/
└── SKILL.md
```

### Standard Skill (recommended)
```
skill-name/
├── SKILL.md
├── references/
│   └── detailed-guide.md
└── examples/
    └── working-example.sh
```

### Full Skill
```
skill-name/
├── SKILL.md
├── references/
│   ├── patterns.md
│   └── advanced.md
├── examples/
│   ├── example1.sh
│   └── example2.json
└── scripts/
    └── validate.sh
```
