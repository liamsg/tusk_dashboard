# TUSK — Sale Preparation Tracker

## Overview

A web application for tracking and coordinating the preparation of a company for sale. Used by three senior individuals to manage workstreams, track to-dos, maintain a mini-CRM of third parties, log meeting notes, and keep a shared institutional memory of the entire process.

## Core Principles

1. **Morning briefing** — the dashboard reads like an executive memo, not a SaaS tool
2. **Mobile-first** — designed to scroll and read on a phone at 7am
3. **Nothing is ever deleted** — all deletions are soft archives, fully restorable
4. **Full audit trail** — every action stamped with who and when
5. **Notes on everything** — any entity can have timestamped, attributed notes
6. **References everywhere** — external documents, emails, calls linked for retrieval
7. **Designed for a PE partner** — typography-led, muted palette, no gamification
8. **Flexible hierarchy** — categories and subcategories are user-created, not predefined

---

## Users

- 3 users, each with separate login
- All users can see everything
- All actions attributed to the acting user
- Simple password-based authentication (bcrypt + JWT cookie)

---

## Data Model

### Hierarchy

```
Workstream (top level — 2: "Company Value & Stability", "Shareholder Value")
  └── Category (user-created, unlimited)
       └── Subcategory (user-created, unlimited)
            └── Card (the core unit of information)
```

### Card (core entity)

- Title
- Summary / description
- Status: New → In Progress → Done → On Hold
- Linked people (many-to-many)
- Linked to-dos (many-to-many)
- References (many)
- Notes (many, timestamped thread)
- Meeting notes (many-to-many)
- Audit log (auto-generated)
- created_by, created_at, updated_by, updated_at
- archived (boolean), archived_by, archived_at

### To-Do

- Title
- Description (optional)
- Assigned to (one of the 3 users)
- Due date
- Ball-in-court: Us (specific user) | External (specific person) | On Hold
- Priority order (manual drag-reorder position)
- Linked cards (many-to-many)
- Involved people (many-to-many, with inline contact details)
- References (many)
- Notes (many, timestamped thread)
- Status: Open | Done | Archived
- created_by, created_at, updated_by, updated_at
- archived, archived_by, archived_at

### Organisation (CRM)

- Name
- Website (optional)
- Summary / description
- Type (freeform, e.g. "Corporate Finance", "Law Firm", "Accountant")
- Linked cards (many-to-many)
- References (many)
- Notes (many)
- People (one-to-many)
- created_by, created_at, updated_by, updated_at
- archived, archived_by, archived_at

### Person (CRM)

- Name
- Organisation (optional, links to Organisation)
- Role / title
- Relationship description (their role in our process)
- Email
- Phone
- Linked cards (many-to-many)
- Notes (many)
- created_by, created_at, updated_by, updated_at
- archived, archived_by, archived_at

### Meeting Note

- Title
- Date and time
- Attendees (mix of internal users and external people)
- Notes content (freeform text, the brain dump)
- Linked cards (many-to-many)
- Linked people (many-to-many)
- Linked to-dos (many-to-many, can create inline)
- Tags (freeform, e.g. #tax #advisers)
- Recorded by (user who wrote it)
- created_by, created_at, updated_by, updated_at
- archived, archived_by, archived_at

### Reference

- Type: Email | Document | Folder | Call | Meeting | Link | Other
- Title (short description)
- Date (when the external thing happened)
- Detail (freeform text — enough for someone unfamiliar to locate the item)
- Linked to any entity: cards, to-dos, people, organisations, meeting notes
- created_by, created_at
- archived, archived_by, archived_at

### Note (universal)

- Content (text)
- Attached to any entity: card, to-do, person, organisation, category, subcategory, workstream, meeting note
- Optional linked reference (e.g. "this note relates to 📞 call on 9 Mar")
- created_by, created_at
- archived, archived_by, archived_at

### Milestone

- Title
- Target date
- Description (optional)
- Status: Upcoming | In Progress | Complete
- Workstream (optional)
- created_by, created_at, updated_by, updated_at

### Activity Log (auto-generated)

- Action type (created, updated, archived, restored, linked, unlinked, note_added, etc.)
- Entity type and ID
- User who performed the action
- Timestamp
- Description (human-readable sentence)

---

## Screens

### 1. Login

Simple, clean login page.

```
┌─────────────────────────────────┐
│                                 │
│            TUSK                 │
│                                 │
│   Email:    [____________]      │
│   Password: [____________]      │
│                                 │
│          [Log in]               │
│                                 │
└─────────────────────────────────┘
```

### 2. Dashboard (Morning Briefing)

Mobile-first, reads top-to-bottom like a document. No widgets or stat boxes — clear text hierarchy.

```
┌─────────────────────────────────────┐
│ TUSK                Sarah · Log out │
│ 10 March 2026                       │
│                                     │
│ ─────────────────────────────────── │
│ ATTENTION NEEDED                    │
│                                     │
│ ⚠ 2 items overdue                  │
│ Get fee proposals from CF advisers  │
│ — was due 8 Mar                     │
│ → assigned to Mike                  │
│                                     │
│ Review shareholder agreement        │
│ — was due 9 Mar                     │
│ → assigned to Sarah                 │
│                                     │
│ ─────────────────────────────────── │
│ THIS WEEK                           │
│                                     │
│ Things waiting on you (Sarah):      │
│ ☐ Call Rothschild re: timing  today │
│ ☐ Send NDA to three parties    Fri │
│                                     │
│ Things waiting on Mike:             │
│ ☐ Data room structure draft    Wed │
│ ☐ Fee proposal comparison      Fri │
│                                     │
│ Waiting on third parties:           │
│ ◌ Fee proposal from Rothschild     │
│   chased 8 Mar, Jane said EoW     │
│ ◌ Tax advice from PwC             │
│   David reviewing, expected 18 Mar │
│                                     │
│ ─────────────────────────────────── │
│ KEY MILESTONES                      │
│                                     │
│ Data room ready ........ 1 May     │
│                          (52 days) │
│ Information memorandum .. 1 Jun    │
│                          (83 days) │
│ Management presentations  15 Jul   │
│                         (127 days) │
│                                     │
│ ─────────────────────────────────── │
│ WHAT'S BEEN HAPPENING               │
│                                     │
│ Today                               │
│ Sarah recorded notes from call      │
│ with PwC — "Fee agreed at £X.       │
│ Flagged potential CGT issue."       │
│ → new to-do: Get legal view         │
│                                     │
│ Mike added Houlihan Lokey to        │
│ Corporate Finance advisers.         │
│                                     │
│ Yesterday                           │
│ Mike updated EBITDA workings        │
│ — 3 new notes added.               │
│ Sarah archived Old Lender Ltd.      │
│                                     │
│ ─────────────────────────────────── │
│ WORKSTREAM SUMMARIES                │
│                                     │
│ Company Value & Stability           │
│ 8 categories · 24 cards            │
│ 3 open to-dos · 1 overdue          │
│ Latest: "Houlihan" added today      │
│                                     │
│ Shareholder Value                   │
│ 5 categories · 16 cards            │
│ 4 open to-dos · 1 overdue          │
│ Latest: NDA note added today        │
│                                     │
│ ─────────────────────────────────── │
│ FLAGGED FOR DISCUSSION              │
│                                     │
│ ❗ CF adviser mandate — who to      │
│    go with? Flagged by Mike         │
│ ❗ Timeline — is June realistic     │
│    for IM? Flagged by James         │
│                                     │
│ ─────────────────────────────────── │
│                                     │
│ [Browse] [To-Dos] [People]         │
│ [Notes]  [Archive]                  │
└─────────────────────────────────────┘
```

### 3. Browse (Working View)

Default: briefing mode per workstream. Toggle to card/hierarchy view.

**Briefing mode:**
```
┌──────────────────────────────────────────────────┐
│ ← COMPANY VALUE & STABILITY    [Briefing | Cards]│
│                                                  │
│ Key developments this week:                      │
│ • Added Houlihan Lokey as potential CF adviser    │
│ • PwC engagement fee agreed at £X                │
│ • Employment contract review started             │
│                                                  │
│ Open actions:                                    │
│ ☐ Get fee proposals — Mike, 15 Mar              │
│ ☐ Review contracts — Sarah, 18 Mar              │
│                                                  │
│ Waiting on external:                             │
│ ◌ Fee proposal — Rothschild                     │
│ ◌ Tax advice — PwC                              │
│                                                  │
│ Categories:                                      │
│ Third Parties — 6 cards, 1 to-do                │
│ Financial Health — 5 cards, 1 to-do             │
│ Operations — 4 cards, all clear                  │
│ Legal — 3 cards, 1 to-do                        │
└──────────────────────────────────────────────────┘
```

**Card/hierarchy mode:**
```
┌──────────────────────────────────────────────────┐
│ ← COMPANY VALUE & STABILITY    [Briefing | Cards]│
│                                      [+ Category]│
│                                                  │
│ ▾ Potential Third Parties (6 cards)   [+ Subcat] │
│   ▾ Corporate Finance (3)              [+ Card]  │
│     ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│     │Rothschild│ │ Lazard   │ │ Houlihan │      │
│     │● In Prog │ │● Contact │ │● New     │      │
│     │2 people  │ │1 person  │ │0 people  │      │
│     └──────────┘ └──────────┘ └──────────┘      │
│   ▸ Potential Lenders (2)                        │
│   ▸ Accountants (1)                              │
│                                                  │
│ ▸ Operations (4 cards)                           │
│ ▸ Legal & Compliance (3 cards)                   │
│                                                  │
│ [+ Add new category]                             │
└──────────────────────────────────────────────────┘
```

### 4. Card Detail

```
┌─────────────────────────────────────────────────┐
│ ← Rothschild & Co                      [Archive]│
│   Third Parties > Corporate Finance             │
│   Status: [● In Progress ▾]                     │
│                                                 │
│ Summary                                  [Edit] │
│ Leading independent financial advisory firm.    │
│ Considering for CF mandate to run sale.         │
│                                                 │
│ ─────────────────────────────────────────────── │
│ Key People                            [+ Add]   │
│ Jane Smith · MD                                 │
│ jane.smith@rothschild.com · +44 20 7280 5000    │
│ "Lead contact. Met at dinner, very responsive." │
│                                                 │
│ Tom Lee · Director                              │
│ tom.lee@rothschild.com                          │
│ "Supporting Jane. Handles day-to-day."          │
│                                                 │
│ ─────────────────────────────────────────────── │
│ To-Dos                                [+ Add]   │
│ ☐ Get fee proposal — Mike, 15 Mar              │
│   ● External (Jane) — chased 8 Mar             │
│ ☐ Compare proposals — Mike, 18 Mar             │
│   ● Us (Mike) — waiting on all 3               │
│                                                 │
│ ─────────────────────────────────────────────── │
│ References                            [+ Add]   │
│ 📧 Fee proposal email — 12 Mar                 │
│ 📞 Intro call with Jane — 5 Mar                │
│ 📄 Credentials deck — 3 Mar                    │
│                                                 │
│ ─────────────────────────────────────────────── │
│ Meeting Notes                                   │
│ 📝 Call with PwC re: tax — 12 Mar              │
│ 📝 Internal: CF shortlist — 11 Mar             │
│                                                 │
│ ─────────────────────────────────────────────── │
│ Notes                                 [+ Add]   │
│ "Fee agreed in principle at 1%."                │
│  — Sarah, 12 Mar  📧 fee proposal email        │
│                                                 │
│ "Positive intro call. Jane keen."               │
│  — Sarah, 5 Mar  📞 intro call                 │
│                                                 │
│ "Recommended by David Chen at PwC."             │
│  — Mike, 1 Mar                                  │
│                                                 │
│ ─────────────────────────────────────────────── │
│ Activity                                        │
│ Sarah added note — 12 Mar                       │
│ Mike added reference — 10 Mar                   │
│ Sarah added Jane Smith — 7 Mar                  │
│ Mike created this card — 1 Mar                  │
└─────────────────────────────────────────────────┘
```

### 5. To-Dos (Master List)

```
┌──────────────────────────────────────────────────┐
│ TO-DOS                                   [+ New] │
│                                                  │
│ [My View | All]  Group: [Ball-in-court ▾]        │
│                  Sort:  [Priority ▾]             │
│                                                  │
│ WAITING ON YOU                                   │
│ ┌──────────────────────────────────────────────┐ │
│ │ ≡ ☐ Call Rothschild re: timing     today    │ │
│ │     Third Parties > Corporate Finance       │ │
│ │     Jane Smith · jane@rothschild.com        │ │
│ │     📧 1 ref · 💬 2 notes                   │ │
│ ├──────────────────────────────────────────────┤ │
│ │ ≡ ☐ Send NDA to three parties       Fri    │ │
│ │     Deal Process > NDAs                     │ │
│ │     📄 1 ref                                │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ WAITING ON MIKE                                  │
│ ┌──────────────────────────────────────────────┐ │
│ │ ≡ ☐ Data room structure            Wed      │ │
│ │     Due Diligence > Data Room               │ │
│ │     💬 1 note                                │ │
│ ├──────────────────────────────────────────────┤ │
│ │ ≡ ☐ Compare fee proposals          Fri      │ │
│ │     Third Parties > Corporate Finance       │ │
│ │     🔗 Rothschild · Lazard · Houlihan       │ │
│ │     📧 2 refs                               │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ WAITING ON THIRD PARTIES                         │
│ ┌──────────────────────────────────────────────┐ │
│ │ ◌ Fee proposal from Rothschild              │ │
│ │   → Jane Smith · chased 8 Mar              │ │
│ │ ◌ Tax advice from PwC                      │ │
│ │   → David Chen · expected 18 Mar           │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ DONE (3)                                  Show ▾ │
└──────────────────────────────────────────────────┘
```

### 6. To-Do Detail

```
┌─────────────────────────────────────────────────┐
│ ← ☐ Chase fee proposal                         │
│   Assigned to: Mike · Due: 15 Mar               │
│   Ball in court: ● External (Jane @ Rothschild) │
│                                                 │
│ Involves:                                       │
│ Jane Smith · Rothschild · MD                    │
│ jane.smith@rothschild.com · +44 20 7280 5000    │
│ "Promised by end of week"                       │
│                                                 │
│ Linked Cards:                          [+ Link] │
│ 🔗 Rothschild & Co                             │
│ 📂 Third Parties > Corporate Finance           │
│                                                 │
│ References:                            [+ Add]  │
│ 📧 Initial ask sent — 5 Mar                    │
│ 📧 Chase email — 8 Mar                         │
│                                                 │
│ Origin:                                         │
│ 📝 Internal: CF shortlist meeting — 11 Mar     │
│                                                 │
│ Notes:                                 [+ Add]  │
│ "Chased by email 8 Mar, Jane said end of week" │
│  — Mike, 8 Mar                                  │
│ "Initial ask sent alongside NDA"                │
│  — Sarah, 5 Mar                                 │
│                                                 │
│ Activity:                                       │
│ Mike added note — 8 Mar                         │
│ Sarah created this to-do — 5 Mar                │
└─────────────────────────────────────────────────┘
```

### 7. People

```
┌──────────────────────────────────────────────────┐
│ PEOPLE                                   [+ New] │
│                                                  │
│ Search...          [All | Organisations | People]│
│                                                  │
│ Rothschild & Co · Corporate Finance              │
│   Jane Smith · MD · jane@rothschild.com          │
│   Tom Lee · Director · tom@rothschild.com        │
│                                                  │
│ Lazard · Corporate Finance                       │
│   Anna Park · VP · anna@lazard.com               │
│                                                  │
│ PwC · Accountant                                 │
│   David Chen · Partner · david@pwc.com           │
│                                                  │
│ (click any person or org for full detail)        │
└──────────────────────────────────────────────────┘
```

### 8. Person Detail

```
┌─────────────────────────────────────────────────┐
│ ← Jane Smith                           [Archive]│
│   Rothschild & Co · Managing Director           │
│   jane.smith@rothschild.com                     │
│   +44 20 7280 5000                              │
│   Relationship: Lead contact for CF mandate     │
│                                                 │
│ Linked Cards:                                   │
│ 🔗 Rothschild & Co                             │
│                                                 │
│ To-Dos involving Jane:                          │
│ ☐ Chase fee proposal — Mike, 15 Mar            │
│ ☐ Schedule full team meeting — Sarah, 22 Mar   │
│                                                 │
│ Meeting Notes:                                  │
│ 📝 Intro call — 5 Mar                          │
│                                                 │
│ Notes:                                 [+ Add]  │
│ "Very responsive. Prefers email to calls."      │
│  — Sarah, 7 Mar                                 │
│                                                 │
│ References:                                     │
│ 📧 Fee proposal email — 12 Mar                 │
│ 📞 Intro call — 5 Mar                          │
│                                                 │
│ Activity:                                       │
│ (all interactions involving Jane)               │
└─────────────────────────────────────────────────┘
```

### 9. Meeting Notes List

```
┌──────────────────────────────────────────────────┐
│ MEETING NOTES                            [+ New] │
│                                                  │
│ Search...                          Tags ▾        │
│                                                  │
│ 12 Mar — Call with PwC re: tax structuring      │
│ Sarah · David Chen (PwC)                        │
│ "Fee agreed at £X. Flagged CGT issue..."        │
│ #tax #pwc #structure                            │
│                                                  │
│ 11 Mar — Internal: CF adviser shortlist         │
│ Mike · Sarah · James                            │
│ "Agreed to shortlist 3. Rothschild strong..."   │
│ #advisers #cf                                   │
│                                                  │
│ 10 Mar — James thoughts on timeline             │
│ James                                           │
│ "Think we should aim for IM by June..."         │
│ #timeline #strategy                             │
│                                                  │
│ 8 Mar — Call with Rothschild (intro)            │
│ Sarah · Jane Smith (Rothschild)                 │
│ "Positive call. Jane keen..."                   │
│ #advisers #rothschild                           │
└──────────────────────────────────────────────────┘
```

### 10. Meeting Note Detail

```
┌─────────────────────────────────────────────────┐
│ ← Call with PwC re: tax structuring    [Archive]│
│   12 Mar 2026, 14:30                            │
│   Recorded by: Sarah                            │
│   Attendees: Sarah, David Chen (PwC)            │
│   #tax #pwc #structure                          │
│                                                 │
│ Discussed scope of tax structuring work.        │
│ David recommended holding co structure.         │
│ Fee agreed at £X. Engagement letter to          │
│ follow by Friday. He flagged potential          │
│ CGT issue with current share classes —          │
│ needs legal input from our side.                │
│                                                 │
│ Linked Items:                          [+ Link] │
│ 🔗 PwC (card)                                  │
│ 🔗 David Chen (person)                         │
│ 🔗 Tax structuring (card)                      │
│ ☐ Get legal view on share classes — Sarah      │
│                                                 │
│ References:                            [+ Add]  │
│ 📧 Follow-up email to David — 12 Mar           │
│                                                 │
│ Activity:                                       │
│ Sarah created this note — 12 Mar                │
│ Sarah linked to PwC card — 12 Mar               │
│ Sarah created to-do from this note — 12 Mar     │
└─────────────────────────────────────────────────┘
```

### 11. Reference Detail

```
┌─────────────────────────────────────────────────┐
│ ← 📧 Fee proposal from Rothschild              │
│                                                 │
│ Type: Email                                     │
│ Date: 12 Mar 2026                               │
│                                                 │
│ Detail:                                         │
│ From: jane.smith@rothschild.com                 │
│ To: mike@company.com                            │
│ Subject: "Project Tusk — Indicative Fee         │
│ Proposal"                                       │
│ Mailbox: Mike's Outlook                         │
│ PDF attachment — 3 pages                        │
│                                                 │
│ Linked to:                                      │
│ 🔗 Rothschild & Co (card)                      │
│ ☐ Compare fee proposals (to-do)                │
│                                                 │
│ Added by Mike · 12 Mar                          │
└─────────────────────────────────────────────────┘
```

### 12. Archive

```
┌──────────────────────────────────────────────────┐
│ ARCHIVE                                          │
│                                                  │
│ Search...     Filter: [All types ▾]              │
│                                                  │
│ Old Lender Ltd (card)                            │
│ Archived by Sarah · 8 Mar            [Restore]  │
│                                                  │
│ Initial timeline draft (to-do)                   │
│ Archived by Mike · 5 Mar             [Restore]  │
│                                                  │
│ (all soft-deleted items, searchable)            │
└──────────────────────────────────────────────────┘
```

### 13. Search (⌘K / Quick Add)

```
┌──────────────────────────────────────────────────┐
│ 🔍 Search or quick-add...                        │
│                                                  │
│ Type to search across cards, to-dos, people,    │
│ meeting notes, references, and notes.            │
│                                                  │
│ Or type:                                         │
│ "+ card" to create a new card                    │
│ "+ todo" to create a new to-do                   │
│ "+ note" to create a new meeting note            │
│ "+ person" to add a new person                   │
└──────────────────────────────────────────────────┘
```

---

## Design & Visual Style

- **Typography-led** — large clear type, lots of white space, minimal colour
- **Muted palette** — dark navy text, white/off-white background, warm amber for warnings/overdue
- **Status colours** — New (grey), In Progress (blue), Done (green), On Hold (amber)
- **No gamification** — no progress bars, streaks, or celebration animations
- **Mobile-first** — sidebar collapses to bottom nav on mobile
- **Serif or elegant sans-serif headings** — convey seriousness
- **Information-dense where it matters** — the briefing is rich but the layout is clean

---

## Technical Architecture

- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Auth**: bcrypt password hashing + JWT cookies
- **Database**: SQLite (via better-sqlite3 or Drizzle ORM)
- **Deployment**: Runs locally or on any Node.js host

---

## Navigation

```
DASHBOARD       — morning briefing (home page)
BROWSE          — workstreams → categories → cards
TO-DOS          — master list, drag-reorder, ball-in-court grouping
PEOPLE          — organisations and contacts (mini CRM)
MEETING NOTES   — shared conversation log
ARCHIVE         — all soft-deleted items, restorable
SEARCH (⌘K)    — global search across all entities
```

---

## Key Behaviours

1. **Adding items** — one click/tap from any relevant context; minimal required fields
2. **Drag reorder** — to-dos can be manually prioritised by dragging
3. **Linking** — any entity can be linked to any other where it makes sense
4. **Notes** — universal, attachable to anything, timestamped and attributed
5. **References** — freeform detail field (not structured forms), enough to retrieve the original
6. **Archive** — soft delete everywhere, one-click restore, searchable archive page
7. **Activity feed** — human-readable sentences, not "user X performed action Y"
8. **Ball-in-court** — to-dos show whose turn it is to act (us or external)
9. **Discussion flags** — any item can be flagged for group discussion
10. **Milestones** — key dates for the overall process, visible on dashboard
