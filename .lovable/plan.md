**UX Fixes: Ideas Refresh, Mobile Widget, GTM Interview Cleanup, and Icon Consistency**

This plan addresses 7 distinct issues across the application.

**1. Brainstorm Deletion Should Scrap the Linked Idea (Not Reset to Fresh)** Currently, deleting a brainstorm sets the linked idea's status to "new" (Fresh). Instead, it should set it to "scrapped". *File: src/pages/BrainstormWorkspace.tsx (~line 345)*

- Change `{ status: "new" }` to `{ status: "scrapped" }` in the deleteBrainstorm mutation.

**2. Fix Idea Card Not Showing Title, Tags, and Correct Category Color After Status Change** When an idea goes from "brainstorming" back to another status (like "scrapped"), the card may not refresh its display because the query cache has stale data. The fix is to ensure the ideas query is invalidated properly and the IdeaCard component correctly renders for scrapped ideas. *File: src/pages/BrainstormWorkspace.tsx (~line 349-352)*

- The onSuccess already invalidates ["ideas"] -- this is correct. The real issue is that the first card in Screenshot 1 (the cup holder idea) has no title, no tags, and a dark/unstyled category badge. This happens because the idea was never fully processed (its status was "new" or it was reset before AI processing completed).
- No additional code change needed beyond fix #1 -- once ideas are scrapped instead of reset to "new", the IdeaCard renders with the "Scrapped" badge correctly.

**3. Orphaned Ideas Cleanup: Scrap Ideas Whose Brainstorms No Longer Exist** Some ideas are stuck in "brainstorming" status but their linked brainstorms have been deleted. Add a cleanup check on the Ideas page load. *File: src/pages/Ideas.tsx*

- Add a `useEffect` after the ideas query loads that:
  - Filters ideas with `status === "brainstorming"`
  - For each, queries brainstorms table for any brainstorm with `idea_id = idea.id` and `deleted_at IS NULL`
  - If no brainstorm exists, updates the idea's status to "scrapped"
  - Invalidates the ideas cache after any updates

**4. Mobile: Fix Floating Chat Widget Being Cut Off** The widget uses fixed `bottom-4 right-4 w-[400px]` which overflows on mobile screens. The collapsed flag button also gets cut off. *File: src/components/FloatingChatWidget.tsx*

- Change the expanded container class from `w-[400px]` to `w-[calc(100vw-2rem)] sm:w-[400px]` (or similar responsive approach) so it fits within mobile viewport.
- For the collapsed button, ensure it doesn't overflow by constraining its max-width.

**5. Remove the Mobile Floating "+" (Dump Idea) FAB** The user wants to remove the floating + button that appears on every page on mobile. *File: src/components/AppLayout.tsx*

- Remove the `<MobileDumpIdea />` component from the layout.
- The import can also be removed.

**6. GTM Interview UI Overhaul** Several changes to the GTM Strategy Interview (State 1 in CampaignWorkspace):

**6a. Project Context: Add Timestamp, Lineage Badges, Remove Tag Badges** *File: src/pages/CampaignWorkspace.tsx (~lines 438-458)*

- Add the creation timestamp to the Project Context card
- Add category badge (already present -- keep it)
- Add Linked Idea badge (clickable, opens the same read-only Linked Idea overlay dialog that the dashboard state uses)
- Add Linked Brainstorm badge (clickable, navigates to brainstorm)
- Add Linked Project badge (clickable, navigates to project) -- use Wrench icon instead of FolderOpen
- Remove the tag badges from the Project Context section (currently lines 452-454 render each tag as a badge)

**6b. Add Linked Idea Overlay to GTM Interview State** Currently `showLinkedIdea` and the Linked Idea dialog only exist in the dashboard state (State 2). Move the state and dialog to be available in both states, so clicking "Linked Idea" in the interview context opens the overlay on top of the interview.

**6c. Remove Chat History Log from Interview** *File: src/pages/CampaignWorkspace.tsx (~lines 468-492)*

- Remove the `interviewChatHistory` scrollable log and the separator below it. The interview should only show the current question and answer box (like the brainstorm interview).

**6d. Add Dynamic Topic-Based Progress Indicator** Instead of a hardcoded question counter, the AI should dictate what topics are left to discuss. *Backend Update:* Update the Edge Function/AI Prompt handling the GTM interview. Instruct the AI to include a `topics_remaining` array (e.g., `["Pricing Strategy", "Target Audience"]`) in its JSON response. *UI Update:* Add a small text line above or below the question area. If the `topics_remaining` array has items, display: *"To forge your playbook, we still need to discuss: [Topic 1], [Topic 2]..."* *Ready State:* If the array is empty (or the AI determines it has enough info), change the text to: *"You can now forge your playbook, or continue answering to refine it."*

**7. Fix "Linked Project" Icon: Use Wrench Instead of FolderOpen** The sidebar and Projects page use a wrench icon for projects, but the "Linked Project" badges use FolderOpen. Change all "Linked Project" badges to use Wrench. *Files:*

- `src/pages/CampaignWorkspace.tsx` (~line 656): Change FolderOpen to Wrench
- `src/pages/BrainstormWorkspace.tsx` (~line 896): Change FolderOpen to Wrench
- `src/pages/Ideas.tsx` (~line 224): Change FolderOpen to Wrench

**Technical Summary**

- **src/pages/BrainstormWorkspace.tsx:** Change idea reset from "new" to "scrapped" on brainstorm delete; change Linked Project icon from FolderOpen to Wrench.
- **src/pages/Ideas.tsx:** Add orphaned idea cleanup useEffect; change Linked Project icon from FolderOpen to Wrench.
- **src/components/FloatingChatWidget.tsx:** Make widget responsive on mobile (constrain width to viewport).
- **src/components/AppLayout.tsx:** Remove MobileDumpIdea component.
- **src/pages/CampaignWorkspace.tsx:** GTM interview: add timestamp + lineage badges to Project Context, remove tag badges, remove chat history log, add dynamic `topics_remaining` progress indicator, move Linked Idea overlay to work in both states, change Linked Project icon to Wrench.
- **Supabase Edge Functions:** Update GTM Interview AI prompt to return a `topics_remaining` array in the JSON response.