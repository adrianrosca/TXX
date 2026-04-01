---
name: backlog
description: Track stuff that needs to be done — add, list, update, complete, and prioritize backlog items. Activate on "backlog", "add to backlog", "what's on the backlog", "show backlog".
---

# backlog

Manage a project backlog stored in `docs/skill_docs/BACKLOG.md`.

## Storage

**File:** `docs/skill_docs/BACKLOG.md` (git-tracked).

**Format:** Each item is a markdown list entry under a status heading:

```markdown
# Backlog

## Active
- **[P1]** Item title #tag1 #tag2 — optional notes (added 2026-03-26)
- **[P2]** Another item #tag (added 2026-03-25)

## Done
- ~~**[P1]** Completed item #tag (added 2026-03-20, done 2026-03-26)~~
```

### Priority levels
- **P0** — urgent / blocking
- **P1** — high priority
- **P2** — normal (default)
- **P3** — low / nice-to-have

## Commands

When invoked, if no specific command is given, show the active backlog as a table and ask what to do.

| Command | Description |
|---------|-------------|
| **add** | Add item(s) to the backlog |
| **list** | Show backlog (filterable by tag, priority) |
| **done** | Mark item(s) as completed |
| **remove** | Remove item(s) entirely |
| **bump** | Change priority of an item |
| **tag** | Add/remove tags on an item |
| **clean** | Archive old done items (move to docs/skill_docs/BACKLOG-ARCHIVE.md) |

### add

Ask for: **title** (required), **priority** (default P2), **tags** (optional), **notes** (optional).

Multiple items can be added at once — accept a list.

```
/backlog add P1 Fix overlay rendering in R mode #architecture #bug
/backlog add Set up CI for Y repo #devops
```

Append to the **Active** section. Set the added date to today.

### list

Read `BACKLOG.md` and present active items as a table:

```
| # | Pri | Item | Tags | Added |
|---|-----|------|------|-------|
| 1 | P0  | ... | ... | ... |
```

Sort by priority (P0 first), then by date added (oldest first).

**Filters:**
- By tag: `list #bug`
- By priority: `list P0`
- Show done: `list done`
- Show all: `list all`

### done

Identify the item by number (from list) or by title substring match.

Move item from **Active** to **Done** section with strikethrough and done date.

### remove

Delete item entirely (confirm with user first).

### bump

Change priority: `bump 3 P0` (set item 3 to P0).

### tag

Add or remove tags: `tag 3 +infra -bug`

### clean

Move items from **Done** that are older than 30 days to `docs/skill_docs/BACKLOG-ARCHIVE.md`. Create archive file if needed.

## Initialization

If `BACKLOG.md` doesn't exist, create it with:

```markdown
# Backlog

## Active

## Done
```

## Rules

- Always re-read `BACKLOG.md` before any operation (file may have been edited manually)
- Preserve any manual formatting or notes the user added
- When showing the backlog, always number items so the user can reference them
- Keep the file clean and readable — it's meant to be read directly too
- Don't add items the user didn't ask for
- When the user mentions things that need doing in conversation, suggest adding them to the backlog
