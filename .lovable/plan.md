

# Fix GTM Interview: Forge Button Visibility and Progress Persistence

Two bugs exist in the Campaign GTM Interview flow, both stemming from the same root cause: `topicsRemaining` is not persisted and defaults to an empty array `[]`.

---

## Bug 1: "Forge Playbook" button missing when it should show

**Root cause:** When the user leaves the page and returns, `topicsRemaining` resets to `[]` (its default). The progress text checks `topicsRemaining.length > 0` and shows "You can now forge your playbook" (correct-looking text), but the **button** uses a completely separate condition: `exchangeCount >= 3`. If the user had fewer than 3 exchanges, the button is hidden even though the AI said all topics are covered.

## Bug 2: "Forge Playbook" button showing when topics remain

**Root cause:** The button condition is only `exchangeCount >= 3`, which ignores whether topics are actually covered. So once 3 answers are submitted, the button appears regardless of the AI's `topics_remaining` response.

---

## Fix

### 1. Use `topicsRemaining` state to control the Forge button (not exchange count)

**File: `src/pages/CampaignWorkspace.tsx`**

- Change `topicsRemaining` initial state from `[]` to `null` (use type `string[] | null`). This distinguishes "not yet loaded" from "AI says all topics covered."
- The Forge button condition changes from `exchangeCount >= 3` to:
  `topicsRemaining !== null && topicsRemaining.length === 0 && exchangeCount >= 1`
  This means: the AI has explicitly confirmed all topics are covered, and at least one exchange has occurred.
- The progress indicator text changes to:
  - `topicsRemaining === null`: show nothing (still loading)
  - `topicsRemaining.length > 0`: "To forge your playbook, we still need to discuss: [topics]"
  - `topicsRemaining.length === 0 && exchangeCount >= 1`: "You can now forge your playbook, or continue answering to refine it."

### 2. Persist `topicsRemaining` alongside `chat_history`

**File: `src/pages/CampaignWorkspace.tsx`**

- When saving `chat_history` to the database (lines 253 and 260), also save `topicsRemaining` as a JSON field. Since there is no dedicated column, store it inside the chat_history payload by appending a metadata entry, OR add a simple approach: save it as part of the campaign update alongside chat_history.

**Simpler approach (no DB migration):** Store `topics_remaining` as a JSON metadata object at the end of the `chat_history` array, e.g. `{ role: "system", content: JSON.stringify({ topics_remaining: [...] }) }`. On load, extract it.

**Even simpler approach:** On page reload, the existing code already calls `generateFirstQuestion()` which sends the full `chat_history` to the AI and gets back `topics_remaining`. The problem is just the **initial state** before that call completes. Setting the initial state to `null` and showing no progress text until the AI responds fixes the visual inconsistency without needing persistence.

### 3. Ensure reload properly restores state

**File: `src/pages/CampaignWorkspace.tsx`** (lines 175-191)

The `useEffect` that runs on reload already calls `generateFirstQuestion()` when there is existing chat history but no cached question. This call returns `topics_remaining` from the AI. Combined with the `null` initial state fix, this means:
- On reload: progress shows nothing (loading state) until the AI responds
- Once AI responds: `topicsRemaining` is set correctly, and the Forge button appears or not based on the AI's assessment

---

## Summary of Changes

| Area | Change |
|---|---|
| `topicsRemaining` initial state | Change from `[]` to `null` |
| Forge button condition | Change from `exchangeCount >= 3` to `topicsRemaining !== null && topicsRemaining.length === 0 && exchangeCount >= 1` |
| Progress text rendering | Add null check: show nothing when `topicsRemaining === null` |
| No DB migration needed | The AI re-evaluates topics on reload via `generateFirstQuestion` |

