# TUSK UX/UI Critique & Process Flow Review
**Date:** 10 March 2026
**Reviewer:** Claude (via browser walkthrough)
**App version:** Next.js app running on Pi at 192.168.86.34:3000
**Task performed:** Created "Potential Investment Banks" category under Shareholder Value workstream, added "Goldman Sachs" card

---

## 1. Task Completed: Adding a New Section & Bank

### Flow Tested
Dashboard -> Browse -> Shareholder Value (+ Category) -> "Potential Investment Banks" -> (+ Card) -> "Goldman Sachs" -> Card Detail

### Steps Required: 5 clicks + 2 text entries
1. Click "Browse" in sidebar
2. Click "+ Category" next to Shareholder Value
3. Type category name, click Save
4. Click "+ Card" on new category row
5. Type card name, click Save

**Verdict:** The creation flow is lean and fast — inline forms avoid page reloads and modal overhead. This is good. But there are several friction points and missing features detailed below.

---

## 2. Critical Issues (Bugs / Spec Gaps)

### 2.1 Dashboard workstream cards are NOT clickable
- The "Company Value & Stability" and "Shareholder Value" cards on the dashboard do not link to anything. Clicking them does nothing.
- **Impact:** Users see workstream summaries but can't drill into them. Violates the "morning briefing" principle — you read it, then you're stuck.
- **Fix:** Make workstream cards on dashboard link to `/browse/{workstreamId}`.

### 2.2 Missing Summary/Description field on Card Detail
- The REQUIREMENTS.md specifies cards should have a "Summary / description" field with an Edit button.
- The Goldman Sachs card detail page shows: title, category, status, Key People, To-Dos, References, Notes, Activity — but no summary/description section.
- **Impact:** Cards lack the most basic descriptive content area. Users can't write a brief about the entity.
- **Fix:** Add an editable Summary section between the status and Key People sections.

### 2.3 Missing Meeting Notes section on Card Detail
- Requirements specify "Meeting notes (many-to-many)" as a card field and the wireframe shows a "Meeting Notes" section.
- Current card detail page does not have this section.
- **Fix:** Add Meeting Notes section with ability to link existing meeting notes to a card.

### 2.4 User avatar shows wrong initial
- Bottom-left user area shows "N" in the avatar circle, but the logged-in user is "Liam".
- Should display "L" or the user's actual initial.
- **Fix:** Avatar component should derive initial from the user's name, not be hardcoded.

### 2.5 Missing dashboard sections (vs spec)
- **Key Milestones** — the spec shows a milestones countdown section. Not present on dashboard.
- **Flagged for Discussion** — spec shows flagged items section. Not present.
- **"Waiting on third parties"** grouping in THIS WEEK — not present (only shows generic "No upcoming to-dos").
- **Impact:** The dashboard is the most important screen ("morning briefing"). Missing these sections significantly reduces its value as an executive summary.

### 2.6 No global search (Cmd+K)
- Requirements specify a "Search (Cmd+K / Quick Add)" feature for global search across all entities.
- No search bar or keyboard shortcut visible on any page.
- **Impact:** With growing data, finding entities becomes navigation-heavy without search.

---

## 3. UX / Interaction Issues

### 3.1 Inline form input fields are too narrow
- When adding a category named "Potential Investment Banks" (25 chars), the input field truncated to show "otential Investment Banks" — the "P" was clipped.
- The input field appears to be ~150px wide regardless of content length.
- **Fix:** Make inline form inputs wider (at least 250px on desktop) or use a full-width approach. Consider auto-expanding inputs.

### 3.2 No success feedback after creation
- After creating a category or card, the page silently updates. No toast notification, no brief highlight, no confirmation.
- For a tool used by 3 senior people tracking a company sale, silent mutations can feel uncertain.
- **Fix:** Add a subtle toast ("Category created") or briefly highlight the new item with a fade-in animation.

### 3.3 No confirmation or undo for Archive action
- The card detail page has an "Archive" button with no guard. One tap and it presumably archives.
- Given the "nothing is ever deleted" principle, this is mitigated by restore — but accidental archives still create noise in the activity feed.
- **Fix:** Add a small confirmation step or a 5-second "Undo" toast after archiving.

### 3.4 Category name is not editable after creation
- Once a category is created, there's no visible way to rename it from the browse view.
- Typos in category names would require archiving and recreating.
- **Fix:** Allow inline editing of category/subcategory names (click to edit, or edit icon).

### 3.5 No drag-to-reorder for categories or cards
- Requirements mention drag reorder for to-dos. Categories and cards also have no apparent ordering mechanism.
- As the list grows, the inability to reorder categories will become frustrating.

### 3.6 The "+ Category" text button is very subtle
- The "+ Category" buttons appear in a light, muted style that's easy to miss, especially on the Browse overview page.
- For a core action (creating organizational structure), discoverability is low.
- **Fix:** Consider making the "+" actions slightly more prominent, or adding a CTA-style prompt when a workstream is empty.

---

## 4. Mobile-Specific Issues

### 4.1 Duplicate navigation elements
- On mobile, the dashboard bottom area shows inline pill buttons (Browse, To-Dos, People, Notes) AND a fixed bottom navigation bar (Dashboard, Browse, To-Dos, People, Notes).
- This is redundant and wastes vertical space on an already scroll-heavy mobile layout.
- **Fix:** Remove the inline pill buttons on mobile (or hide them when bottom nav is present). The bottom nav is sufficient.

### 4.2 User avatar overlaps bottom navigation
- The circular "N" avatar in the bottom-left overlaps/partially obscures the "Dashboard" label in the bottom navigation bar.
- **Fix:** Either move the avatar into the bottom nav bar as a proper element, or place it above the nav with appropriate spacing. Consider adding a small user profile row above the bottom nav.

### 4.3 Archive not accessible from mobile bottom nav
- The bottom nav shows: Dashboard, Browse, To-Dos, People, Notes — but no Archive link.
- "Meeting Notes" is truncated to just "Notes" which could be confusing (Notes section on cards vs Meeting Notes page).
- **Fix:** Consider a "More" menu item in the bottom nav that reveals Archive and user profile/logout, or use icons instead of text to fit more items.

### 4.4 No "TUSK" branding in mobile header
- The TUSK logo/brand disappears entirely in mobile view (sidebar hidden). There's no top header bar.
- **Fix:** Add a minimal top bar with the TUSK wordmark and perhaps the user avatar/menu.

---

## 5. Information Architecture & Process Flow

### 5.1 Browse page is flat — no at-a-glance summary
- The Browse overview page just lists workstream names with category names and card counts.
- The requirements spec shows a rich "Briefing mode" per workstream with key developments, open actions, and waiting-on-external summaries.
- **Fix:** Implement the Briefing/Cards toggle as specified. The briefing mode is essential for the "morning reading" use case.

### 5.2 No breadcrumb trail on Card Detail
- The Goldman Sachs card detail shows "Potential Investment Banks" as the category link, but not the full hierarchy: Shareholder Value > Potential Investment Banks > Goldman Sachs.
- Users lose context about which workstream they're in.
- **Fix:** Add a full breadcrumb: Workstream > Category > (Subcategory >) Card title.

### 5.3 Activity feed items on dashboard lack linking
- "Added note to card" in the activity feed doesn't say which card. Other items like "Created card 'Tikehau'" are better.
- The items don't appear to be clickable links to navigate to the referenced entity.
- **Fix:** Make all activity items link to the relevant entity. Ensure all activity descriptions include the entity name.

### 5.4 No way to navigate from card to sibling cards
- Once inside a card detail, the only navigation is "back" arrow to return. No way to go "next" or "previous" within the same category.
- For comparing investment banks side-by-side or reviewing them in sequence, this creates excessive back-and-forth.
- **Fix:** Consider prev/next navigation within category, or a sidebar card list.

---

## 6. Visual Design & Typography

### 6.1 Generally strong
- The muted, off-white/cream palette is appropriate for a PE-oriented tool. Typography-led hierarchy works well.
- Section headers (ATTENTION NEEDED, THIS WEEK, etc.) use well-styled small-caps that convey seriousness.
- The card chips in the browse view (showing title, status dot, people count) are clean and scannable.

### 6.2 Status dot is very small
- The grey "New" status indicator on cards in browse view is a tiny dot + text. At a glance across many cards, the color coding won't provide strong enough visual signal.
- **Fix:** Consider slightly larger status badges or a colored left-border on the card chip.

### 6.3 Empty states are functional but cold
- Empty states like "No subcategories or cards yet." are factual but don't guide the user.
- **Fix:** Add contextual guidance: "No cards yet. Click + Card to add your first potential investment bank." Tailor to the category context where possible.

### 6.4 Sparse use of the cream/warm palette
- The off-white background is nice but there's little warmth or texture in the content areas. It reads slightly sterile.
- The workstream cards on the dashboard have a subtle left-border accent, which is good — more of this visual language could help.

---

## 7. Feature Gaps vs Requirements

| Feature | Spec'd | Implemented | Priority |
|---------|--------|-------------|----------|
| Card summary/description | Yes | No | HIGH |
| Card meeting notes section | Yes | No | HIGH |
| Dashboard milestones | Yes | No | HIGH |
| Dashboard flagged items | Yes | No | MEDIUM |
| Global search (Cmd+K) | Yes | No | HIGH |
| Briefing mode on Browse | Yes | No | MEDIUM |
| Ball-in-court on To-Dos | Yes | Unknown | HIGH |
| Drag reorder To-Dos | Yes | Unknown | MEDIUM |
| Discussion flags on items | Yes | No | MEDIUM |
| Reference detail view | Yes | Unknown | LOW |
| Quick-add from search | Yes | No | LOW |

---

## 8. Positive Observations

1. **Inline creation is fast** — adding a category and card required no modals, no page reloads, minimal clicks. This is well done.
2. **Activity feed is immediate** — the Goldman Sachs card creation appeared instantly in the dashboard activity log. Good real-time feel.
3. **Card detail layout is clean** — sections are well-separated with headers and + Add actions. The pattern is consistent and learnable.
4. **Mobile responsive layout works** — sidebar correctly collapses to bottom nav. Content reflows well.
5. **Audit trail works** — the activity section on the card detail correctly logged "Liam Created card 'Goldman Sachs' — 10 Mar 2026".
6. **Soft architecture is sound** — the Workstream > Category > Subcategory > Card hierarchy provides good flexibility.
7. **Status dropdown on cards** — the status selector (New, In Progress, Done, On Hold) is inline and accessible.

---

## 9. Recommended Priority Actions

### Immediate (before first real use)
1. Make dashboard workstream cards clickable
2. Add card summary/description field
3. Fix avatar initial bug
4. Fix mobile nav overlap issues
5. Remove duplicate mobile navigation buttons

### Short-term (next sprint)
6. Add key milestones to dashboard
7. Implement global search
8. Add meeting notes section to card detail
9. Add breadcrumb navigation on card detail
10. Make activity feed items clickable links

### Medium-term
11. Implement briefing mode on Browse workstream pages
12. Add discussion flag functionality
13. Add category/subcategory rename capability
14. Improve empty state messaging
15. Add success toast notifications for mutations
