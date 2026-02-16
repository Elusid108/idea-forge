

# Logo Update, Expenses Reorganization, Campaign Expenses, and AI Link Creation

## 1. Update IdeaForge Logo: Brain with Lightning Bolt

**File: `src/components/IdeaForgeLogo.tsx`**

Replace the current brain+anvil+mallet SVG with a new design: a brain shape with a lightning bolt cutting across it diagonally. Remove the anvil and mallet elements entirely.

- Keep the brain outline (top portion of the current SVG)
- Remove the anvil rectangles (y=38-56) and mallet rectangles
- Add a lightning bolt path cutting diagonally across the brain (a classic zigzag bolt shape)
- Maintain `currentColor` fill and the `className` prop behavior

## 2. Move Expenses from Left Column to Right Column (after Resources)

**File: `src/pages/ProjectWorkspace.tsx`**

- Remove the entire Expenses section (lines ~1305-1362) from the left column (after Gotchas)
- Paste it into the right column, after the Resources `</div>` closing tag (after line ~1652)
- The receipt icon positioning fix: move the receipt icon to appear **left of the category badge** instead of before the title. Reorder the expense row layout:
  - Left: title/vendor/description block (flex-1)
  - Then: receipt icon (if present) + category badge + amount + date + action buttons

## 3. Add Independent Expenses Section to Campaign Workspace

This requires a new database table for campaign expenses.

**Database Migration**: Create `campaign_expenses` table mirroring `project_expenses`:
- `id` (uuid, PK, default gen_random_uuid())
- `campaign_id` (uuid, NOT NULL)
- `user_id` (uuid, NOT NULL)
- `title` (text, NOT NULL, default '')
- `description` (text, nullable, default '')
- `amount` (numeric, NOT NULL, default 0)
- `category` (text, nullable, default 'General')
- `date` (date, nullable, default CURRENT_DATE)
- `vendor` (text, nullable, default '')
- `receipt_url` (text, nullable, default '')
- `created_at` (timestamptz, NOT NULL, default now())
- RLS policies: users can CRUD own rows (auth.uid() = user_id)

**File: `src/pages/CampaignWorkspace.tsx`**

- Add expense state, queries, mutations mirroring ProjectWorkspace's expense logic but using `campaign_expenses` table and `campaign_id`
- Add the Expenses section in the right column after Resources
- Add the expense add/edit dialog (reuse the same form pattern)
- Include receipt upload support using the existing `project-assets` storage bucket

## 4. AI Assistants Can Create Link Resources

**Files: `supabase/functions/project-chat/index.ts`, `supabase/functions/campaign-chat/index.ts`, `supabase/functions/brainstorm-chat/index.ts`**

Add a new `create_link` tool to all three edge functions:
```
{
  name: "create_link",
  description: "Create a link resource/reference. Use this when recommending websites, tools, retailers, or any external URL.",
  parameters: {
    title: { type: "string", description: "Link title" },
    url: { type: "string", description: "Full URL starting with https://" },
    description: { type: "string", description: "Brief description of the link" }
  },
  required: ["title", "url"]
}
```

Update system prompts to mention:
- "Use the create_link tool when recommending websites, tools, or external resources. Always provide the full URL."

**Files: `src/pages/ProjectWorkspace.tsx`, `src/pages/CampaignWorkspace.tsx`, `src/pages/BrainstormWorkspace.tsx`**

Add handler for `create_link` action in each workspace's chat submit function:
```typescript
if (action.action === "create_link" && action.title && action.url) {
  await supabase.from("[table]_references").insert({
    [entity]_id: id!, user_id: user!.id,
    type: "link", title: action.title,
    url: action.url, description: action.description || "",
    sort_order: references.length,
  });
  queryClient.invalidateQueries({ queryKey: ["[entity]-refs", id] });
  toast.success(`Link added: ${action.title}`);
}
```

Also extend `ChatMsg` in BrainstormWorkspace to support `noteId`/`noteTitle` for note badges (currently it doesn't have those), and add `linkId`/`linkTitle` across all three workspaces for link badges in chat.

## 5. Version Bump

**File: `src/components/AppSidebar.tsx`**

- Change `v0.4` to `v0.5`

---

## Technical Details

### Receipt Icon Repositioning

Current order: `[receipt] [title block] [category badge] [amount] [date] [buttons]`

New order: `[title block] [receipt] [category badge] [amount] [date] [buttons]`

Move the receipt icon `<a>` element from before the title block to just before the category badge.

### Campaign Expenses Table SQL

```sql
CREATE TABLE public.campaign_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  category text DEFAULT 'General',
  date date DEFAULT CURRENT_DATE,
  vendor text DEFAULT '',
  receipt_url text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaign expenses" ON public.campaign_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own campaign expenses" ON public.campaign_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaign expenses" ON public.campaign_expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaign expenses" ON public.campaign_expenses FOR DELETE USING (auth.uid() = user_id);
```

### Link Badge in Chat

```tsx
{msg.linkId && (
  <button
    className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
    onClick={() => {
      const link = references.find((r: any) => r.id === msg.linkId);
      if (link) setViewingRef(link);
    }}
  >
    <LinkIcon className="h-3 w-3" />
    View: {msg.linkTitle}
  </button>
)}
```

### Files Changed Summary

| File | Changes |
|---|---|
| `src/components/IdeaForgeLogo.tsx` | New brain+lightning bolt SVG |
| `src/pages/ProjectWorkspace.tsx` | Move expenses to right column, receipt icon reposition, create_link handler, link badge in chat |
| `src/pages/CampaignWorkspace.tsx` | Add expenses section, create_link handler, link badge in chat |
| `src/pages/BrainstormWorkspace.tsx` | Add create_link handler, link badge in chat |
| `src/components/AppSidebar.tsx` | Version bump to v0.5 |
| `supabase/functions/project-chat/index.ts` | Add create_link tool |
| `supabase/functions/campaign-chat/index.ts` | Add create_link tool |
| `supabase/functions/brainstorm-chat/index.ts` | Add create_link tool |
| Database migration | Create campaign_expenses table with RLS |

