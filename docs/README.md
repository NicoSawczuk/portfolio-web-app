# Project Documentation

This directory is the compact source of truth for the project and for any AI agent working on it.

The documentation describes the current implementation, domain behavior, data model, calculations and important known findings. It is not a replacement for the source code: use it to identify the relevant area, then verify the implementation in the source.

## AI reading order

Use the smallest amount of context that is sufficient for the task:

```text
README.md
  ↓
AI_RULES.md
  ↓
AI_CONTEXT_MAP.md
  ↓
only the docs relevant to the task
  ↓
only the source files needed to implement or verify it
```

`AI_CHECKLISTS.md` is only for non-trivial or high-risk changes.

Do not read every document by default. Start broad enough to identify the area, then narrow down.

## AI documents

| Document | Purpose |
|---|---|
| `AI_RULES.md` | Behavioral contract for AI agents: scope, context, implementation and safety rules |
| `AI_CONTEXT_MAP.md` | Fast routing from a task area to the minimum useful docs and source entry points |
| `AI_CHECKLISTS.md` | Focused checks for complex/high-risk changes |

## Project documents

| Document | Purpose |
|---|---|
| `PROJECT.md` | Product scope and capabilities |
| `ARCHITECTURE.md` | Technical architecture and application structure |
| `DOMAIN.md` | Domain entities, semantics and business rules |
| `DATABASE.md` | MongoDB collections and persistence model |
| `CALCULATIONS.md` | Financial calculations and metric behavior |
| `WORKFLOWS.md` | End-to-end application flows |
| `AUDIT.md` | Known findings and risks; informational, not an automatic task backlog |

## Priority

When sources disagree:

1. Current source code establishes what the application actually does.
2. Domain and calculation documentation establishes documented behavior and business semantics.
3. `AUDIT.md` records findings; it does not authorize unrelated fixes.
4. If the intended behavior is unclear and the change could affect data, money, security or domain semantics, ask before making the assumption.
