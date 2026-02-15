
# AI Question Persistence, Reference Viewer Border, Timestamps, New Project Button, Idea Groups, Brainstorm Groups, and Remove General Notes

## 1. Fix AI Interview Question Not Updating Between Brainstorms

**Problem**: `questionLoaded` is a simple boolean state that gets set to `true` on first load but never resets when navigating to a different brainstorm (the `id` param changes but the component may not remount).

**Fix in `src/pages/BrainstormWorkspace.tsx`**:
- Store the last loaded brainstorm ID in a ref. When `id` changes, reset `questionLoaded` to `false` and clear `currentQuestion`.
- Check the brainstorm's `chat_history` -- if the last assistant message contains a "Next question:", extract it and use that instead of generating a new one. This way previously generated questions are "remembered".
- Add `id` to the useEffect dependency array and reset state when it changes:

```typescript
const lastLoadedIdRef = useRef<string | null>(null);

useEffect(() => {
  if (id && id !== lastLoadedIdRef.current) {
    lastLoadedIdRef.current = id;
    setQuestionLoaded(false);
    setCurrentQuestion("");
    setAnswer("");
  }
}, [id]);
```

- In `generateFirstQuestion`, check if the last chat_history entry has a next_question embedded. If so, use it instead of calling the API.

---

## 2. Reference Viewer: Move Close Button Outside Content (Border Layout)

**Problem**: The built-in DialogContent close button overlays the image/video content, interfering with YouTube player controls.

**Fix in `src/components/ReferenceViewer.tsx`**:
- For image and video viewers, add padding to the top of DialogContent so the close button sits in a "border" area above the content rather than overlapping it.
- Change `p-0` to `p-0 pt-10` (or similar) to create space for the close button.
- Position the close button in that top border area using the existing `[&>button]` selector with adjusted positioning: `[&>button]:top-2 [&>button]:right-2`.

This creates a visual border/header strip where the X lives, keeping it out of the way of video controls.

---

## 3. Timestamps for Ideas, Brainstorms, and Projects

**What**: Show `created_at` date/time on the detail views and tiles/cards.

**Changes**:
- `src/pages/Ideas.tsx`: Add a small timestamp line on the IdeaCard and IdeaDetailModal showing `created_at` formatted with `date-fns`.
- `src/pages/Brainstorms.tsx`: Add a timestamp line on brainstorm cards.
- `src/pages/Projects.tsx`: Add a timestamp line on project cards.
- `src/pages/BrainstormWorkspace.tsx`: Show created date in the title bar area.
- `src/pages/ProjectWorkspace.tsx`: Show created date in the title bar area.

No database migration needed -- `created_at` already exists on all three tables.

---

## 4. "+ New Project" Button

**File: `src/pages/Projects.tsx`**:
- Add a `+ New Project` button next to the view toggle buttons.
- On click, insert a new project with default name "Untitled Project" and navigate to `/projects/{id}`.
- Uses the same mutation pattern as the brainstorms page `createBrainstorm`.

---

## 5. Ideas Page: Collapsible Groups (Fresh / Brainstorming / Scrapped)

**Database change**: The `ideas` table already has a `status` field. Currently used values are `new`, `processing`, `processed`, `brainstorming`. We will add `scrapped` as a new status value (no migration needed, it's a text field).

**File: `src/pages/Ideas.tsx`**:
- Group ideas into 3 collapsible sections:
  - **Fresh Ideas**: status is `new`, `processing`, or `processed`
  - **Brainstorming**: status is `brainstorming`
  - **Scrapped**: status is `scrapped`
- Each group is a `Collapsible` section, defaulting to expanded.
- Collapse state persisted in `localStorage`.

**Scrap button**: In the `IdeaDetailModal`:
- Rename the "Close" button to "Scrap" with a gray background (`variant="secondary"`).
- On click: if idea status is `scrapped`, revert to `processed` (un-scrap). If not scrapped, set status to `scrapped`.
- The button label toggles: "Scrap" / "Un-scrap".
- On tiles, scrapped ideas show a "Scrapped" badge (gray) instead of category.

**"Start Brainstorm" remains available** for scrapped ideas.

---

## 6. Brainstorms Page: Collapsible Groups (Active / Backburner / Scrap / Complete)

**Database change**: The `brainstorms` table has a `status` field (text). Current values: `active`, `completed`. We need to support `backburner` and `scrapped` as additional values (no migration needed, it's a text field).

**File: `src/pages/Brainstorms.tsx`**:
- Group brainstorms into 4 collapsible sections:
  - **Active** (default): status is `active`
  - **Backburner**: status is `backburner`
  - **Scrap**: status is `scrapped`
  - **Complete**: status is `completed`
- Each group is collapsible, defaulting expanded, with persistent collapse state.

**Status management**: A way to change status is needed. Add a small dropdown or context action on the brainstorm workspace to set status to active/backburner/scrapped. Complete is set automatically on promotion.

**File: `src/pages/BrainstormWorkspace.tsx`**:
- Add a status selector (dropdown) in the title bar to switch between Active, Backburner, and Scrap. Complete remains set only via promotion.

---

## 7. Remove General Notes from ProjectWorkspace

**File: `src/pages/ProjectWorkspace.tsx`**:
- Remove the "General Notes" section (lines 350-360) entirely since it duplicates the Description field.
- Remove the `notes` state variable and its associated `setNotes` usage.

---

## Summary of All Changes

| File | Changes |
|---|---|
| `src/pages/BrainstormWorkspace.tsx` | Fix question persistence on brainstorm switch; add status selector dropdown (Active/Backburner/Scrap) |
| `src/components/ReferenceViewer.tsx` | Add padding/border layout so close button is outside content area |
| `src/pages/Ideas.tsx` | Collapsible groups (Fresh/Brainstorming/Scrapped); Scrap/Un-scrap button; timestamps on cards |
| `src/pages/Brainstorms.tsx` | Collapsible groups (Active/Backburner/Scrap/Complete); timestamps on cards |
| `src/pages/Projects.tsx` | Add "+ New Project" button; timestamps on cards |
| `src/pages/ProjectWorkspace.tsx` | Remove General Notes section; add created date display |
