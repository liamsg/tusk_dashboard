# TUSK UX/UI Critique — Round 3 (Post-Update Review)
**Date:** 10 March 2026 (approx. 30 minutes after Round 2)
**Reviewer:** Claude (via browser walkthrough)
**App version:** Next.js app on Pi at 192.168.86.34:3000
**Flows tested:** Dashboard (desktop + mobile), Card detail (Goldman Sachs), To-Do creation + refresh, To-Do detail, Meeting Notes detail (edit), Browse briefing + cards view, Mobile responsive layout

---

## 0. Changes Since Round 2

The app received another significant update between reviews. The following Round 2 issues are now **resolved**:

| Issue | Status |
|-------|--------|
| To-do list doesn't refresh after creation | FIXED — new to-do appears immediately without page reload |
| Duplicate metadata on to-do detail | FIXED — only editable dropdowns shown, no redundant static text |
| No card summary/description field | FIXED — "SUMMARY" section with "Click to add" prompt |
| No Meeting Notes section on card detail | FIXED — "MEETING NOTES" section with "+ Link" button |
| No "Flagged for Discussion" on dashboard | FIXED — section appears at bottom with flagged items |
| No meeting note edit capability | FIXED — "Edit" button appears on hover over note body |
| No "My View / All" toggle on To-Dos | FIXED — toggle buttons at top of to-do list |
| No drag reorder for to-dos | FIXED — Move up / Move down arrow buttons on each to-do |
| To-do form defaults to wrong user | FIXED — defaults to current user (Liam) |
| No card linking during to-do creation | FIXED — "Link to card" dropdown present in creation form |
| Form panels overlapping page titles | FIXED — forms no longer overlap content |
| No "Waiting on you" vs "Waiting on others" split | FIXED — dashboard shows "WAITING ON YOU (LIAM)" and "WAITING ON THIRD PARTIES" |
| No "create to-do from meeting note" | FIXED — "+ Create to-do" button in meeting note Linked Items |
| Missing TUSK branding on mobile | FIXED — "TUSK" header with user name at top |
| Duplicate mobile navigation buttons | FIXED — only bottom nav bar remains |
| No "More" menu in mobile bottom nav | FIXED — "More" button replaces crowded nav items |
| Briefing mode missing "Waiting on external" | FIXED — "WAITING ON EXTERNAL" section with to-do + person details |
| Briefing mode categories too sparse | FIXED — shows card count + to-do count + status per category |

**Remaining from Round 1/2 (still present):**
- Avatar still shows "N" instead of "L" for Liam
- Tag double-hash bug: "##advisers" instead of "#advisers"
- Activity feed entries still inconsistently vague (some missing entity names)
- Activity feed items still not clickable
- No success toast notifications after mutations
- No category/subcategory rename capability
- Meeting note still doesn't show time (only date)
- No keyboard navigation in search results
- Meeting notes not included in Cmd+K search results
- No Quick-Add from search (+ card, + todo)

---

## 1. Bugs Still Present

### 1.1 BUG: Avatar shows wrong initial — "N" instead of "L"
- **Severity: LOW** (persists across all 3 rounds)
- Bottom-left avatar circle displays "N" for user "Liam"
- Visible on both desktop sidebar and mobile bottom nav
- On mobile, the "N" circle still partially overlaps the "Dashboard" label in the bottom nav bar
- Likely hardcoded or derived from wrong field

### 1.2 BUG: Meeting note tag double-hash — "##advisers"
- **Severity: LOW** (persists from Round 2)
- Both the meeting notes list and detail view render the first tag as "##advisers"
- Other tags render correctly ("#rothschild", "#cf")
- Visible on both list page and detail page

### 1.3 BUG: Activity feed entries missing entity names
- **Severity: MEDIUM** (persists from Rounds 1 and 2)
- Dashboard activity feed: "Updated card fields — Liam", "Linked reference to card — Liam", "Archived card — Liam" — none identify which card
- Briefing mode KEY DEVELOPMENTS: same vague entries
- Workstream cards: "Latest: Updated card fields" — doesn't say which card
- Some entries are correctly detailed: "Created todo 'Test refresh after creation'", "Created organisation 'Goldman Sachs'"
- The inconsistency is the core issue — the system clearly has entity names available for some actions but not others

### 1.4 BUG: Activity feed items not clickable
- **Severity: MEDIUM** (persists from Rounds 1 and 2)
- All activity entries on dashboard appear as static text
- "Created organisation 'Goldman Sachs'" should navigate to that organisation's detail page
- For a daily-use briefing tool, the inability to drill from activity to entity is a significant navigation gap

---

## 2. Dashboard — Final Assessment

### What works well
- **Time-aware greeting** — "Good afternoon, Liam." with date header sets a professional, personal tone
- **ATTENTION NEEDED** section with overdue to-dos highlighted in orange with "2d overdue" badge — immediately actionable
- **WAITING ON YOU (LIAM)** vs **WAITING ON THIRD PARTIES** split provides clear ownership model
- **KEY MILESTONES** with day-countdown and status badges — matches the spec vision perfectly
- **FLAGGED FOR DISCUSSION** section at bottom — now present with "Rothschild & Co" flagged
- **Workstream cards** show live stats (categories, cards, open to-dos) and latest activity
- The overall reading flow (Attention → This Week → Milestones → Activity → Workstreams → Flagged) is logical and progresses from urgent to informational

### Remaining issues
- Activity entries vague (see Bug 1.3)
- Activity entries not clickable (see Bug 1.4)
- **No overdue styling on "Review shareholder agreement" in THIS WEEK** — the same to-do that has orange "2d overdue" in ATTENTION NEEDED appears as a regular item under "WAITING ON YOU". It could be visually differentiated or omitted from THIS WEEK since it's already called out above
- **Due date format inconsistency** — "Friday" (relative), "Sunday" (relative), "17 March 2026" (absolute). Should be consistent: relative for this week, "17 Mar" (short absolute) for further out
- **"+ Add" on milestones feels exposed** — milestone creation is typically a setup-time action, not a daily one. The + Add prompt could be less prominent or hidden behind an edit mode

---

## 3. Card Detail — Final Assessment

### What works well
- **Full breadcrumb**: "Shareholder Value > Potential Investment Banks > Goldman Sachs" — provides complete navigational context
- **SUMMARY section** with "No summary yet. Click to add." — editable, inviting, properly positioned
- **MEETING NOTES section** with "+ Link" — enables cross-referencing to meeting notes
- **"Flag for discussion" button** — enables the discussion flagging workflow
- **Status dropdown** — inline and accessible
- **Clean section hierarchy**: Summary → Key People → To-Dos → References → Meeting Notes → Notes → Activity
- **Archive button** positioned at top-right, non-destructive

### Remaining issues
- **No prev/next navigation within category** — still must go back to browse to see sibling cards
- **Summary "Click to add" doesn't indicate it's a rich text field** — unclear whether it supports formatting or is plain text
- **Flag button doesn't indicate current state** — is this card flagged? The button says "Flag for discussion" regardless of state. Should toggle to "Flagged ✓" or similar when active

---

## 4. To-Do System — Final Assessment

### What works well
- **To-do list refreshes after creation** — the Round 2 bug is completely resolved
- **My View / All toggle** — filters to the current user's to-dos
- **Move up / Move down reorder buttons** — allows manual priority ordering
- **Ball-in-court grouping** — "Waiting on you (Liam)" and "Waiting on Third Parties" sections
- **Creation form** — defaults to current user, includes card linking dropdown, no longer overlaps page title
- **Detail page** — clean layout with Assigned/Ball-in-court dropdowns, due date, and full section structure (Involves, Linked Cards, References, Notes, Activity)
- **Overdue highlighting** — "Review shareholder agreement" shows "8 Mar" (past date) — though could be more visually distinct (see below)

### Remaining issues
- **Overdue to-dos not visually marked on the list** — "8 Mar" appears but in the same styling as other dates. Should be red/orange to match the dashboard's "2d overdue" treatment
- **No completion interaction** — the checkbox is visible on the detail page but completing a to-do isn't clearly indicated on the list view
- **"Test refresh after creation" has no due date shown** — due date wasn't set during creation, and there's no visual indicator that it's missing. Could show "No due date" in muted text
- **Move up/down buttons are always visible** — they clutter the list view. Consider showing them only on hover, or allowing drag reorder instead
- **No bulk complete / bulk archive** — as to-dos accumulate, managing them one-by-one will slow down

---

## 5. Meeting Notes — Final Assessment

### What works well
- **Edit button on note body** — appears on hover/click, enabling content editing (resolves Round 2 gap)
- **"+ Create to-do" in Linked Items** — allows inline to-do creation from meeting context
- **"+ Link" in Linked Items** — enables connecting to existing entities
- **Linked items show entity types** — "(card)", "(person)" labels are clear
- **REFERENCES section** added to meeting note detail
- **NOTES section** added for internal annotations

### Remaining issues
- **##advisers double-hash bug** — still present (see Bug 1.2)
- **No meeting time shown** — detail shows "10 Mar 2026" but not the time. Meeting time is useful context
- **No internal user attendees** — "Recorded by: Liam" is shown but the spec envisions attendees as a mix of internal + external. Only external attendee "Jane Smith (Rothschild & Co)" appears
- **Edit button is too subtle** — only appears on hover/click, with no visual affordance that the text is editable. A persistent small "Edit" link or pencil icon next to the section header would improve discoverability
- **Meeting notes still not in Cmd+K search results** — searching "Rothschild" returns cards, to-dos, people, orgs but NOT the meeting note titled "Call with Rothschild"

---

## 6. Briefing Mode — Final Assessment

### What works well
- **WAITING ON EXTERNAL section** — "Get fee proposal from Rothschild — Rothschild & Co (Jane Smith)" is exactly the kind of actionable context the spec envisioned
- **OPEN ACTIONS section** — "All clear — no open actions ✓" provides a clean status summary
- **CATEGORIES section** — now shows "Potential Investment Banks — 1 card all clear ✓" and "Corporate Finance Advisers — 1 card, 1 open to-do" — much richer than Round 2
- **Briefing/Cards toggle** is clean and obvious

### Remaining issues
- **KEY DEVELOPMENTS entries still vague** — "Updated card fields", "Linked reference to card" without entity names
- **No date range control** — "This Week" is hardcoded. For a Monday morning briefing, the user might want to see "Since Friday" or "Last 7 days"

---

## 7. Mobile View — Final Assessment

### What works well
- **TUSK header bar** — brand at left, user name at right, professional appearance
- **Bottom nav with "More" button** — Dashboard, Browse, To-Dos, People, More — clean and sufficient
- **No duplicate nav buttons** — the inline pill buttons from Round 1 are gone
- **Content reflows well** — milestones table, to-do lists, activity feed all adapt to narrow viewport
- **FLAGGED FOR DISCUSSION** visible on mobile — important for on-the-go review

### Remaining issues
- **Avatar "N" circle overlaps "Dashboard" label** — the positioned avatar sits on top of the first bottom nav item. Should be removed on mobile (user name is in the header) or repositioned
- **"More" menu contents not tested** — presumed to contain Meeting Notes, Archive, and possibly Log out

---

## 8. Cross-Cutting Issues Update

### 8.1 Activity feed quality (STILL THE BIGGEST UX GAP)
The activity feed is the spine of the audit trail, but its value is undermined by:
- ~50% of entries are vague ("Updated card fields", "Linked reference to card")
- ~50% are properly descriptive ("Created todo 'Send NDA to three parties'")
- None are clickable navigation links
- This affects: dashboard, card detail, workstream briefing mode, and workstream cards' "Latest" text
- **Recommendation:** Every activity entry should follow the pattern: `[Action] [entity type] "[entity name]" [preposition] [context entity name]` — e.g., "Linked reference 'Fee proposal PDF' to card 'Rothschild & Co'"

### 8.2 No toast/snackbar feedback
- Mutations (create, update, archive, link) complete silently
- Organisation creation, to-do creation, card creation — all work correctly but provide no visual confirmation
- A brief success toast would increase confidence, especially when the action occurs off-screen

### 8.3 Category/subcategory rename
- Still no way to rename categories or subcategories after creation
- For a tool in active use where naming conventions evolve, this forces archive-and-recreate

### 8.4 Avatar initial
- Persists across all 3 rounds — "N" instead of "L"
- Trivial to fix but noticeable on every page load

---

## 9. Updated Feature Gap Matrix

| Feature | Spec'd | Round 1 | Round 2 | Round 3 | Priority |
|---------|--------|---------|---------|---------|----------|
| Dashboard milestones | Yes | Missing | DONE | DONE | - |
| Global search (Cmd+K) | Yes | Missing | DONE | DONE | - |
| Dashboard workstream links | Yes | Missing | DONE | DONE | - |
| Briefing/Cards toggle | Yes | Missing | DONE | DONE | - |
| Search bar in sidebar | Yes | Missing | DONE | DONE | - |
| Card summary/description | Yes | Missing | Missing | DONE | - |
| Card meeting notes section | Yes | Missing | Missing | DONE | - |
| Meeting note edit | Yes | N/A | Missing | DONE | - |
| Flagged for Discussion | Yes | Missing | Missing | DONE | - |
| My View / All on To-Dos | Yes | N/A | Missing | DONE | - |
| To-do priority reorder | Yes | Unknown | Missing | DONE | - |
| To-do card linking at creation | Yes | N/A | Missing | DONE | - |
| Create to-do from meeting note | Yes | N/A | Missing | DONE | - |
| Briefing external wait items | Yes | Missing | Missing | DONE | - |
| Briefing category summaries | Yes | N/A | Sparse | DONE | - |
| Mobile TUSK header | Yes | Missing | N/A | DONE | - |
| Mobile "More" menu | Yes | Missing | N/A | DONE | - |
| To-do list refresh bug | N/A | N/A | BUG | FIXED | - |
| Duplicate metadata on to-do | N/A | N/A | BUG | FIXED | - |
| Form panel overlap | N/A | N/A | Noted | FIXED | - |
| Activity entry vagueness | N/A | Noted | Still present | Still present | HIGH |
| Activity entries not clickable | N/A | Noted | Still present | Still present | HIGH |
| Avatar wrong initial | N/A | Noted | Still present | Still present | LOW |
| Tag double-hash bug | N/A | N/A | BUG | Still present | LOW |
| Success toast notifications | Yes | Missing | Missing | Still missing | MEDIUM |
| Category/subcategory rename | Yes | Missing | Missing | Still missing | MEDIUM |
| Meeting note time display | Yes | N/A | Missing | Still missing | LOW |
| Meeting notes in search | Yes | N/A | Missing | Still missing | MEDIUM |
| Quick-add from search | Yes | Missing | Missing | Still missing | LOW |
| Keyboard nav in search | Yes | N/A | Missing | Still missing | LOW |

---

## 10. Velocity & Quality Assessment

### Development velocity
Between the three review rounds (~2 hours), **18 issues were resolved**. This is an extraordinary pace of iteration. The developer is clearly responsive, capable, and working in real-time to address feedback.

### Spec coverage
- **Round 1:** ~55% of spec features implemented
- **Round 2:** ~70% of spec features implemented
- **Round 3:** ~90% of spec features implemented

The remaining gaps are mostly polish and secondary features rather than core functionality.

### Quality of fixes
- Fixes are clean and consistent with existing patterns
- No new bugs introduced by the fixes
- The to-do refresh fix suggests proper revalidation was added
- The meeting note edit reveals on hover — a considered interaction choice

---

## 11. Positive Developments Since Round 2

1. **Card detail is now feature-complete** — breadcrumb, summary, meeting notes, flag for discussion — this was the most critical screen and it's now solid
2. **To-do system is now genuinely usable** — My View/All, reorder, card linking, proper refresh — this went from buggy to polished in one iteration
3. **Dashboard is now a real morning briefing** — attention needed, ownership split, flagged items — matches the spec vision
4. **Meeting note editing** — critical for a living document system, now available with tasteful hover-reveal
5. **Mobile is now clean** — header branding, "More" menu, no duplicate nav — ready for on-the-go use
6. **Briefing mode is comprehensive** — external wait, open actions, category summaries — this is the "executive summary" view the spec described
7. **"Create to-do from meeting note"** — this cross-entity workflow enables the key pattern of: meet someone → note it → create follow-up action

---

## 12. Final Recommended Priority Actions

### Immediate (data quality)
1. Make ALL activity feed entries include entity names consistently
2. Make activity feed items clickable links to referenced entities
3. Fix ##advisers double-hash tag parsing bug
4. Fix avatar initial (N → L)

### Short-term (usability polish)
5. Add success toast/snackbar after mutations (create, update, archive, link)
6. Add category/subcategory inline rename
7. Include meeting notes in Cmd+K search results
8. Add meeting note time (not just date)
9. Make overdue to-dos visually distinct on the to-do list (red/orange date)
10. Remove/reposition avatar circle on mobile to stop bottom nav overlap

### Lower priority (spec completeness)
11. Add Quick-Add from search (+ card, + todo syntax)
12. Add keyboard navigation (arrow keys + Enter) in search results
13. Add internal user attendees to meeting notes
14. Add prev/next navigation on card detail within category
15. Add "Flagged ✓" toggle state on flag button

---

## 13. Overall Verdict

TUSK has gone from a **functional prototype with significant gaps** (Round 1) to a **near-complete, genuinely usable deal management tool** (Round 3) in approximately 2 hours of iterative development. The core spec vision — a typography-led, executive-quality morning briefing and deal tracker for PE partners — is now clearly realised.

The remaining issues are primarily **data quality** (activity feed vagueness), **micro-interactions** (toasts, hover states), and **edge-case polish** (tag parsing, avatar initial). None of these block productive use of the tool.

**The app is ready for first real use** with the caveat that activity feed entries should be made descriptive and clickable before the audit trail accumulates too much vague data that can never be retroactively clarified.
