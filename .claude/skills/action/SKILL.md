---
name: action
description: Track stuff that needs to be done — add, list, update, complete, and prioritize action items. Activate on "action", "add action", "what actions", "show actions", "action list".
---

# action

Manage project actions stored in `docs/skill_docs/ACTION.md`.

## Storage

**File:** `docs/skill_docs/ACTION.md` (git-tracked).

**Format:** Each item has a permanent running ID (`#N`) and a markdown list entry under a status heading:

```markdown
# Action

## Active
- **#1 [P1]** Item title #tag1 #tag2 — optional notes (added 2026-03-26)
- **#2 [P2]** Another item #tag (added 2026-03-25)

## Done
- ~~**#3 [P1]** Completed item #tag (added 2026-03-20, done 2026-03-26)~~
```

**IDs are permanent** — they never change or get reused. When adding a new item, use the next available ID (highest existing ID + 1).

### Priority levels
- **P0** — urgent / blocking
- **P1** — high priority
- **P2** — normal (default)
- **P3** — low / nice-to-have

## Commands

When invoked, if no specific command is given, show the active actions as a table and ask what to do.

| Command | Description |
|---------|-------------|
| **add** | Add item(s) to the action list |
| **list** | Show actions (filterable by tag, priority) |
| **done** | Mark item(s) as completed |
| **remove** | Remove item(s) entirely |
| **bump** | Change priority of an item |
| **tag** | Add/remove tags on an item |
| **clean** | Archive old done items (move to docs/skill_docs/ACTION-ARCHIVE.md) |

### add

Ask for: **title** (required), **priority** (default P2), **tags** (optional), **notes** (optional).

Multiple items can be added at once — accept a list.

```
/action add P1 Fix overlay rendering in R mode #architecture #bug
/action add Set up CI for Y repo #devops
```

Append to the **Active** section. Set the added date to today.

### list

Read `ACTION.md` and present active items as a table:

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

Move items from **Done** that are older than 30 days to `docs/skill_docs/ACTION-ARCHIVE.md`. Create archive file if needed.

## Initialization

If `ACTION.md` doesn't exist, create it with:

```markdown
# Action

## Active

## Done
```

## Work files

**Directory:** `actions/` at repo root. Each action item gets its own folder named `{id}_{short_slug}`:

```
actions/
  1_anders_nilsson_perf/
  2_uiux_roadmap/
  7_skicka_progress_nina/
    progress-draft.md
```

- Create the folder when adding a new item
- Store any work files, notes, drafts, or artifacts for that item in its folder
- The folder name uses the item's permanent ID + a short snake_case slug

## Rules

- Always re-read `ACTION.md` before any operation (file may have been edited manually)
- Preserve any manual formatting or notes the user added
- When showing actions, always number items so the user can reference them
- Keep the file clean and readable — it's meant to be read directly too
- Don't add items the user didn't ask for
- When the user mentions things that need doing in conversation, suggest adding them as actions
