# Skill Structure Reference

## SKILL.md Format

### Frontmatter Fields

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Kebab-case skill identifier |
| `description` | Yes | Third-person trigger description |
| `version` | No | Semantic version (e.g., 0.1.0) |
| `allowed-tools` | No | Comma-separated list of allowed tools |

### Frontmatter Example

```yaml
---
name: my-skill
description: This skill should be used when the user asks to "do X", "create Y", "configure Z". Provides specialized guidance for handling X, Y, Z tasks.
version: 0.1.0
---
```

## Progressive Disclosure Levels

### Level 1: Metadata (Always Loaded)
- `name` and `description` from frontmatter (~100 words)
- Used to determine if skill should activate
- Keep description specific with trigger phrases

### Level 2: SKILL.md Body (When Skill Triggers)
- Main instructions and workflows
- Quick reference tables
- Pointers to bundled resources
- Target: 1,500–2,000 words, max 5,000

### Level 3: Bundled Resources (As Needed)
- Loaded only when Claude determines they're relevant
- No context impact when not used
- Can be large (2,000–5,000+ words per file)

## Bundled Resource Types

### references/
Documentation loaded into context as needed.

**Use for:**
- Detailed patterns and techniques
- API documentation and schemas
- Migration guides
- Domain-specific knowledge
- Company policies

**Best practices:**
- Keep each file focused on one topic
- If file exceeds 10k words, include grep search patterns in SKILL.md
- No duplication with SKILL.md content

### examples/
Complete, working code samples.

**Use for:**
- Runnable scripts and configurations
- Template files users can copy
- Real-world usage demonstrations

**Best practices:**
- Every example must be complete and runnable
- Include comments explaining key parts
- Show realistic use cases

### scripts/
Executable utility scripts.

**Use for:**
- Validation tools
- Automation helpers
- Parsing utilities
- Code generation

**Best practices:**
- Make scripts executable (`chmod +x`)
- Include usage comments at the top
- Handle errors gracefully

### assets/
Files used in output, not loaded into context.

**Use for:**
- Templates (HTML, React boilerplate)
- Images and icons
- Font files
- Sample documents

## settings.json Registration

Skills must be registered in `.claude/settings.json` to be discovered:

```json
{
  "skills": [
    ".skills/skill-name-1",
    ".skills/skill-name-2"
  ]
}
```

Paths are relative to the `.claude/` directory.

## Writing Style Rules

### Imperative Form (Correct)
```markdown
Create the configuration file.
Parse the input before processing.
Validate required fields.
Run the test suite after changes.
```

### Second Person (Incorrect)
```markdown
You should create the configuration file.
You need to parse the input.
You can validate required fields.
You must run the test suite.
```

### Third Person for Description (Correct)
```yaml
description: This skill should be used when the user asks to "create X"...
```

### Other Forms for Description (Incorrect)
```yaml
description: Use this skill when you want to create X...  # second person
description: I help with creating X...                     # first person
description: Provides X guidance.                          # no triggers
```

## Common Patterns

### Skill with References Only
Good for knowledge-heavy skills (domain expertise, documentation).

```
my-skill/
├── SKILL.md
└── references/
    ├── schema.md
    └── api-docs.md
```

### Skill with Scripts Only
Good for automation skills (validators, generators).

```
my-skill/
├── SKILL.md
└── scripts/
    ├── validate.sh
    └── generate.py
```

### Skill with Examples Only
Good for template-based skills (scaffolding, boilerplate).

```
my-skill/
├── SKILL.md
└── examples/
    ├── basic-config.json
    └── advanced-config.json
```

## Validation Checklist

### Structure
- [ ] SKILL.md exists with valid YAML frontmatter
- [ ] `name` field present (kebab-case)
- [ ] `description` field present
- [ ] Only needed subdirectories created
- [ ] All referenced files exist

### Description Quality
- [ ] Uses third person ("This skill should be used when...")
- [ ] 3+ specific trigger phrases included
- [ ] Concrete scenarios listed
- [ ] Not vague or generic

### Content Quality
- [ ] Imperative/infinitive form throughout
- [ ] No second person ("You should...")
- [ ] SKILL.md body under 3,000 words
- [ ] Detailed content in references/
- [ ] Resources referenced in SKILL.md

### Registration
- [ ] Added to `.claude/settings.json` skills array
- [ ] Path is correct relative to `.claude/`
