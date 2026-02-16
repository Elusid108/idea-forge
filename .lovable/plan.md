
# Widget Enhancement, Campaign Assistant Welcome, and Version Update

## Data Storage Strategy for Widgets

Widgets need to store 3 pieces of data: **summary**, **description/instructions** (rich text), and **code**. The DB columns available are `title`, `url`, `description`, and `thumbnail_url`.

**Approach**: Store widget data as JSON in the `description` field:
```json
{ "code": "<html>...</html>", "summary": "Short summary text", "instructions": "<p>Rich text instructions...</p>" }
```

Helper functions `encodeWidgetData(code, summary, instructions)` and `parseWidgetData(description)` will handle serialization. Backward compatibility: if `description` is not valid JSON or lacks a `code` key, treat the entire string as raw code (legacy widgets).

---

## 1. Widget Add/Edit Dialog Changes

**Files: `ProjectWorkspace.tsx`, `CampaignWorkspace.tsx`**

Update `refForm` state from `{ title, url, description }` to `{ title, url, description, widgetCode, widgetSummary, widgetInstructions }` (add 3 new fields).

**Add Widget dialog**: After the Title input, add:
- **Summary** input (single-line `Input`, placeholder "Brief summary shown on tile/list")
- **Description** input (rich text via `RichTextNoteEditor`, placeholder "Instructions or description shown below the widget")
- **Code** textarea (existing monospace `Textarea`)

**Edit Widget dialog**: Same 3 fields pre-populated from parsed JSON.

**On save**: Encode summary + instructions + code into JSON, store in `description` field.

---

## 2. Widget Tile/List Display

**Files: `ProjectWorkspace.tsx`, `CampaignWorkspace.tsx`**

When rendering widget references in tile or list view, parse the JSON `description` and show the `summary` field instead of the raw code. For tiles: `previewText = parsedWidget.summary`. For list: same truncated summary.

---

## 3. Widget Viewer (ReferenceViewer.tsx)

**File: `ReferenceViewer.tsx`**

Update the widget viewer:
- Parse JSON from `reference.description` to extract `code` and `instructions`
- Make the dialog **resizable** using `react-resizable-panels` (already installed): a vertical `ResizablePanelGroup` with the iframe in the top panel and the instructions in the bottom panel
- The iframe uses `srcDoc={code}` and fills its panel completely (`w-full h-full`)
- The instructions panel renders rich text HTML with vertical scrolling
- The dialog uses `sm:max-w-4xl` and a taller default height

---

## 4. Default Widget Templates (Calculator + Unit Converter)

**Files: `ProjectWorkspace.tsx`, `CampaignWorkspace.tsx`**

Update the template button `onClick` handlers to also populate summary and instructions:

**Unit Converter**:
- Summary: "Convert between metric and imperial units for length, weight, and temperature."
- Instructions: Rich text HTML explaining how to select a conversion type, enter a value, and toggle direction.

**Calculator**:
- Summary: "A standard 10-digit calculator with basic arithmetic operations."
- Instructions: Rich text HTML explaining button layout, operations, parentheses, and backspace.

---

## 5. Campaign Assistant Welcome Message

**File: `CampaignWorkspace.tsx`**

Update the welcome message to match the Project Assistant format and include all capabilities:

```
"I'm your Campaign Assistant. I can help you:

- **Analyze and refine** your GTM strategy and playbook sections
- **Create and manage tasks** across all 5 pipeline phases
- **Generate research notes** with action plans, summaries, and recommendations
- **Create widgets** -- mini web apps (calculators, converters, trackers, etc.)
- **Read and update widgets** by title

What would you like to work on?"
```

---

## 6. AI Tool Updates (Edge Functions)

**Files: `supabase/functions/project-chat/index.ts`, `supabase/functions/campaign-chat/index.ts`**

Update `create_widget` and `update_widget` tools to accept optional `summary` and `instructions` parameters alongside `code`. The edge functions will encode these into JSON format before returning the action to the frontend.

---

## Files Changed Summary

| File | Changes |
|---|---|
| `src/pages/ProjectWorkspace.tsx` | Widget form fields (summary, description, code), JSON encode/decode, template updates, tile/list display |
| `src/pages/CampaignWorkspace.tsx` | Same widget changes, updated welcome message |
| `src/components/ReferenceViewer.tsx` | Resizable widget viewer with iframe + rich text instructions panel |
| `supabase/functions/project-chat/index.ts` | Widget tool parameter updates |
| `supabase/functions/campaign-chat/index.ts` | Widget tool parameter updates |
