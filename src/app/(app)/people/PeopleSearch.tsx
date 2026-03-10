"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface Person {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  relationship: string | null;
}

interface Organisation {
  id: string;
  name: string;
  org_type: string | null;
  people: Person[];
}

interface PeopleSearchProps {
  organisations: Organisation[];
  orphanPeople: Person[];
}

type TabFilter = "all" | "organisations" | "people";

export function PeopleSearch({ organisations, orphanPeople }: PeopleSearchProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    const filteredOrgs = organisations
      .map((org) => {
        const orgMatches =
          !q ||
          org.name.toLowerCase().includes(q) ||
          (org.org_type && org.org_type.toLowerCase().includes(q));

        const matchedPeople = org.people.filter(
          (p) =>
            !q ||
            p.name.toLowerCase().includes(q) ||
            (p.role && p.role.toLowerCase().includes(q)) ||
            (p.email && p.email.toLowerCase().includes(q)) ||
            org.name.toLowerCase().includes(q)
        );

        // Show org if org itself matches or any people match
        if (orgMatches || matchedPeople.length > 0) {
          return {
            ...org,
            people: q ? matchedPeople : org.people,
            orgMatches,
          };
        }
        return null;
      })
      .filter(Boolean) as (Organisation & { orgMatches: boolean })[];

    const filteredOrphans = orphanPeople.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.role && p.role.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
    );

    return { orgs: filteredOrgs, orphans: filteredOrphans };
  }, [search, organisations, orphanPeople]);

  const showOrgs = tab === "all" || tab === "organisations";
  const showPeople = tab === "all" || tab === "people";

  // For "people" tab, flatten all people
  const allPeopleFlat = useMemo(() => {
    if (tab !== "people") return [];
    const people: (Person & { orgName: string | null })[] = [];
    for (const org of filtered.orgs) {
      for (const p of org.people) {
        people.push({ ...p, orgName: org.name });
      }
    }
    for (const p of filtered.orphans) {
      people.push({ ...p, orgName: null });
    }
    return people;
  }, [tab, filtered]);

  const tabs: { key: TabFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "organisations", label: "Organisations" },
    { key: "people", label: "People" },
  ];

  const isEmpty =
    (showOrgs && filtered.orgs.length === 0 && !showPeople) ||
    (showPeople && allPeopleFlat.length === 0 && !showOrgs) ||
    (tab === "all" &&
      filtered.orgs.length === 0 &&
      filtered.orphans.length === 0);

  return (
    <div>
      {/* Search + Tabs */}
      <div className="flex items-center gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="flex-1 rounded border border-stone-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
        <div className="flex rounded border border-stone-200 overflow-hidden">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-xs transition-colors ${
                tab === t.key
                  ? "bg-navy text-white"
                  : "bg-white text-stone-500 hover:text-navy"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isEmpty && (
        <p className="text-sm text-stone-400 py-8 text-center">
          {search ? "No results found." : "No people or organisations yet."}
        </p>
      )}

      {/* "All" or "Organisations" tab: grouped by org */}
      {(tab === "all" || tab === "organisations") && (
        <div className="space-y-5">
          {filtered.orgs.map((org) => (
            <div key={org.id}>
              <div className="flex items-baseline gap-2 mb-1.5">
                <Link
                  href={`/people/org/${org.id}`}
                  className="font-medium text-base text-navy hover:underline"
                >
                  {org.name}
                </Link>
                {org.org_type && (
                  <span className="text-sm text-stone-400">
                    &middot; {org.org_type}
                  </span>
                )}
              </div>
              {tab !== "organisations" && org.people.length > 0 && (
                <ul className="ml-4 space-y-1">
                  {org.people.map((person) => (
                    <li key={person.id} className="text-sm">
                      <Link
                        href={`/people/${person.id}`}
                        className="text-navy hover:underline"
                      >
                        {person.name}
                      </Link>
                      {person.role && (
                        <span className="text-stone-500">
                          {" "}
                          &middot; {person.role}
                        </span>
                      )}
                      {person.email && (
                        <span className="text-stone-500">
                          {" "}
                          &middot;{" "}
                          <a
                            href={`mailto:${person.email}`}
                            className="hover:text-navy transition-colors"
                          >
                            {person.email}
                          </a>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {tab === "organisations" && (
                <p className="ml-4 text-xs text-stone-400">
                  {org.people.length} {org.people.length === 1 ? "person" : "people"}
                </p>
              )}
            </div>
          ))}

          {/* Orphan people (unaffiliated) in "All" tab */}
          {tab === "all" && filtered.orphans.length > 0 && (
            <div>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="font-medium text-base text-stone-500">
                  Unaffiliated
                </span>
              </div>
              <ul className="ml-4 space-y-1">
                {filtered.orphans.map((person) => (
                  <li key={person.id} className="text-sm">
                    <Link
                      href={`/people/${person.id}`}
                      className="text-navy hover:underline"
                    >
                      {person.name}
                    </Link>
                    {person.role && (
                      <span className="text-stone-500">
                        {" "}
                        &middot; {person.role}
                      </span>
                    )}
                    {person.email && (
                      <span className="text-stone-500">
                        {" "}
                        &middot;{" "}
                        <a
                          href={`mailto:${person.email}`}
                          className="hover:text-navy transition-colors"
                        >
                          {person.email}
                        </a>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* "People" tab: flat list */}
      {tab === "people" && allPeopleFlat.length > 0 && (
        <ul className="space-y-2">
          {allPeopleFlat.map((person) => (
            <li key={person.id} className="text-sm">
              <Link
                href={`/people/${person.id}`}
                className="text-navy hover:underline"
              >
                {person.name}
              </Link>
              {person.role && (
                <span className="text-stone-500">
                  {" "}
                  &middot; {person.role}
                </span>
              )}
              {person.orgName && (
                <span className="text-stone-400">
                  {" "}
                  &middot; {person.orgName}
                </span>
              )}
              {person.email && (
                <span className="text-stone-500">
                  {" "}
                  &middot;{" "}
                  <a
                    href={`mailto:${person.email}`}
                    className="hover:text-navy transition-colors"
                  >
                    {person.email}
                  </a>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
