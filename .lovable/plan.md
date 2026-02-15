

# Add Version Number to Sidebar

## Change

**File**: `src/components/AppSidebar.tsx` (line 98)

Add a version badge next to "Brainstormer" in the sidebar header.

Current:
```tsx
<span className="font-semibold text-sidebar-foreground">Brainstormer</span>
```

Updated:
```tsx
<span className="font-semibold text-sidebar-foreground">Brainstormer</span>
<span className="text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">v0.1</span>
```

This adds a small, subtle version badge styled as a pill/chip right next to the app name. The version `v0.1` reflects this being an early build. It can be bumped manually as the app evolves.

No other files are affected.
