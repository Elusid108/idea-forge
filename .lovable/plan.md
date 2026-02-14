

# AI-Powered Idea Processing

## Overview
When a user saves a raw idea dump, the system will immediately save it to the database, then fire off an AI processing call in the background. While processing, the idea card shows a glowing/pulsing animation. Once the AI returns, the card updates in place with the structured results.

---

## 1. Database Migration: Add `key_features` Column

The `ideas` table currently has `processed_summary`, `category`, and `tags`, but is missing the `key_features` field requested. We need to add:

- `key_features` (text, nullable, default `''`) to the `ideas` table

We will also add a `processing` status value so we can track when AI is actively working on an idea (status will go: `'processing'` -> `'processed'` or back to `'new'` on error).

## 2. Backend: `process-idea` Edge Function

Create `supabase/functions/process-idea/index.ts` that:

- Accepts `{ idea_id, raw_dump }` in the POST body
- Authenticates the request via the Authorization header
- Calls the Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) using `LOVABLE_API_KEY`
- Uses **tool calling** (not raw JSON) to get structured output with a function called `process_idea` that returns:
  - `processed_summary` (string)
  - `key_features` (string -- formatted as a bulleted markdown list)
  - `category` (string, one of: Product, Process, Fixture/Jig, Tool, Art, Hardware/Electronics, Software/App, Environment/Space)
  - `tags` (array of 3-6 strings)
- Updates the `ideas` row with the AI results and sets `status = 'processed'`
- On error, sets `status = 'new'` so the user can retry
- Handles 429/402 rate limit errors gracefully
- Uses `google/gemini-3-flash-preview` as the model
- Includes full CORS headers

The system prompt will instruct the AI to act as an analytical engineering assistant that transforms messy stream-of-consciousness input into structured, professional output.

Add the function to `supabase/config.toml` with `verify_jwt = false` (auth validated in code).

## 3. Frontend: Updated Idea Flow

### Save + Process Pipeline (`Ideas.tsx`)

1. **On save**: Insert the idea with `status = 'processing'`, close the modal, show toast "Idea captured! AI is processing..."
2. **Fire-and-forget**: After insert succeeds, call `supabase.functions.invoke('process-idea', { body: { idea_id, raw_dump } })` in the background
3. **On AI completion**: Invalidate the `ideas` query so the card updates automatically
4. **On AI error**: Show an error toast; the card will show with `status = 'new'` as fallback

### Processing Animation on Idea Cards

- When `idea.status === 'processing'`, the card gets a pulsing glow effect:
  - A CSS animation with a glowing border (`animate-pulse` combined with a primary-colored shadow/border)
  - A small "Processing..." label with a spinner replaces the status badge
  - The card shows the raw dump text (truncated) since processed data isn't available yet
- Once status changes to `'processed'`, the card displays the full AI results: summary, category badge, tags, and a "Key Features" expandable section

### Idea Card Layout Updates

- **Category badge** with color coding per category type
- **Processed summary** as the main text
- **Tags** as small badges below
- **Key features** shown as a compact bulleted list (or expandable on click)
- **Status indicator**: "New" (no AI yet), pulsing glow (processing), or checkmark (processed)

## 4. Technical Details

### Edge Function: `supabase/functions/process-idea/index.ts`

```text
POST /process-idea
Body: { idea_id: string, raw_dump: string }
Headers: Authorization (Bearer token), Content-Type

Flow:
1. Validate input (idea_id, raw_dump present)
2. Create Supabase client with service role key
3. Call Lovable AI with tool_choice forcing "process_idea" function
4. Parse tool call response
5. UPDATE ideas SET processed_summary, key_features, category, tags, status='processed' WHERE id=idea_id
6. Return success
```

### Config Update: `supabase/config.toml`

```toml
[functions.process-idea]
verify_jwt = false
```

### CSS Animation

A custom `@keyframes` animation for the processing glow effect added to `src/index.css`:
- Pulsing border-color cycling through primary accent shades
- Subtle box-shadow glow that fades in and out

