import Database from "better-sqlite3";
import path from "path";

let db: Database.Database | null = null;

/**
 * Returns a lazily-initialised better-sqlite3 database instance.
 * The database file lives at `./tusk.db` relative to the project root.
 * WAL journal mode and foreign keys are enabled on first connection.
 */
export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = path.resolve(process.cwd(), "tusk.db");
  db = new Database(dbPath);

  // Performance & integrity pragmas
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initDb(db);
  return db;
}

// ---------------------------------------------------------------------------
// Schema initialisation
// ---------------------------------------------------------------------------

function initDb(db: Database.Database): void {
  // Run every CREATE TABLE inside a single transaction for speed & atomicity.
  db.transaction(() => {
    // ── users ───────────────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        name          TEXT    NOT NULL,
        email         TEXT    NOT NULL UNIQUE,
        password_hash TEXT    NOT NULL,
        created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // ── workstreams ─────────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS workstreams (
        id          TEXT    PRIMARY KEY,
        name        TEXT    NOT NULL,
        sort_order  INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // ── categories ──────────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id            TEXT    PRIMARY KEY,
        workstream_id TEXT    NOT NULL REFERENCES workstreams(id),
        name          TEXT    NOT NULL,
        sort_order    INTEGER NOT NULL DEFAULT 0,
        created_by    TEXT    REFERENCES users(id),
        created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_by    TEXT    REFERENCES users(id),
        updated_at    TEXT,
        archived      INTEGER NOT NULL DEFAULT 0,
        archived_by   TEXT    REFERENCES users(id),
        archived_at   TEXT
      );
    `);

    // ── subcategories ───────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS subcategories (
        id          TEXT    PRIMARY KEY,
        category_id TEXT    NOT NULL REFERENCES categories(id),
        name        TEXT    NOT NULL,
        sort_order  INTEGER NOT NULL DEFAULT 0,
        created_by  TEXT    REFERENCES users(id),
        created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_by  TEXT    REFERENCES users(id),
        updated_at  TEXT,
        archived    INTEGER NOT NULL DEFAULT 0,
        archived_by TEXT    REFERENCES users(id),
        archived_at TEXT
      );
    `);

    // ── cards ───────────────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS cards (
        id                     TEXT    PRIMARY KEY,
        subcategory_id         TEXT    REFERENCES subcategories(id),
        category_id            TEXT    REFERENCES categories(id),
        title                  TEXT    NOT NULL,
        summary                TEXT,
        status                 TEXT    NOT NULL DEFAULT 'new'
                               CHECK (status IN ('new','in_progress','done','on_hold')),
        flagged_for_discussion INTEGER NOT NULL DEFAULT 0,
        flagged_by             TEXT    REFERENCES users(id),
        created_by             TEXT    REFERENCES users(id),
        created_at             TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_by             TEXT    REFERENCES users(id),
        updated_at             TEXT,
        archived               INTEGER NOT NULL DEFAULT 0,
        archived_by            TEXT    REFERENCES users(id),
        archived_at            TEXT
      );
    `);

    // ── organisations ───────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS organisations (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        website     TEXT,
        summary     TEXT,
        org_type    TEXT,
        created_by  TEXT REFERENCES users(id),
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_by  TEXT REFERENCES users(id),
        updated_at  TEXT,
        archived    INTEGER NOT NULL DEFAULT 0,
        archived_by TEXT    REFERENCES users(id),
        archived_at TEXT
      );
    `);

    // ── people ──────────────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS people (
        id              TEXT PRIMARY KEY,
        organisation_id TEXT REFERENCES organisations(id),
        name            TEXT NOT NULL,
        role            TEXT,
        relationship    TEXT,
        email           TEXT,
        phone           TEXT,
        created_by      TEXT REFERENCES users(id),
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_by      TEXT REFERENCES users(id),
        updated_at      TEXT,
        archived        INTEGER NOT NULL DEFAULT 0,
        archived_by     TEXT    REFERENCES users(id),
        archived_at     TEXT
      );
    `);

    // ── todos ───────────────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id                     TEXT    PRIMARY KEY,
        title                  TEXT    NOT NULL,
        description            TEXT,
        assigned_to            TEXT    REFERENCES users(id),
        due_date               TEXT,
        ball_in_court          TEXT    CHECK (ball_in_court IN ('us','external','on_hold')),
        ball_in_court_person_id TEXT   REFERENCES people(id),
        sort_order             INTEGER NOT NULL DEFAULT 0,
        status                 TEXT    NOT NULL DEFAULT 'open'
                               CHECK (status IN ('open','done','archived')),
        created_by             TEXT    REFERENCES users(id),
        created_at             TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_by             TEXT    REFERENCES users(id),
        updated_at             TEXT,
        archived               INTEGER NOT NULL DEFAULT 0,
        archived_by            TEXT    REFERENCES users(id),
        archived_at            TEXT
      );
    `);

    // ── meeting_notes ───────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS meeting_notes (
        id          TEXT PRIMARY KEY,
        title       TEXT NOT NULL,
        date        TEXT NOT NULL,
        content     TEXT,
        recorded_by TEXT REFERENCES users(id),
        tags        TEXT,
        created_by  TEXT REFERENCES users(id),
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_by  TEXT REFERENCES users(id),
        updated_at  TEXT,
        archived    INTEGER NOT NULL DEFAULT 0,
        archived_by TEXT    REFERENCES users(id),
        archived_at TEXT
      );
    `);

    // ── refs (references) ───────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS refs (
        id          TEXT PRIMARY KEY,
        ref_type    TEXT NOT NULL
                    CHECK (ref_type IN ('email','document','folder','call','meeting','link','other')),
        title       TEXT NOT NULL,
        date        TEXT,
        detail      TEXT,
        created_by  TEXT REFERENCES users(id),
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        archived    INTEGER NOT NULL DEFAULT 0,
        archived_by TEXT    REFERENCES users(id),
        archived_at TEXT
      );
    `);

    // ── notes ───────────────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id           TEXT PRIMARY KEY,
        content      TEXT NOT NULL,
        entity_type  TEXT NOT NULL,
        entity_id    TEXT NOT NULL,
        reference_id TEXT REFERENCES refs(id),
        created_by   TEXT REFERENCES users(id),
        created_at   TEXT NOT NULL DEFAULT (datetime('now')),
        archived     INTEGER NOT NULL DEFAULT 0,
        archived_by  TEXT    REFERENCES users(id),
        archived_at  TEXT
      );
    `);

    // ── milestones ──────────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS milestones (
        id            TEXT PRIMARY KEY,
        title         TEXT NOT NULL,
        target_date   TEXT,
        description   TEXT,
        status        TEXT NOT NULL DEFAULT 'upcoming'
                      CHECK (status IN ('upcoming','in_progress','complete')),
        workstream_id TEXT REFERENCES workstreams(id),
        created_by    TEXT REFERENCES users(id),
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_by    TEXT REFERENCES users(id),
        updated_at    TEXT
      );
    `);

    // ── link tables (no soft-delete) ────────────────────────────────────

    db.exec(`
      CREATE TABLE IF NOT EXISTS card_people (
        card_id   TEXT NOT NULL REFERENCES cards(id),
        person_id TEXT NOT NULL REFERENCES people(id),
        PRIMARY KEY (card_id, person_id)
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS card_todos (
        card_id TEXT NOT NULL REFERENCES cards(id),
        todo_id TEXT NOT NULL REFERENCES todos(id),
        PRIMARY KEY (card_id, todo_id)
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS card_refs (
        card_id TEXT NOT NULL REFERENCES cards(id),
        ref_id  TEXT NOT NULL REFERENCES refs(id),
        PRIMARY KEY (card_id, ref_id)
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS card_meeting_notes (
        card_id         TEXT NOT NULL REFERENCES cards(id),
        meeting_note_id TEXT NOT NULL REFERENCES meeting_notes(id),
        PRIMARY KEY (card_id, meeting_note_id)
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS todo_people (
        todo_id   TEXT NOT NULL REFERENCES todos(id),
        person_id TEXT NOT NULL REFERENCES people(id),
        PRIMARY KEY (todo_id, person_id)
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS todo_refs (
        todo_id TEXT NOT NULL REFERENCES todos(id),
        ref_id  TEXT NOT NULL REFERENCES refs(id),
        PRIMARY KEY (todo_id, ref_id)
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS meeting_note_people (
        meeting_note_id TEXT NOT NULL REFERENCES meeting_notes(id),
        person_id       TEXT NOT NULL REFERENCES people(id),
        PRIMARY KEY (meeting_note_id, person_id)
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS meeting_note_todos (
        meeting_note_id TEXT NOT NULL REFERENCES meeting_notes(id),
        todo_id         TEXT NOT NULL REFERENCES todos(id),
        PRIMARY KEY (meeting_note_id, todo_id)
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS ref_entities (
        ref_id      TEXT NOT NULL REFERENCES refs(id),
        entity_type TEXT NOT NULL,
        entity_id   TEXT NOT NULL,
        PRIMARY KEY (ref_id, entity_type, entity_id)
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS org_cards (
        organisation_id TEXT NOT NULL REFERENCES organisations(id),
        card_id         TEXT NOT NULL REFERENCES cards(id),
        PRIMARY KEY (organisation_id, card_id)
      );
    `);

    // ── activity_log ────────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id          TEXT PRIMARY KEY,
        action      TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id   TEXT NOT NULL,
        user_id     TEXT REFERENCES users(id),
        description TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  })();
}
