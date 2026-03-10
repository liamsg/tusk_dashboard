# TUSK UX/UI Critique — Round 2 (Post-Update Review)
**Date:** 10 March 2026 (approx. 1 hour after Round 1)
**Reviewer:** Claude (via browser walkthrough)
**App version:** Next.js app on Pi at 192.168.86.34:3000
**Flows tested:** To-do creation, Organisation creation, Meeting Notes detail, Search (Cmd+K), Archive, Briefing/Cards view toggle, Dashboard with live data

---

## 0. Changes Since Round 1

The app was significantly updated between reviews. The following Round 1 issues are now **resolved**:

| Issue | Status |
|-------|--------|
| Dashboard workstream cards not clickable | FIXED — now link to workstream browse |
| Missing Key Milestones on dashboard | FIXED — shows Data Room Ready, IM, Mgmt Presentations with countdown |
| Missing global search (Cmd+K) | FIXED — excellent cross-entity search modal |
| Missing Briefing mode on Browse | FIXED — Briefing/Cards toggle implemented |
| Missing search bar in sidebar | FIXED — search input with Cmd+K hint |

**Remaining from Round 1 (still present):**
- Avatar still shows "N" instead of "L" for Liam
- Card detail still missing Summary/Description editable field
- No Meeting Notes section on Card detail page
- No "Flagged for Discussion" section on dashboard
- Inline form input fields still narrow
- No success toast notifications after mutations
- No category/subcategory rename capability

---

## 1. New Bugs Found

### 1.1 BUG: To-do list doesn't update after creation (requires page refresh)
- **Severity: HIGH**
- Created a to-do "Request pitch deck from Goldman Sachs" via the + New form
- After clicking "Create To-Do", the form closed but the page showed a blank list — no to-do visible, and the empty state message also disappeared
- Had to perform a full page refresh (F5) for the to-do to appear
- This is a rendering/revalidation bug — the page likely needs `revalidatePath()` or `router.refresh()` after creation
- **Contrast:** Organisation creation on the People page updates the list immediately. This inconsistency is confusing.

### 1.2 BUG: To-do detail shows duplicated metadata
- **Severity: MEDIUM**
- The to-do detail page displays "Assigned" and "Ball in court" both as editable dropdowns at the top AND as static text below ("Assigned to: Liam  Due: 17 Mar" and "Ball in court: External")
- This is redundant and confusing — which one is the "real" one? The editable dropdowns should replace the static text, not sit alongside it.

### 1.3 BUG: Meeting note tag shows double hash — "##advisers"
- **Severity: LOW**
- In both the meeting notes list and detail view, the first tag renders as "##advisers" instead of "#advisers"
- Other tags render correctly ("#rothschild", "#cf")
- Likely a parsing issue: if the user typed "#advisers" and the code prepends another "#" for display, or the data was stored as "##advisers"

### 1.4 BUG: Activity feed entries missing entity names
- **Severity: MEDIUM**
- Several dashboard activity items are vague: "Linked reference to card", "Linked meeting note to card", "Added note to card", "Linked person to card"
- These don't say WHICH card — making them useless for scanning
- Requirement states: "human-readable sentences, not 'user X performed action Y'"
- Some entries ARE good: "Created organisation 'Goldman Sachs'", "Created milestone 'Data Room Ready'" — so this is inconsistent

### 1.5 BUG: To-Do creation form defaults "Assign to" to wrong user
- **Severity: LOW**
- Form defaults to "Kapil" (alphabetically first user) instead of the current user "Liam"
- Should default to the logged-in user since you typically create to-dos assigned to yourself

---

## 2. To-Do Creation Flow Critique

### What works well
- Form has all the right fields: Title, Description, Assign to, Due date, Ball in court
- Keyboard shortcut (Cmd+Enter to save) is a nice touch for power users
- Ball-in-court grouping on the list view ("WAITING ON THIRD PARTIES") is excellent
- To-do detail page has good section structure (Involves, Linked Cards, References, Notes, Activity)

### Issues
- **Form overlaps page title** — the inline form panel sits on top of the "To-Dos" heading, creating a jarring visual. Should push content down or use a proper overlay
- **No linked card option during creation** — when creating a to-do about Goldman Sachs, there's no way to link it to the Goldman Sachs card during creation. You must create first, then navigate to detail, then link. Spec shows linking should be possible from context
- **No "My View / All" toggle** — spec shows filtered views for the to-do list. Currently shows all to-dos without filter options
- **No drag reorder** — spec mentions manual drag-reorder for priority. Not visible
- **Due date formatting inconsistent** — on dashboard, one to-do shows "Sunday" (relative day) while another shows "17 March 2026" (full date). Should use consistent format, preferably relative for this week and absolute for further out

---

## 3. People / Organisation Flow Critique

### What works well
- Organisation creation form is clean with sensible fields (Name, Type, Website, Summary)
- List updates immediately after creation (unlike to-dos)
- Search bar and filter tabs (All / Organisations / People) are well placed
- Person entries show organisation, role, and email in a scannable single line

### Issues
- **Form panel overlaps page title** — same layout overlap issue as to-dos
- **No way to add a Person to an Organisation during org creation** — must create org, then separately create person. Would be nice to have inline "add first contact" during org creation
- **Organisation detail not directly accessible from list** — clicking the org name/row doesn't navigate (or it's not obvious it does). Need to verify this
- **No visual grouping indicator** — people under an org are indented but there's no connecting visual (line, border, background) to clearly show hierarchy

---

## 4. Meeting Notes Critique

### What works well
- List view is excellent: date, title, attendees, preview text, and tags all visible at a glance
- Detail view shows full note content with good hierarchy
- "Linked Items" section correctly shows entity types in parentheses: "(card)", "(person)"
- "+ Link" button allows connecting to existing entities
- "All tags" filter dropdown on list page is useful

### Issues
- **No Edit button for meeting note content** — once created, the note body appears read-only. Users need to edit notes (typos, additions). This is a critical missing interaction
- **No time shown** — the spec shows "12 Mar 2026, 14:30" but the detail only shows "10 Mar 2026". Time of meeting is useful context
- **No internal user attendees** — spec shows attendees as a mix of internal users and external people. Current view only shows "Jane Smith (Rothschild & Co)" but not which internal users attended
- **Tag storage bug** — "##advisers" double-hash issue (see Bug 1.3)
- **No "create to-do from this note" affordance** — spec mentions ability to create to-dos inline from meeting notes. Not visible

---

## 5. Search (Cmd+K) Critique

### What works well
- **Excellent implementation** — fast, grouped by entity type, shows status badges and description previews
- Cross-entity search across Cards, To-Dos, People, Organisations
- Results are immediately actionable (clickable to navigate)
- ESC to close works
- Modal overlay with dimmed background is standard and clear

### Issues
- **No "Quick Add" capability** — spec mentions typing "+ card" or "+ todo" from search to quick-create. Only search is implemented, not quick-add
- **No keyboard navigation** — can't use arrow keys to move through results and Enter to select (would need to test this more)
- **Meeting notes not in search results** — searching "Rothschild" returned cards, to-dos, people, and organisations, but did NOT return the meeting note titled "Call with Rothschild — intro discussion". Meeting notes should be searchable

---

## 6. Dashboard (Morning Briefing) — Updated Assessment

### What works well
- **Dramatically improved** from Round 1 — now genuinely reads as a morning briefing
- Key Milestones with day-countdown matches the spec vision perfectly
- THIS WEEK section with ball-in-court grouping provides actionable overview
- Activity feed is immediate and shows entity names (mostly)
- Workstream cards are now clickable and show live stats

### Remaining issues
- **No "Flagged for Discussion" section** — spec shows this as a key dashboard component for items users want to discuss as a group
- **Activity items not clickable** — clicking "Created organisation 'Goldman Sachs'" should navigate to that organisation. Currently appears to be static text
- **Activity entries inconsistently detailed** — some include entity names, some don't (see Bug 1.4)
- **No "Waiting on you" vs "Waiting on others" split in THIS WEEK** — spec shows separate sections for the current user's to-dos vs other users'. Currently everything is under "WAITING ON THIRD PARTIES" without differentiating whose action it is
- **Workstream "Latest" activity is vague** — "Latest: Linked reference to card" doesn't say which card. Should be "Latest: Linked reference to Rothschild & Co"

---

## 7. Briefing Mode on Workstream Browse

### What works well
- **Toggle exists and works** — Briefing/Cards switch is clean and obvious
- Briefing mode shows: Key Developments This Week, Open Actions, Categories
- Cards mode shows the familiar hierarchy with + Subcategory / + Card actions

### Issues
- **"Archived card" in developments is vague** — says "Archived card — Liam, 1m ago" without naming which card. Should say "Archived card 'Tikehau'"
- **No "Waiting on external" section** — spec's briefing mode shows external wait items. Not visible
- **Categories section in briefing is too sparse** — just shows "Potential Lenders — 0 cards". Spec shows card count + to-do count + status summary per category

---

## 8. Archive Critique

### What works well
- Shows entity type "(card)" clearly
- Attribution: "Archived by Liam · 10 Mar"
- One-click "Restore" button
- Search and filter by type available

### Issues
- **No confirmation before restore** — clicking Restore should show brief confirmation or undo toast
- **Archived item not clickable** — can't click "Tikehau" to preview what's in the card before deciding to restore
- **No bulk operations** — if many items are archived, no way to select multiple for batch restore

---

## 9. Cross-Cutting UX Issues

### 9.1 Inconsistent mutation feedback
- Organisation creation: list updates instantly
- To-do creation: list does NOT update (requires refresh)
- Card creation (Round 1): list updates instantly
- This inconsistency undermines user trust. All mutations should have consistent behaviour

### 9.2 Form panels overlap page titles
- Every creation form (To-Do, Organisation, Person) renders as an inline panel that visually overlaps the page heading and action buttons behind it
- Should either: (a) push content down, (b) use a proper modal/dialog, or (c) use a slide-out panel

### 9.3 No edit capability on key content
- Meeting note body: no edit
- Card summary/description: field doesn't exist yet
- Category/subcategory names: no rename
- To-do title: appears not editable from detail
- For a tool tracking a live deal process, the inability to edit after creation is a significant friction point

### 9.4 No confirmation before destructive actions
- Archive buttons have no guard (no confirm dialog, no undo toast)
- Restore button has no confirmation
- While soft-delete makes this less dangerous, accidental actions still pollute the activity feed

### 9.5 Avatar initial still wrong
- Shows "N" for user "Liam" — persists from Round 1. Possibly hardcoded or derived from a different field

---

## 10. Updated Feature Gap Matrix

| Feature | Spec'd | Round 1 | Round 2 | Priority |
|---------|--------|---------|---------|----------|
| Dashboard milestones | Yes | Missing | DONE | - |
| Global search (Cmd+K) | Yes | Missing | DONE | - |
| Dashboard workstream links | Yes | Missing | DONE | - |
| Briefing/Cards toggle | Yes | Missing | DONE | - |
| Search bar in sidebar | Yes | Missing | DONE | - |
| Card summary/description | Yes | Missing | Still missing | HIGH |
| Card meeting notes section | Yes | Missing | Still missing | HIGH |
| Meeting note edit | Yes | N/A | Missing | HIGH |
| Flagged for Discussion | Yes | Missing | Still missing | MEDIUM |
| Quick-add from search | Yes | Missing | Still missing | LOW |
| My View / All on To-Dos | Yes | N/A | Missing | MEDIUM |
| Drag reorder To-Dos | Yes | Unknown | Missing | MEDIUM |
| Discussion flags | Yes | Missing | Still missing | MEDIUM |
| To-do list refresh bug | N/A | N/A | BUG | HIGH |
| Duplicate metadata on to-do detail | N/A | N/A | BUG | MEDIUM |
| Activity entry vagueness | N/A | Noted | Still present | MEDIUM |
| Avatar wrong initial | N/A | Noted | Still present | LOW |
| Tag double-hash bug | N/A | N/A | BUG | LOW |

---

## 11. Positive Developments Since Round 1

1. **Search is genuinely excellent** — cross-entity, fast, well-grouped, with status indicators
2. **Milestones with countdown** match the spec vision perfectly and make the dashboard feel like a real war room
3. **Briefing mode** adds significant value to the Browse view — the spec's vision of briefing vs cards is now tangible
4. **Workstream clickability** connects the dashboard to the working views — critical for the morning briefing flow
5. **Ball-in-court grouping** on both dashboard and to-do list is working and provides clear actionability
6. **Meeting note with linked items** and type labels shows the cross-referencing system working well
7. **Activity feed is rich** — even with the vagueness issue, the volume and recency of entries shows the audit trail is solid

---

## 12. Recommended Priority Actions (Updated)

### Immediate (bugs)
1. Fix to-do list not refreshing after creation
2. Remove duplicate metadata on to-do detail page
3. Fix ##advisers double-hash tag bug
4. Fix avatar initial (N → L)

### High priority (critical missing features)
5. Add card summary/description editable field
6. Add edit capability for meeting note content
7. Make activity feed entries include entity names consistently
8. Make activity feed items clickable links

### Medium priority (spec completeness)
9. Add Meeting Notes section to card detail
10. Add "Flagged for Discussion" to dashboard
11. Add "My View / All" toggle to To-Dos
12. Add inline to-do creation from meeting notes
13. Fix form panels overlapping page titles
14. Add success/undo toasts for mutations
15. Add card linking during to-do creation

### Lower priority (polish)
16. Add Quick-Add from search (+ card, + todo)
17. Add meeting note time (not just date)
18. Improve briefing mode with external wait items and richer category summaries
19. Add keyboard navigation in search results
20. Include meeting notes in search results
