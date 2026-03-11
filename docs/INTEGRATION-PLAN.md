# Tusk Integration Plan: External Data Sources & Agenda Generation

## Context

The one-off agenda project on `rpi:~/code/tusk` built a weekly call agenda by pulling data from three sources:

1. **WhatsApp messages** — via a local Matrix bridge API (`127.0.0.1:5020`), extracting Tusk-related conversations from the group chat and Serge direct chat
2. **Forwarded emails** — via a lightweight SMTP server (`aiosmtpd` on port 25) that saves emails to disk with metadata, body, and attachments
3. **Manual context** — a `PROJECT.yaml` with contacts, sites, cadence, and background knowledge

The result was a beautifully typeset agenda (HTML/PDF) with numbered items (A.1–A.6, B.1–B.4, C.1–C.2), an open actions table, and enough context per item that anyone could walk into the call prepared.

**The question: how do we bring this into Tusk (the web app) systematically?**

---

## What We Have Now

### SMTP Mail Receiver (`mail-receiver/server.py`)
- `aiosmtpd`-based, runs as systemd service on port 25
- Accepts any recipient at `archerstreet.duckdns.org`
- Saves to `~/code/tusk/emails/{timestamp}_{slug}/`:
  - `metadata.json` (from, to, subject, date, message_id, envelope)
  - `message.txt` / `message.html` (body)
  - `original.eml` (raw)
  - `attachments/` (extracted files)
- **Limitations**: no TLS, no authentication, no spam filtering, no connection to Tusk DB, no web UI. Pure filesystem dump.

### WhatsApp Bridge API (`127.0.0.1:5020`)
- Matrix bridge exposing WhatsApp messages via REST
- Can query by room ID, contact name
- Used to extract ~300 messages across 2 rooms (group + Serge direct)
- **Limitations**: read-only extraction, no webhook/push, requires manual export runs

### PROJECT.yaml
- Static reference: team, contacts, sites, cadence
- Essentially what we now have in Tusk's CRM (people, organisations) plus some extra metadata

---

## Integration Architecture

### Phase 1: Email Ingestion into Tusk

**Goal**: Forwarded emails become References in Tusk, automatically linked to the right entities.

#### 1a. Harden the SMTP Server
- Add **STARTTLS** support (Let's Encrypt cert already exists for archerstreet.duckdns.org)
- Add **basic envelope filtering** — only accept mail from known senders (Liam, Serge, Kapil) or to specific addresses (e.g. `tusk@`, `card-{id}@`)
- Add **SPF/DKIM awareness** — not for sending, but to reject obviously spoofed inbound
- Switch from filesystem dump to **posting directly to Tusk API** (or writing to the SQLite DB)
- Keep the filesystem dump as a backup/archive

#### 1b. Email → Reference Pipeline
When an email arrives:
1. Parse metadata (from, subject, date, attachments)
2. Create a **Reference** in Tusk: `ref_type: "email"`, `title: subject`, `date: email date`, `detail: body text`
3. Store attachments as files (or just note them in the detail field — Tusk doesn't have file storage yet)
4. **Auto-link** based on routing address:
   - `card-{id}@archerstreet.duckdns.org` → link to that card
   - `tusk@archerstreet.duckdns.org` → create unlinked reference (user can link later)
   - Future: subject-line matching against card titles/people names
5. Log activity: "Email received: '{subject}' from {sender}"

#### 1c. Email Notifications (Outbound)
- Not SMTP sending (complex, deliverability issues)
- Instead: optional **daily digest email** via a transactional service (Resend, Postmark) or simple `sendmail`
- Content: overdue to-dos, upcoming milestones, yesterday's activity
- Alternative: just use the dashboard — it already serves this purpose

### Phase 2: WhatsApp Message Ingestion

**Goal**: Key WhatsApp messages become Notes or Meeting Notes in Tusk, providing the "conversation trail" that the brain-dump meeting notes system was designed for.

#### 2a. Periodic Sync (Simpler)
- Cron job runs every N hours
- Fetches new messages from Matrix bridge API since last sync
- Filters for Tusk-related rooms only
- Stores as a timestamped log in Tusk (new entity type or notes on a "WhatsApp" meta-entity)
- **Does not** create individual notes per message — too noisy
- Instead: creates a **daily digest note** summarising the day's messages, linked to relevant people

#### 2b. Webhook/Push (More Robust)
- Matrix bridge supports webhooks for new messages
- On new message in a Tusk room:
  - If it contains a recognised keyword/tag (e.g. `#action`, `#todo`, `@tusk`), create a to-do or note
  - Otherwise, batch into daily digest
- This is significantly more complex and may not be worth the investment for 3 users

#### 2c. Realistic Recommendation
- **Start with manual "import messages" button** in Tusk that fetches recent messages from the bridge API and displays them in a read-only timeline view
- Users can then manually create notes/to-dos from interesting messages
- This preserves the "brain dump" workflow without over-automating

### Phase 3: Weekly Agenda Generator

**Goal**: Tusk auto-generates the Wednesday 9:30am agenda document from its current state.

#### What the Agenda Needs
Looking at the existing `agenda.html`, each agenda item needs:
- **Number** (A.1, B.1, etc.) — derived from workstream + card position
- **Title** — card title
- **Context bullets** — the card summary, recent notes, and recent activity
- **Discussion points** — notes tagged as "for discussion" or flagged content
- **Open actions table** — filtered to-dos: owner (assigned_to), description, status (ball_in_court)

#### Implementation
- New route: `GET /agenda` or `/api/agenda`
- Server component that:
  1. Groups active cards by workstream → category (Part A, Part B)
  2. For each card with recent activity (last 7 days) or flagged status, generate an agenda item
  3. Pulls open to-dos grouped by assignee for the actions table
  4. Pulls upcoming milestones for a "Key Dates" section
  5. Renders in printable HTML with the same EB Garamond typographic treatment
- **Print/PDF**: CSS `@media print` rules (already proven in the existing agenda.html)
- **Dynamic numbering**: A.1, A.2... based on workstream + sort order

#### Agenda Structure (auto-generated)
```
PROJECT TUSK — WEEKLY AGENDA
{date} | {attendees from users table}

PART A — {Workstream 1 name}
  A.1 {Card title}
      {Card summary, truncated}
      — {Recent note or activity}
      — {Open to-do for this card}
  A.2 ...

PART B — {Workstream 2 name}
  B.1 ...

OPEN ACTIONS
  Owner | Item | Status | Due
  ...

KEY MILESTONES
  ...
```

### Phase 4: Email-to-Card Workflow

**Goal**: Forward an email to Tusk and it becomes a card with pre-populated data.

- Address: `new-card@archerstreet.duckdns.org`
- Subject becomes card title
- Body becomes card summary
- Attachments become linked references
- Sender is matched to a user → `created_by`
- This is the most powerful integration but requires the email pipeline (Phase 1) to be solid first

---

## Priority Order

| Phase | Effort | Value | Recommendation |
|-------|--------|-------|----------------|
| 3. Agenda Generator | Medium | **Highest** | Do first — immediate weekly value, uses only existing DB data |
| 1a. Harden SMTP | Low | Medium | Do second — TLS + filtering makes the existing server production-worthy |
| 1b. Email → Reference | Medium | High | Do third — closes the loop on forwarded emails |
| 2c. WhatsApp read-only view | Low | Medium | Do when convenient — simple API call, read-only |
| 4. Email-to-Card | Medium | Medium | Do last — depends on Phase 1 being solid |
| 2b. WhatsApp webhooks | High | Low | Skip unless the manual approach proves insufficient |

---

## Technical Notes

### SMTP Hardening Specifics
- The current server uses `aiosmtpd` which supports `STARTTLS` via the `tls_context` parameter on Controller
- Let's Encrypt certs at `/etc/letsencrypt/live/archerstreet.duckdns.org/` can be passed directly
- For envelope filtering, add an `handle_RCPT` check against a whitelist
- Consider switching from port 25 (requires root/CAP_NET_BIND_SERVICE) to 587 (submission) behind a reverse proxy, or keep 25 with the existing systemd capability

### WhatsApp Bridge API
- Endpoint: `http://127.0.0.1:5020`
- Contact lookup: `/api/contacts/index/by-name?q={name}`
- Room IDs are in `PROJECT.yaml` — these are stable Matrix room identifiers
- Message format from the existing export is clean: `[HH:MM] Sender Name: message`
- The bridge likely has a messages endpoint that can be queried with a `since` parameter

### Tusk DB Changes Required
- **References**: no schema changes needed — `ref_type: "email"` already works
- **Agenda**: no schema changes — pure read query
- **WhatsApp**: might want a `message_imports` table or just use the existing `notes` system with `entity_type: "import"`
- **Card sort_order**: needed for agenda numbering — add `sort_order INTEGER DEFAULT 0` to cards table

### Files to Reference
- SMTP server: `rpi:~/code/tusk/mail-receiver/server.py`
- Service file: `rpi:~/code/tusk/mail-receiver/tusk-mail.service`
- Agenda HTML template: `rpi:~/code/tusk/agenda.html` (the typographic styling to reuse)
- Email metadata format: `rpi:~/code/tusk/emails/*/metadata.json`
- WhatsApp exports: `rpi:~/code/tusk/messages/*.txt`
- Project context: `rpi:~/code/tusk/PROJECT.yaml`
