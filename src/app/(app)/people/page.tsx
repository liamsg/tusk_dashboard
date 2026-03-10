import { cookies } from "next/headers";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { CreatePersonForm } from "./CreatePersonForm";
import { CreateOrgForm } from "./CreateOrgForm";
import { PeopleSearch } from "./PeopleSearch";

// ── Types ──────────────────────────────────────────────────────────────────────

interface OrgRow {
  id: string;
  name: string;
  org_type: string | null;
}

interface PersonRow {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  relationship: string | null;
  organisation_id: string | null;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function PeoplePage() {
  const cookieStore = await cookies();
  const session = requireSession(cookieStore);
  void session;

  const db = getDb();

  // All non-archived organisations
  const orgs = db
    .prepare(
      `SELECT id, name, org_type
       FROM organisations
       WHERE archived = 0
       ORDER BY name ASC`
    )
    .all() as OrgRow[];

  // All non-archived people
  const people = db
    .prepare(
      `SELECT id, name, role, email, phone, relationship, organisation_id
       FROM people
       WHERE archived = 0
       ORDER BY name ASC`
    )
    .all() as PersonRow[];

  // Group people by organisation
  const peopleByOrg = new Map<string, PersonRow[]>();
  const orphanPeople: PersonRow[] = [];

  for (const person of people) {
    if (person.organisation_id) {
      const existing = peopleByOrg.get(person.organisation_id);
      if (existing) {
        existing.push(person);
      } else {
        peopleByOrg.set(person.organisation_id, [person]);
      }
    } else {
      orphanPeople.push(person);
    }
  }

  // Build org data with their people for the search component
  const orgsWithPeople = orgs.map((org) => ({
    id: org.id,
    name: org.name,
    org_type: org.org_type,
    people: (peopleByOrg.get(org.id) || []).map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      email: p.email,
      phone: p.phone,
      relationship: p.relationship,
    })),
  }));

  // Only include orgs that have people, plus orgs without people at the end
  const orgsWithPeopleFirst = orgsWithPeople
    .filter((o) => o.people.length > 0)
    .concat(orgsWithPeople.filter((o) => o.people.length === 0));

  const orphanPeopleClean = orphanPeople.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    email: p.email,
    phone: p.phone,
    relationship: p.relationship,
  }));

  // Simple org list for the person creation form dropdown
  const orgOptions = orgs.map((o) => ({ id: o.id, name: o.name }));

  return (
    <div className="mx-auto max-w-2xl px-4">
      {/* Header */}
      <header className="pt-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-xl text-navy">People</h1>
          <div className="flex items-center gap-2">
            <CreatePersonForm organisations={orgOptions} />
            <CreateOrgForm />
          </div>
        </div>
      </header>

      {/* Search + Filtered List */}
      <PeopleSearch
        organisations={orgsWithPeopleFirst}
        orphanPeople={orphanPeopleClean}
      />

      <div className="h-8" />
    </div>
  );
}
