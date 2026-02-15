

# Ideas Popup Layout, Linked Idea Consistency, Video/Image Captions, and GitHub Integration Widget

This plan covers 5 distinct areas of work.

---

## 1. Ideas Detail Popup: Fixed Header/Footer with Scrollable Body

**Problem**: The popup resizes based on content, the X and next button are too close together, and navigation doesn't wrap around.

**Changes in `src/pages/Ideas.tsx` (`IdeaDetailModal`)**:

- **Fixed size**: Set `DialogContent` to a fixed height (e.g., `h-[85vh]`) instead of `max-h-[85vh]`, and use `flex flex-col` layout.
- **Frozen header**: Title row with nav arrows stays pinned at the top. Move the X button higher by removing the default DialogContent close button (`[&>button]:hidden`) and placing a custom one in the top-right corner with more spacing from the nav arrow.
- **Scrollable body**: The middle section (timestamp, badges, raw dump, summary, key features, tags) goes in a `flex-1 overflow-y-auto` container.
- **Frozen footer**: Delete, Scrap, Start Brainstorm buttons stay pinned at the bottom.
- **Wrap-around navigation**: Change `hasPrev`/`hasNext` to always be true (when there's more than 1 fresh idea). When at the end, wrap to index 0; when at the beginning, wrap to last index.

---

## 2. Linked Idea Overlay: Consistent Layout with Ideas Page

**Problem**: When clicking "Linked Idea" from a Project or Brainstorm page, the overlay shows a different layout than the Ideas page popup (category badge is above title vs. to the right of timestamp).

**Changes**:

- **`src/pages/BrainstormWorkspace.tsx`** (Linked Idea Dialog, lines 1109-1160): Restructure to show title first, then timestamp + category badge inline (matching the Ideas page layout: `Created {date} [Category Badge]`). Add `linkedIdea.created_at` to the query if not already fetched.

- **`src/pages/ProjectWorkspace.tsx`** (Linked Idea Overlay Dialog, lines 734-781): Same restructure -- title first, then timestamp + category badge inline below it.

---

## 3. Video/Image Captions in Reference Viewer

**Problem**: When a video or image has a description, it's not shown when viewing the content.

**Changes in `src/components/ReferenceViewer.tsx`**:

- **Image viewer**: After the `<img>` tag, if `reference.description` exists, render a caption below: `<p className="text-sm text-gray-400 text-center mt-3 px-4">{reference.description}</p>`
- **Video viewer**: After the `aspect-video` div, if `reference.description` exists, render the same caption style below the video player.

---

## 4. GitHub Integration Widget ("Code Pulse")

**Changes in `src/pages/ProjectWorkspace.tsx`**:

### 4a. Parse GitHub URL
Create a helper function `parseGitHubUrl(url: string)` that extracts `owner` and `repo` from URLs like `https://github.com/username/repo-name`.

### 4b. Fetch GitHub Data
Add a `useQuery` hook that fires when `githubUrl` contains a valid GitHub repo URL:
- Fetch repo details from `https://api.github.com/repos/{owner}/{repo}` (stars, forks, open issues count, description)
- Fetch latest 3 commits from `https://api.github.com/repos/{owner}/{repo}/commits?per_page=3`
- Fetch open issues from `https://api.github.com/repos/{owner}/{repo}/issues?state=open&per_page=5`
- All unauthenticated (public repos only)

### 4c. GitHub Activity Card UI
Place the widget in the **right column**, below the GitHub Repository input field. Only render when valid repo data is fetched.

Layout:
- **Header**: GitHub icon + repo name (clickable link to repo)
- **Stats Row**: Badges/pills for Stars, Forks, Open Issues counts
- **Recent Commits**: Compact list of last 3 commit messages with relative timestamps (using `date-fns` `formatDistanceToNow`)
- **README Tab**: A collapsible section that fetches `https://raw.githubusercontent.com/{owner}/{repo}/main/README.md` (or `master` as fallback) and renders it with `ReactMarkdown` + prose styling

### 4d. Error Handling
- If the repo is private or doesn't exist, show a subtle "Could not fetch repository data" message
- Rate limiting: GitHub allows 60 req/hr unauthenticated. Add `staleTime: 5 * 60 * 1000` to avoid re-fetching on every render

---

## Summary of All File Changes

| File | Changes |
|---|---|
| `src/pages/Ideas.tsx` | Fixed-size popup with frozen header/footer, scrollable body, wrap-around navigation, more spacing between X and nav arrow |
| `src/pages/BrainstormWorkspace.tsx` | Linked Idea overlay: move category badge below title, inline with timestamp |
| `src/pages/ProjectWorkspace.tsx` | Linked Idea overlay: same layout fix; GitHub widget with repo stats, commits, and README |
| `src/components/ReferenceViewer.tsx` | Add description captions below images and videos |

No database migration needed.

