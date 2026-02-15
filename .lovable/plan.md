

# Fix AI Interview Welcome Message & Project Assistant Default State

Two targeted fixes for the brainstorm interview experience and the floating chat widget behavior.

---

## 1. AI Interview Welcome Message

**Problem**: When an idea is turned into a brainstorm, the AI interview starts with just a bare question -- no introduction explaining its purpose or capabilities.

**Fix in `src/pages/BrainstormWorkspace.tsx`**:
- In the `generateFirstQuestion` function (around line 294-313), after receiving the question from the edge function, prepend a welcome introduction to the displayed question
- The welcome text will be shown as a separate introductory line above the question, something like:

> "Hi! I'm here to help you flesh out your idea by asking you questions. I'll add what we discuss into the compiled description and bullet breakdown, I'll generate tags, and I can generate notes to help keep track of the things we come up with."

- This only applies to the **first** question (when `chatHistory.length === 0`). Subsequent questions display normally.
- Implementation: After `setCurrentQuestion(data.question)` in `generateFirstQuestion`, also set a `showWelcome` state flag. In the render, when `showWelcome` is true and `chatHistory.length === 0`, display the welcome text above the question in the interview card.
- Alternatively (simpler): prepend the welcome text directly to the `currentQuestion` state with a separator, and render it as a single block with the welcome message styled differently.

**Chosen approach**: Add a `showWelcomeIntro` state boolean, set it to `true` in `generateFirstQuestion` when `chatHistory.length === 0`. In the interview card UI, render a welcome paragraph above the question when `showWelcomeIntro` is true.

---

## 2. Floating Chat Widget: Default to Expanded on First Load per Page

**Problem**: All floating chat widgets (Brainstorm, Project, Campaign) share the same `localStorage` key `"chat-widget-state"`. If the user collapses the brainstorm assistant, then promotes to a project, the Project Assistant also starts collapsed -- which is wrong for a first visit.

**Fix in `src/components/FloatingChatWidget.tsx`**:
- Add a `storageKey` prop (optional, defaults to `"chat-widget-state"`) so each page can use a distinct persistence key
- Update `useState` initializer and `useEffect` to use `storageKey` instead of the hardcoded key

**Fix in calling pages**:
- `BrainstormWorkspace.tsx`: pass `storageKey="chat-widget-brainstorm"`
- `ProjectWorkspace.tsx`: pass `storageKey="chat-widget-project"`  
- `CampaignWorkspace.tsx`: pass `storageKey="chat-widget-campaign"`

This way each widget remembers its own state independently. A new project page will default to expanded (since its key has never been set).

---

## Technical Summary

| File | Changes |
|---|---|
| `src/pages/BrainstormWorkspace.tsx` | Add `showWelcomeIntro` state; set it in `generateFirstQuestion` when history is empty; render welcome paragraph above the first question in the interview card |
| `src/components/FloatingChatWidget.tsx` | Add `storageKey` prop; use it for localStorage read/write instead of hardcoded key |
| `src/pages/ProjectWorkspace.tsx` | Pass `storageKey="chat-widget-project"` to FloatingChatWidget |
| `src/pages/CampaignWorkspace.tsx` | Pass `storageKey="chat-widget-campaign"` to FloatingChatWidget |

