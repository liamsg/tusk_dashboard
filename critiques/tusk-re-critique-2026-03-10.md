# TUSK Re-Critique: Comprehensive Feature & UX Review
**Date:** 10 March 2026
**Reviewer:** Claude (via API + HTML parsing walkthrough)
**App version:** Next.js 16.1.6, running on Pi at localhost:3000
**Method:** Authenticated API testing, HTML page analysis, source code review, end-to-end data creation

---

## 1. Test Procedure

Created a full set of test data via the API to exercise every feature:
- Category: "Corporate Finance Advisers" under Shareholder Value workstream
- Card: "Rothschild & Co" with summary, status set to In Progress
- Organisation: "Rothschild & Co" (Corporate Finance type)
- Person: "Jane Smith" (MD at Rothschild, linked to card)
- To-Do: "Get fee proposal from Rothschild" (external ball-in-court, linked to card and person)
- Meeting Note: "Call with Rothschild -- intro discussion" (with attendee Jane Smith, linked to card)
- 3 Milestones: Data Room Ready (1 May), Information Memorandum (1 Jun), Management Presentations (15 Jul)
- Note: added to card
- Reference: "Intro email from Jane Smith" (email type, linked to card)
- Flagged the Rothschild card for discussion
- Archived and restored the Tikehau card
- Created an overdue todo and a "this week" todo to test dashboard grouping
- Tested search API with "Rothschild" query

All pages tested: Dashboard, Browse (overview), Browse (workstream briefing mode), Browse (workstream cards mode), To-Dos, People, Meeting Notes, Archive, Card Detail, Person Detail, Meeting Note Detail, Todo Detail.

---

## 2. What's Been Fixed (from Original Critique)

### 2.1 Dashboard workstream cards are now clickable (was 2.1)
Workstream summary cards on the dashboard are now wrapped in `<Link>` components pointing to `/browse/{workstreamId}`. Clicking "Company Value & Stability" correctly navigates to that workstream's briefing view. **FIXED.**

### 2.2 Card summary/description field now exists (was 2.2)
The card detail page now has a "Summary" section with an `EditSummary` component. Click-to-edit with textarea, Save/Cancel buttons. The Rothschild card shows its summary text correctly. **FIXED.**

### 2.3 Meeting Notes section on Card Detail now exists (was 2.3)
The card detail page now has a "Meeting Notes" section with a "+ Link" button (`LinkMeetingNoteInline`). Linked meeting notes display with date and title, and link through to the meeting note detail page. **FIXED.**

### 2.4 User avatar now shows correct initial (was 2.4)
The sidebar avatar now uses `{user.name?.charAt(0)?.toUpperCase() ?? "?"}` -- displays "L" for Liam, not the hardcoded "N". **FIXED.**

### 2.5 Dashboard now has all major sections (was 2.5)
- **Key Milestones** -- present, showing countdown in days with dotted-line formatting. Shows "Data Room Ready ... 1 May (52 days)".
- **Flagged for Discussion** -- present, showing flagged cards with flag icon.
- **"Waiting on third parties"** grouping in This Week -- present with external ball-in-court todos showing person name and org.
- **Attention Needed** (overdue) -- present with warning icon and days-overdue count.
**FIXED.**

### 2.6 Global search (Cmd+K) now implemented (was 2.6)
A `SearchDialog` component exists with:
- Cmd+K / Ctrl+K keyboard shortcut to open
- Search button in sidebar with "Search..." text and Cmd+K hint
- Debounced search across cards, todos, people, organisations, meeting notes, refs, and notes
- Results grouped by type with navigation to each entity
- Backdrop blur overlay, ESC to close
**FIXED.**

### 3.1 Inline form inputs are now wider (was 3.1)
The `InlineAddForm` component now uses `w-full md:w-64` (256px on desktop, full-width on mobile). **FIXED.**

### 3.2 Success toast notifications now present (was 3.2)
A `Toast` component exists (`/src/components/Toast.tsx`) with `showToast()` helper. The `InlineAddForm` calls `showToast("Created successfully")` after creation. Toast appears bottom-right, auto-dismisses after 3 seconds with fade animation. **FIXED.**

### 3.3 Archive now has confirmation dialog (was 3.3)
The `ArchiveButton` component now calls `confirm("Archive this card? It will be moved to the archive.")` before proceeding. **FIXED.**

### 3.4 Category names are now editable (was 3.4)
An `EditableCategoryName` component exists using a generic `EditableTitle` component. Categories can be renamed inline via the PATCH API endpoint at `/api/categories/[id]`. **FIXED.**

### 4.1 Duplicate mobile navigation eliminated (was 4.1)
The layout now has a clean separation: `hidden md:flex` for desktop sidebar, `md:hidden` for mobile with header + bottom nav. No duplicate pill buttons. **FIXED.**

### 4.2 User avatar overlap fixed (was 4.2)
Mobile layout uses a fixed top header bar with "Tusk" branding on the left and user first name on the right. The bottom nav is separate with proper fixed positioning. No overlap. **FIXED.**

### 4.3 Archive accessible from mobile (was 4.3)
The `BottomNav` has a "More" menu that reveals "Meetings", "Archive", and "Log out" options. **FIXED.**

### 4.4 TUSK branding on mobile (was 4.4)
Mobile header bar shows "Tusk" wordmark on the left. **FIXED.**

### 5.1 Briefing mode implemented (was 5.1)
The workstream page now has a Briefing/Cards toggle. Briefing mode shows:
- "Key Developments This Week" with recent activity
- "Open Actions" with linked todos
- "Waiting on External" with ball-in-court external items
- "Categories" summary with card counts and status
**FIXED.**

### 5.2 Full breadcrumb on Card Detail (was 5.2)
The card detail page now shows: `Shareholder Value > Corporate Finance Advisers > Rothschild & Co` with links to the workstream and category. Also shows "Card X of Y" when siblings exist. **FIXED.**

### 5.3 Activity feed items now have links (was 5.3)
Activity feed items on the dashboard use `<Link>` components. Cards link to `/cards/{id}`, todos to `/todos/{id}`, people to `/people/{id}`, meeting notes to `/meeting-notes/{id}`, categories to their workstream browse page. **PARTIALLY FIXED** -- see 3.1 below.

### 5.4 Prev/next sibling navigation on Card Detail (was 5.4)
Card detail page now includes prev/next navigation arrows when the card has siblings in the same category/subcategory. Shows "Card X of Y" count. **FIXED.**

---

## 3. New Issues Found

### 3.1 Activity feed: "note", "ref", and "milestone" entity types not linked
The `activityHref()` function in the dashboard handles `card`, `todo`, `person`, `meeting_note`, `category`, `subcategory`, and `organisation` entity types. But it does NOT handle:
- `"note"` -- "Added note to card" renders as plain text, not clickable
- `"ref"` -- "Created reference X" renders as plain text
- `"milestone"` -- "Created milestone X" renders as plain text

**Impact:** These items appear in the activity feed but users can't click through to see what was changed.
**Fix:** Notes should link to the parent entity (the note's `entity_id`). Refs need a detail page or should link to the entity they're attached to. Milestones could link to a milestones management page (see 3.6).

### 3.2 Reference linking inconsistency (API bug)
When creating a reference via POST `/api/references` with `entity_type` and `entity_id`, the reference is stored in the `ref_entities` junction table. However, the card detail page reads references from the `card_refs` junction table. These are different tables, so a reference created via the API with `entity_type: "card"` will NOT appear on the card detail page unless also separately linked via PATCH `/api/cards/{id}` with `link_ref_id`.

**Impact:** References created via the references API won't show up on card detail pages. The `AddReferenceForm` component on the card detail page likely uses a different mechanism, but the underlying data model has two competing link mechanisms for the same relationship.
**Fix:** Either: (a) have the references POST API also write to `card_refs` when `entity_type === "card"`, or (b) have the card detail page query `ref_entities` instead of `card_refs`, or (c) consolidate to a single junction approach.

### 3.3 Dashboard todos in "This Week" and "Attention Needed" are not clickable
The overdue items in "Attention Needed" and the todo items in "This Week" are rendered as plain `<span>` elements. Users can see the todo title and due date but cannot click through to the todo detail page.

**Impact:** The dashboard is a read-only briefing for these items. Users must navigate to the To-Dos page separately to interact with them.
**Fix:** Wrap todo titles in `<Link href={/todos/${todo.id}}>` components.

### 3.4 Flagged-for-discussion items on dashboard are not clickable
The "Flagged for Discussion" section renders card titles as plain `<span>` text. Users can see which cards are flagged but cannot click through to them.

**Impact:** Minor friction -- users have to use search or browse to find the flagged card.
**Fix:** Wrap flagged card titles in `<Link href={/cards/${card.id}}>` components.

### 3.5 No organisation detail page
There is no frontend route for viewing an organisation's detail. The API endpoint `/api/organisations/[id]` exists, but there is no page at `/organisations/{id}` or similar. The search dialog maps organisation results to `/people` (the list page) rather than an org detail page.

**Impact:** Users can create organisations and see them listed on the People page, but cannot view a full detail page with linked cards, people, notes, and activity -- all fields specified in REQUIREMENTS.md for the Organisation entity.
**Fix:** Create an organisation detail page at `/people/org/{id}` or `/organisations/{id}` with summary, linked cards, people list, notes, references, and activity sections.

### 3.6 No milestones management page
Milestones can be created via the API and display on the dashboard, but there is no dedicated page to manage them (edit, mark as complete, reorder, delete). The dashboard shows them read-only.

**Impact:** Users cannot edit milestone dates, descriptions, or statuses without API calls. As the sale process progresses, milestone management becomes critical.
**Fix:** Add a milestones section -- either a dedicated page or a management panel accessible from the dashboard.

### 3.7 Greeting always says "Good morning" regardless of time
The dashboard greeting is hardcoded to "Good morning, {firstName}." at all times of day. At 3pm or 10pm, this reads oddly.

**Impact:** Very minor, but noticeable for an app emphasising polish and the "morning briefing" feel.
**Fix:** Add time-based greeting: morning (before noon), afternoon (noon-6pm), evening (after 6pm).

### 3.8 No reference detail page
Clicking a reference from the search dialog navigates to `/refs/{id}`, which returns a 404. No frontend route exists for reference detail. REQUIREMENTS.md specifies a "Reference Detail" screen (section 11) showing type, date, detail text, and linked entities.

**Impact:** References are visible inline on cards but cannot be viewed in full detail with their cross-entity links.
**Fix:** Create a reference detail page.

### 3.9 Activity descriptions could be more specific
Some activity descriptions are generic: "Updated card fields", "Linked person to card", "Added note to card". These don't include the entity name being linked or the specific field changed.

**Impact:** The activity feed loses context -- "Linked person to card" doesn't say which person or which card.
**Fix:** Enrich descriptions: "Linked Jane Smith to Rothschild & Co", "Updated summary on Rothschild & Co", etc.

### 3.10 "Request pitch deck from Goldman Sachs" todo shows full date instead of relative day
On the dashboard "This Week" section, the todo due March 17 shows "17 March 2026" instead of "Tuesday" (which is what the `relativeDay` function should return for dates 2-6 days away). This is because March 17 is exactly 7 days from March 10, which falls outside the `diff <= 6` check in `relativeDay()`.

**Impact:** Minor inconsistency -- some dates show relative days and others show full dates within the same section.
**Fix:** Adjust the boundary or use a simpler "next Tue" format for the upcoming week.

---

## 4. Feature Completeness Check vs REQUIREMENTS.md

| Feature | Spec'd | Implemented | Status vs Original |
|---------|--------|-------------|-------------------|
| Card summary/description | Yes | **Yes** | FIXED |
| Card meeting notes section | Yes | **Yes** | FIXED |
| Dashboard milestones | Yes | **Yes** | FIXED |
| Dashboard flagged items | Yes | **Yes** | FIXED |
| Global search (Cmd+K) | Yes | **Yes** | FIXED |
| Briefing mode on Browse | Yes | **Yes** | FIXED |
| Ball-in-court on To-Dos | Yes | **Yes** (grouping on todos page + dashboard) | CONFIRMED |
| Drag reorder To-Dos | Yes | **Partial** (up/down arrows, not drag) | NEW NOTE |
| Discussion flags on items | Yes | **Yes** (flag button on cards, dashboard section) | FIXED |
| Reference detail view | Yes | **No** | STILL MISSING |
| Quick-add from search | Yes | **No** | STILL MISSING |
| Organisation detail page | Yes | **No** | NEW GAP FOUND |
| Milestones management | Yes | **Partial** (API exists, no UI for edit/complete) | NEW GAP FOUND |
| Toast notifications | Yes | **Yes** | FIXED |
| Archive confirmation | Yes | **Yes** (browser confirm dialog) | FIXED |
| Category rename | Yes | **Yes** (EditableCategoryName) | FIXED |
| Breadcrumb navigation | Yes | **Yes** (full path with links) | FIXED |
| Prev/next card navigation | Yes | **Yes** (sibling nav with count) | FIXED |
| Activity feed links | Yes | **Partial** (most types linked, note/ref/milestone not) | PARTIALLY FIXED |
| Mobile header with branding | Yes | **Yes** | FIXED |
| Mobile "More" menu | Yes | **Yes** (meetings, archive, logout) | FIXED |
| Notes on everything | Yes | **Yes** (AddNoteForm on cards, todos, people, meetings) | CONFIRMED |
| References on everything | Yes | **Yes** (AddReferenceForm on cards, todos, meetings) | CONFIRMED |

---

## 5. Positive Observations

1. **Massive progress since original critique.** Of the 15 recommended priority actions in the original critique, 13 have been fully addressed and 2 partially addressed. This is exceptional throughput.

2. **Dashboard is now a genuine "morning briefing."** All major sections from the spec wireframe are present: Attention Needed, This Week (with ball-in-court grouping), Key Milestones (with day countdown and dotted-line formatting), Activity Feed, Workstream Summaries, and Flagged for Discussion. The layout closely matches the REQUIREMENTS.md wireframe.

3. **Briefing mode is excellent.** The workstream briefing view with "Key Developments", "Open Actions", "Waiting on External", and "Categories" summary is exactly what the spec calls for. The toggle between Briefing and Cards mode is clean.

4. **Card detail page is comprehensive and well-structured.** Shows: summary (editable), status (inline dropdown), breadcrumb, key people (with contact details and relationship), to-dos (with ball-in-court indicator), references (with type icons), meeting notes (linked), notes (timestamped), and activity log. Plus flag/archive buttons and sibling navigation.

5. **Toast notifications add polish.** The `showToast` system provides feedback for mutations, addressing the "silent updates" concern from the original critique.

6. **Search is well-implemented.** Cmd+K opens a modal with instant search across all 7 entity types, grouped results, and keyboard navigation (ESC to close). The sidebar search trigger with keyboard hint is discoverable.

7. **Ball-in-court is properly implemented.** Both the To-Dos page and the dashboard correctly group items by "Waiting on you", "Waiting on {other user}", and "Waiting on Third Parties" with person/org details shown for external items.

8. **Activity feed items are now navigable links.** Most activity items on the dashboard are clickable, taking users directly to the referenced entity.

9. **Mobile layout is clean.** Separate desktop (sidebar) and mobile (header + bottom nav with "More" menu) layouts. No overlap, no redundancy. TUSK branding visible on both.

10. **Person detail page is thorough.** Shows all contact details, relationship description, linked cards (with category context), meeting notes, and activity. Missing only the "To-Dos involving" section (shows "No linked to-dos" even though Jane is ball-in-court person on a todo).

11. **Meeting note detail page is feature-rich.** Shows attendees with org names, tags, full content, linked items (cards and people), references section, notes section, and activity log.

12. **Todo detail page has proper structure.** Shows assignment controls (inline user buttons), ball-in-court toggle (Us/External/On Hold), description, linked cards with category breadcrumb, people section, references, notes, and activity.

---

## 6. Remaining Gaps (Priority Order)

### HIGH Priority
1. **Dashboard todo/flagged items not clickable** -- Quick win. Wrap in `<Link>` components. (Issues 3.3 and 3.4)
2. **Reference linking inconsistency** -- API creates ref_entities but card detail reads card_refs. Data integrity issue. (Issue 3.2)
3. **Activity feed note/ref/milestone links missing** -- 3 entity types not handled in activityHref. (Issue 3.1)

### MEDIUM Priority
4. **Organisation detail page missing** -- Spec'd entity with no frontend view. (Issue 3.5)
5. **Reference detail page missing** -- Spec'd screen (section 11 of REQUIREMENTS.md). (Issue 3.8)
6. **Milestones management UI missing** -- Can create via API but no edit/complete/delete UI. (Issue 3.6)
7. **Activity descriptions too generic** -- "Linked person to card" should name the person and card. (Issue 3.9)

### LOW Priority
8. **Quick-add from search not implemented** -- Spec mentions "+ card", "+ todo" quick-add from search dialog.
9. **Drag reorder not implemented** -- Up/down arrows work but true drag-and-drop is spec'd.
10. **"Good morning" always** -- Should be time-aware greeting. (Issue 3.7)
11. **Week boundary date display** -- Minor date formatting edge case. (Issue 3.10)
12. **Person detail "To-Dos involving"** -- Shows "No linked to-dos" even when the person is `ball_in_court_person_id` on a todo (the query likely only checks `todo_people` join table, not `ball_in_court_person_id`).

---

## 7. Recommended Next Actions

### Immediate (quick wins, < 1 hour each)
1. Make dashboard overdue items, "This Week" todos, and flagged cards clickable `<Link>` components
2. Add `"note"`, `"ref"`, and `"milestone"` handling to `activityHref()` in dashboard
3. Fix reference linking -- when POST `/api/references` has `entity_type: "card"`, also insert into `card_refs`
4. Make greeting time-aware

### Short-term (next session)
5. Create organisation detail page with people list, linked cards, notes, activity
6. Create reference detail page per REQUIREMENTS.md spec
7. Add milestones management UI (inline edit on dashboard or dedicated section)
8. Enrich activity log descriptions to include entity names

### Medium-term
9. Implement quick-add from search dialog
10. Add true drag-and-drop reorder for to-dos
11. Fix person detail "To-Dos involving" to also check `ball_in_court_person_id`
12. Consider adding a "Subcategory" detail view for expanded card browsing
