

# UI Polish Round 2: Voice Fix, Cascading Scrap, Logo, Mobile, and FAB

This plan combines the previously approved items (cascading scrap, custom logo, mobile responsiveness, mobile Dump Idea FAB) with the new voice-to-text bug fix.

---

## 1. Fix Voice-to-Text Bug

**Problem**: Every call to `handleVoice` creates a brand new `SpeechRecognition` instance. When the user clicks "Stop Recording", it stops the **new** instance -- not the one actually listening. Additionally, `interimResults` with `continuous` causes cumulative transcript appending, resulting in duplicated/repeated text (as seen in the screenshot).

**Fix in `src/pages/Ideas.tsx`**:
- Store the recognition instance in a `useRef` so the same instance persists across renders
- Track listening state with a ref (`isListeningRef`) alongside the state variable
- On "stop", call `.stop()` on the **stored ref instance**
- Fix `onresult` to only append the **final** transcript (not interim), preventing duplication
- Clean up recognition on component unmount

```text
Key changes:
- Add: const recognitionRef = useRef<any>(null);
- handleVoice "start": create instance only if ref is null, store in ref, call ref.current.start()
- handleVoice "stop": call recognitionRef.current.stop(), set ref to null
- onresult: only setRawDump when result.isFinal, using only the latest final result
- onend: clear isListening state and ref
- useEffect cleanup: stop recognition on unmount
```

---

## 2. Cascading Scrap (Database Trigger)

**Database migration**: Create a trigger function `cascade_scrap()` that fires `AFTER UPDATE` on `ideas`, `brainstorms`, `projects`:
- When an **idea** is scrapped: find brainstorm with `idea_id = id`, set to scrapped
- When a **brainstorm** is scrapped: find project with `brainstorm_id = id`, set to scrapped
- When a **project** is scrapped: find campaign with `project_id = id`, set to scrapped

Un-scrapping does NOT cascade -- only scrapping propagates downstream.

**Frontend changes** (cache invalidation after scrap):
- `src/pages/Ideas.tsx` (scrapIdea mutation): add invalidation for `brainstorms`, `projects`, `campaigns`, `sidebar-items`
- `src/pages/BrainstormWorkspace.tsx` (status change): add invalidation for `projects`, `campaigns`, `sidebar-items`
- `src/pages/ProjectWorkspace.tsx` (status change): add invalidation for `campaigns`, `sidebar-items`

---

## 3. Custom Logo (Brain + Anvil + Mallet)

**New file**: `src/components/IdeaForgeLogo.tsx`
- An inline SVG component depicting a stylized brain with an anvil/hammer motif
- Accepts `className` prop for sizing
- Uses `currentColor` so it inherits text color

**Updated files**:
- `src/components/AppSidebar.tsx` (line 100): replace `Lightbulb` icon with `IdeaForgeLogo`
- `src/pages/Login.tsx` (line 33): replace `Zap` icon with `IdeaForgeLogo`
- `src/pages/Signup.tsx` (line 42): replace `Zap` icon with `IdeaForgeLogo`
- `src/components/AppSidebar.tsx` (line 103): bump version from `v0.2` to `v0.3`

---

## 4. Mobile Responsiveness

**`src/components/AppLayout.tsx`**:
- Change main padding from `p-6` to `p-4 md:p-6`

**Dashboard pages** (`Ideas.tsx`, `Brainstorms.tsx`, `Projects.tsx`, `Campaigns.tsx`):
- Add `flex-wrap gap-2` to header flex containers so buttons wrap on small screens
- Sort dropdown and view toggle buttons wrap naturally below the title on mobile

**Workspace pages** (`BrainstormWorkspace.tsx`, `ProjectWorkspace.tsx`, `CampaignWorkspace.tsx`):
- Already use `grid-cols-1 lg:grid-cols-2` for two-column layouts -- these are fine
- Badge rows already use `flex-wrap` -- these are fine
- Floating chat widget uses fixed positioning -- works on mobile

---

## 5. Mobile Floating "Dump Idea" Button

**New file**: `src/components/MobileDumpIdea.tsx`
- A floating action button (FAB) visible only on mobile (`md:hidden`)
- Positioned `fixed bottom-20 right-4 z-50` (above the chat widget area)
- Circular button with a `Plus` icon
- Opens a Dialog identical to the "Dump Idea" dialog on the Ideas page
- Includes the same textarea and voice input (using the fixed voice logic)
- Uses the same `createIdea` mutation to save, then navigates to `/ideas`
- Only renders when the user is authenticated

**Updated file**: `src/components/AppLayout.tsx`
- Import and render `MobileDumpIdea` inside the layout so it appears on every page

---

## Technical Summary

| File | Changes |
|---|---|
| **Migration SQL** | Create `cascade_scrap()` trigger function + triggers on ideas, brainstorms, projects |
| `src/pages/Ideas.tsx` | Fix voice-to-text (useRef pattern), add cascade invalidations on scrap |
| `src/components/IdeaForgeLogo.tsx` | New custom SVG logo component |
| `src/components/MobileDumpIdea.tsx` | New floating "Dump Idea" FAB for mobile |
| `src/components/AppSidebar.tsx` | Replace Lightbulb with IdeaForgeLogo, bump to v0.3 |
| `src/components/AppLayout.tsx` | Add MobileDumpIdea, reduce mobile padding |
| `src/pages/Login.tsx` | Replace Zap with IdeaForgeLogo |
| `src/pages/Signup.tsx` | Replace Zap with IdeaForgeLogo |
| `src/pages/Brainstorms.tsx` | Mobile header wrapping |
| `src/pages/Projects.tsx` | Mobile header wrapping |
| `src/pages/Campaigns.tsx` | Mobile header wrapping |
| `src/pages/BrainstormWorkspace.tsx` | Add cascade invalidations on status change |
| `src/pages/ProjectWorkspace.tsx` | Add cascade invalidations on status change |

