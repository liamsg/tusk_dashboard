import { getDb } from "./db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

interface SeedUser {
  name: string;
  email: string;
}

interface SeedWorkstream {
  name: string;
  sortOrder: number;
}

const SEED_PASSWORD = "TeamTusk2026!";
const BCRYPT_ROUNDS = 10;

const SEED_USERS: SeedUser[] = [
  { name: "Liam", email: "liam@goddard.co.uk" },
  { name: "Serge", email: "serget31@hotmail.com" },
  { name: "Kapil", email: "kwglobal@pm.me" },
];

const SEED_WORKSTREAMS: SeedWorkstream[] = [
  { name: "Company Value & Stability", sortOrder: 1 },
  { name: "Shareholder Value", sortOrder: 2 },
];

function seed(): void {
  const db = getDb();

  console.log("Starting seed...");

  // ── Users ─────────────────────────────────────────────────────────────
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash)
    VALUES (?, ?, ?, ?)
  `);

  const existingUser = db.prepare<[string], { id: string }>(
    `SELECT id FROM users WHERE email = ?`
  );

  const passwordHash = bcrypt.hashSync(SEED_PASSWORD, BCRYPT_ROUNDS);

  for (const user of SEED_USERS) {
    const existing = existingUser.get(user.email);
    if (existing) {
      console.log(`  User "${user.name}" (${user.email}) already exists — skipping.`);
      continue;
    }

    const id = crypto.randomUUID();
    insertUser.run(id, user.name, user.email, passwordHash);
    console.log(`  Created user "${user.name}" (${user.email}) [${id}]`);
  }

  // ── Workstreams ───────────────────────────────────────────────────────
  const insertWorkstream = db.prepare(`
    INSERT INTO workstreams (id, name, sort_order)
    VALUES (?, ?, ?)
  `);

  const existingWorkstream = db.prepare<[string], { id: string }>(
    `SELECT id FROM workstreams WHERE name = ?`
  );

  for (const ws of SEED_WORKSTREAMS) {
    const existing = existingWorkstream.get(ws.name);
    if (existing) {
      console.log(`  Workstream "${ws.name}" already exists — skipping.`);
      continue;
    }

    const id = crypto.randomUUID();
    insertWorkstream.run(id, ws.name, ws.sortOrder);
    console.log(`  Created workstream "${ws.name}" [${id}]`);
  }

  console.log("Seed complete.");
}

seed();
