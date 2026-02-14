

# Brainstormer Funnel — Final Implementation Plan

## Design & Theme
- Dark mode by default, sleek minimalist interface
- High-contrast accent colors (electric blue/violet) for primary actions
- Clean typography, generous whitespace, subtle glass/card effects

---

## 1. Authentication & User Profiles
- Email/password signup and login pages
- `profiles` table (display name, avatar URL) auto-created on signup via trigger
- All tables protected with Row Level Security — users only see their own data

## 2. Database Schema
- **ideas** — raw dumps, AI-processed summaries, categories, tags, status
- **brainstorms** — linked to an idea (optional), contains compiled description, bullet breakdown, chat history (JSONB), reference links, status
- **brainstorm_references** — individual reference items linked to a brainstorm: type (image, website, video, document, note), title, URL, description, thumbnail URL, sort order
- **projects** — promoted from brainstorms (optional), name, status, GitHub repo URL, general notes
- **project_assets** — file metadata (name, category, storage path) linked to projects
- **profiles** — display name, avatar

## 3. File Storage
- Supabase Storage bucket for project assets and brainstorm reference images
- Supports any file type: 3MF, STL, CAD, firmware binaries, code archives, images
- Only the storage path/URL saved in the database

---

## 4. Sidebar Navigation (Independent Stages)
- Three collapsible sections: 💡 Ideas, 🧠 Brainstorms, 🔧 Projects
- Each section expands to show ~10 recent items with status badges and a "View all →" link
- Section headers link to full-page views; item counts shown as badges
- Collapsible mini mode showing only icons
- Items can be promoted forward (Idea → Brainstorm → Project) but don't have to be
- Users can also create brainstorms or projects directly without a parent

---

## 5. Page 1: Ideas Dashboard
- Prominent **"Dump Idea"** button
- Modal with large text area + microphone button (Web Speech API for voice-to-text)
- On save: AI edge function (Lovable AI) generates a processed summary, assigns a category (Hardware, Software, Fixture/Jig, 3D Print, etc.), and extracts tags
- Grid/list view of all ideas with filters by status, category, tags
- Each idea card shows an indicator if it has an associated brainstorm
- "Start Brainstorm" action available on any idea

## 6. Page 2: Brainstorms List
- List of all brainstorm sessions showing linked idea summary, date, reference count, and project indicator
- Click to open the full brainstorm workspace

## 7. Page 3: Brainstorm Workspace (Revised)

This is a **research & reference gathering workspace**, not just a chat. It has multiple panels/sections:

### Main Area — Reference Board
- A collection/board where the user gathers all their research materials:
  - **Websites/Links** — paste a URL, it saves with a title and optional description
  - **Images** — upload reference images (mood boards, sketches, screenshots) stored in Supabase Storage
  - **Videos** — paste YouTube/Vimeo links, displayed as embedded previews
  - **Documents** — upload PDFs, datasheets, etc.
  - **Notes** — freeform text snippets for quick thoughts
- Each reference item shows as a card with type icon, title, thumbnail (if image/video), and description
- References are sortable and can be reordered

### Side Panel — AI Q&A Chat
- A collapsible chat panel on the side of the workspace
- Streaming AI chat (Lovable AI) where the AI acts as an engineering/design partner
- The AI has context of the original idea dump and all gathered references
- Chat history is persisted in the brainstorm record

### Top Section — Compiled Description & Bullet Breakdown
- An **expanded project description** that evolves as the brainstorm progresses
- A structured **bullet breakdown** of key points, requirements, components, or steps
- The AI chat feeds into this: after Q&A, the user (or AI) can compile insights into the description and bullet list
- Both are editable by the user at any time

### Actions
- Shows which idea it originated from (clickable link back), if any
- **"Promote to Project"** button to graduate to the Project Hub

## 8. Page 4: Project Hub
- Dual-view toggle: **Kanban board** (columns: Planning, In Progress, Testing, Done) and **list view**
- Each project card shows linked brainstorm/idea if any
- Click to open project detail

## 9. Page 5: Project Detail
- Editable GitHub repo URL field
- Rich text area for general notes (wiring notes, slice profiles, firmware patches)
- **Drag-and-drop file upload zone** wired to Supabase Storage
- File category auto-detection or manual selection (CAD, STL, 3MF, Firmware, Code, Docs, Other)
- Uploaded files displayed in a list with file name, category, and download link

---

## AI Integration (Lovable AI Gateway)
All AI features use the built-in Lovable AI — no API key configuration needed:
1. **Idea Processing** — edge function that takes raw dump → returns summary, category, tags
2. **Brainstorm Chat** — streaming chat edge function with engineering/design partner system prompt, aware of the idea context and gathered references
3. **Description Compilation** — AI can synthesize chat Q&A and references into the structured description and bullet breakdown

