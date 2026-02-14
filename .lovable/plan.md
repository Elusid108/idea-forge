
# Titles, Data Transfer, and Flashcard Q&A

## 1. Database Migration

Add a `title` column to the `ideas` table:

```sql
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS title text DEFAULT '';
```

The `brainstorms` table already has a `title` column, so no change needed there.

---

## 2. Update `process-idea` Edge Function

Add `title` to the AI tool call schema:

- New property: `title` (string, "A short punchy 3-5 word title for the idea")
- Add to `required` array
- Save `result.title` to `ideas.title` in the DB update

---

## 3. Update `brainstorm-chat` Edge Function (Flashcard Mode)

Completely rework this function to support the flashcard Q&A loop. Two modes:

**Mode A -- "generate_question"**: Called with `{ brainstorm_id, compiled_description, bullet_breakdown, chat_history, context }`. The AI reviews the current state and returns a JSON object with:
- `question`: The next critical question to ask
- (No description/bullet updates on question generation)

**Mode B -- "submit_answer"**: Called with `{ brainstorm_id, answer, question, compiled_description, bullet_breakdown, chat_history, context }`. The AI:
1. Incorporates the answer into the compiled description and bullet breakdown
2. Generates the next question
3. Returns: `{ updated_description, updated_bullets, next_question }`

Use tool calling to enforce structured output. The system prompt instructs the AI to act as a structured interviewer that builds up a project description one answer at a time.

Chat history continues to be passed for context but is saved server-side only (not displayed to user).

---

## 4. Ideas Dashboard Updates (`src/pages/Ideas.tsx`)

### IdeaCard
- Show `idea.title` as a bold header line above the truncated summary
- Fall back to truncated summary if no title yet (processing/new state)

### IdeaDetailModal
- Use `idea.title` as the `DialogTitle` instead of "Idea Details"
- Keep category badge in the header

### "Start Brainstorm" Mutation
Update the data transfer when promoting an idea:
- `brainstorm.title` = `idea.title` (instead of truncated summary)
- `brainstorm.compiled_description` = `idea.processed_summary`
- `brainstorm.bullet_breakdown` = `idea.key_features`

---

## 5. Brainstorm Workspace Overhaul (`src/pages/BrainstormWorkspace.tsx`)

### Data Fetching
- Update the brainstorm query to also select `ideas(raw_dump, processed_summary, title, key_features, tags, category)` for richer context

### Header
- Already has an editable title -- no changes needed (already uses `brainstorm.title`)

### Synced Local State
- On load, pre-fill `description` from `brainstorm.compiled_description` and `bullets` from `brainstorm.bullet_breakdown` (already happening)

### Replace Chat with Flashcard Q&A
Remove the entire scrolling chat panel (lines ~410-473). Replace with:

**FlashcardQA Component:**
- State: `currentQuestion` (string), `answer` (string), `isThinking` (boolean)
- On mount / when brainstorm loads: call the edge function in "generate_question" mode to get the first question
- Display: A single card showing the current AI question in a styled block, a textarea below for the user's answer, and a "Submit Answer" button
- On submit:
  1. Set `isThinking = true`
  2. Call edge function in "submit_answer" mode with the answer, current question, description, bullets, and chat_history
  3. On response: update `description` and `bullets` state with the AI's rewritten versions, save all three fields to the DB (compiled_description, bullet_breakdown, chat_history), set `currentQuestion` to the `next_question`, clear the answer field
  4. Set `isThinking = false`
- While thinking: show a subtle loading animation on the card (spinner or skeleton pulse)
- The compiled description and bullet breakdown textareas above update automatically as the AI rewrites them

### Chat History (Hidden)
- Continue appending `{role: "user", content: answer}` and `{role: "assistant", content: ...}` entries to `chat_history` in the database
- Never display this history in the UI -- it's backend context only

---

## Files to Create/Modify

| File | Action |
|---|---|
| Migration SQL | Add `title` column to `ideas` |
| `supabase/functions/process-idea/index.ts` | Add `title` to tool schema and DB update |
| `supabase/functions/brainstorm-chat/index.ts` | Rewrite for flashcard Q&A (two modes: generate_question, submit_answer) |
| `src/pages/Ideas.tsx` | Show title on cards/modal, update startBrainstorm data transfer |
| `src/pages/BrainstormWorkspace.tsx` | Replace chat with flashcard Q&A component, update query |

---

## Technical Notes

- The `brainstorms.chat_history` JSONB column stores the full Q&A history for AI context but is never rendered in the UI
- The edge function uses tool calling to return structured JSON (updated_description, updated_bullets, next_question) ensuring reliable parsing
- The flashcard loop is self-sustaining: each answer triggers a rewrite of the synthesis fields and generates the next question automatically
- Existing brainstorms with old chat_history format will still work since the new function accepts the same array structure
