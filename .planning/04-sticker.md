# 04 — Sticker (redefined)

## Purpose
**Capture anything you need to remember in two seconds, then decide what deserves your attention.**
One set of stickers, three views of it: a 2×2 priority matrix, a free board, and a list.

## Current state → problems
| Today | Problem |
|---|---|
| A single board per user | Can't separate work, study and personal |
| `urgency_score` is always 5 | Priority filters are meaningless; there's no real prioritisation |
| Colour and position live in localStorage | Lost on another device or browser |
| Auto-delete 24 h after the deadline | Silent data loss; punishes the user |
| Filter bar coded but never rendered | No way to filter |
| Layout entries are deleted when a filter hides a task | Positions reset after filtering (bug in `useStickerInteractions`) |
| "Task over" placeholder subtask added when none are given | Noise |
| Edit mode covers only title, description and colour | Can't change deadline, subtasks or priority after creation |
| The alert loop ticks every second over all tasks; the `TASKR_ALERTS` key isn't per-user | Wasteful; alerts leak across accounts |

## Feature set
**Must (this phase)**
1. **Boards**: create, rename, pin, archive; a default "My board". Board switcher in the sidebar.
2. **Capture bar** at the top of every view: type a title, press Enter. Deterministic inline parsing: `!` = urgent, `*` = important, `#tag`, and a date phrase ("tomorrow 6pm", "fri", "in 3 days") via chrono. Parsed tokens show as removable chips before saving. The full form stays available behind "More details".
3. **Matrix view** (default): four quadrants **Do first** (urgent + important) · **Schedule** (important) · **Delegate** (urgent) · **Later** (neither). Dragging between quadrants updates `is_urgent`/`is_important`. A soft cap warning appears when a quadrant holds more than 7 tasks.
4. **Free board view**: the current freeform canvas (drag, resize, z-order), with positions saved to the DB.
5. **List view**: sortable by deadline, priority or created date; grouped by quadrant or due date; keyboard navigable.
6. **Full editor** (side panel): title, notes, subtasks (add, reorder, check), deadline, reminder, recurrence, colour, tags, quadrant.
7. **Completion**: checking the task (or its last subtask) marks it done → it fades out with an **Undo** toast and moves to a "Done" filter. No forced deletion prompt.
8. **Overdue handling**: overdue tasks get a red badge and float to the top of Do first. The 24 h auto-delete is **removed**.
9. **Filters and search**: by quadrant, tag, due window (today / week / overdue), colour, show done. Stored in the URL query string.
10. **Reminders**: `remind_at` → toast + optional browser notification. Deadline milestone toasts (half-time, 1 h) are kept but per-user, and checked every 30 s instead of every second. The countdown display still ticks visually.
11. **Recurring tasks**: completing one creates the next occurrence (daily / weekdays / weekly / monthly / yearly).
12. **Archive** (soft delete) with an Archive filter and a permanent delete from there.

**Should**
- **Daily review mode**: a guided pass ("Still important? Still urgent? Reschedule?") over overdue and Do-first items, one card at a time with keyboard answers. Fixes the main complaint about matrices, which is that upkeep takes discipline.
- Multi-select (shift-click or box-select on the free board) → bulk move quadrant, colour, tag, archive.
- Calendar strip (7 days) above the list view for drag-to-reschedule.

**Could**
- Link a sticker to a document or flow (phase 6, `item_links`).
- Board templates (Weekly plan, Exam prep, Project launch).

## Stand-out
The **matrix and the free board are the same data**: you can brainstorm freely, then switch to Matrix to prioritise. Together with **2-second capture with natural dates** and a **daily review**, it covers the whole loop (capture → prioritise → review) that generic to-do apps leave to the user.

## Data
`boards`, `tasks` (see [sql/0001_init.sql](sql/0001_init.sql)). Subtasks stay as `sub_tasks jsonb` with the normalised shape `[{ id, label, done }]`; a reader accepts the legacy `text`/`completed` keys.

## Implementation notes
- `features/sticker/api.js`: `listBoards`, `createBoard`, `listTasks(boardId, filters)`, `createTask`, `updateTask(id, patch)`, `archiveTask`, `deleteTask`, `completeTask` (handles recurrence).
- `useTasks(boardId)`: optimistic updates + rollback; positions saved debounced after a drag ends (not on every move).
- `quadrantOf(task)` and `parseCapture(text, now)` are pure functions, unit-testable.
- Fix: layout is kept for hidden tasks; only actual deletion removes it.
- Replace the giant `StickerCard` in App.jsx with a `features/sticker/StickerCard.jsx`.

## Acceptance checks
- Create "Pay rent tomorrow 9am ! #home" → lands in Delegate (urgent, not important), deadline is tomorrow 09:00, tag `home`.
- Drag between quadrants → the flags change and survive a reload on another browser.
- Free board positions survive filter toggling and a reload.
- Complete → Undo restores; a recurring task spawns its next copy.
- No task is ever deleted without an explicit user action.
