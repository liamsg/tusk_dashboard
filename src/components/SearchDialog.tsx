"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

// ── Types ───────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  title?: string;
  name?: string;
  summary?: string;
  description?: string;
  email?: string;
  role?: string;
  status?: string;
  date?: string;
  content?: string;
  ref_type?: string;
  entity_type?: string;
  entity_id?: string;
  type: string;
}

interface SearchResults {
  cards: SearchResult[];
  todos: SearchResult[];
  people: SearchResult[];
  organisations: SearchResult[];
  meeting_notes: SearchResult[];
  refs: SearchResult[];
  notes: SearchResult[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const SECTION_CONFIG: {
  key: keyof SearchResults;
  label: string;
  getHref: (r: SearchResult) => string;
  getTitle: (r: SearchResult) => string;
  getPreview: (r: SearchResult) => string;
}[] = [
  {
    key: "cards",
    label: "Cards",
    getHref: (r) => `/cards/${r.id}`,
    getTitle: (r) => r.title ?? "Untitled",
    getPreview: (r) => r.summary ?? "",
  },
  {
    key: "todos",
    label: "To-Dos",
    getHref: (r) => `/todos/${r.id}`,
    getTitle: (r) => r.title ?? "Untitled",
    getPreview: (r) => r.description ?? "",
  },
  {
    key: "people",
    label: "People",
    getHref: (r) => `/people/${r.id}`,
    getTitle: (r) => r.name ?? "Unknown",
    getPreview: (r) => [r.role, r.email].filter(Boolean).join(" — "),
  },
  {
    key: "organisations",
    label: "Organisations",
    getHref: (r) => `/people/org/${r.id}`,
    getTitle: (r) => r.name ?? "Unknown",
    getPreview: (r) => r.summary ?? "",
  },
  {
    key: "meeting_notes",
    label: "Meeting Notes",
    getHref: (r) => `/meeting-notes/${r.id}`,
    getTitle: (r) => r.title ?? "Untitled",
    getPreview: (r) => r.date ?? "",
  },
  {
    key: "refs",
    label: "References",
    getHref: (r) => `/refs/${r.id}`,
    getTitle: (r) => r.title ?? "Untitled",
    getPreview: (r) => r.ref_type ?? "",
  },
  {
    key: "notes",
    label: "Notes",
    getHref: (r) => {
      if (r.entity_type === "card") return `/cards/${r.entity_id}`;
      if (r.entity_type === "todo") return `/todos/${r.entity_id}`;
      if (r.entity_type === "person") return `/people/${r.entity_id}`;
      if (r.entity_type === "meeting_note")
        return `/meeting-notes/${r.entity_id}`;
      return "/";
    },
    getTitle: (r) =>
      r.content ? r.content.slice(0, 60) + (r.content.length > 60 ? "..." : "") : "Note",
    getPreview: (r) => r.entity_type ?? "",
  },
];

// Quick-add pattern: "+ card Title" or "+ todo Title"
const QUICK_ADD_RE = /^\+\s*(card|todo)\s+(.+)/i;

// ── Component ───────────────────────────────────────────────────────────────

export function SearchDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // Open / close
  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setResults(null);
    setActiveIndex(-1);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setResults(null);
    setActiveIndex(-1);
  }, []);

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
      }
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, open, close]);

  // Custom event from sidebar button
  useEffect(() => {
    const handler = () => open();
    window.addEventListener("open-search", handler);
    return () => window.removeEventListener("open-search", handler);
  }, [open]);

  // Check for quick-add pattern
  const quickAdd = useMemo(() => {
    const match = query.match(QUICK_ADD_RE);
    if (!match) return null;
    return { type: match[1].toLowerCase() as "card" | "todo", name: match[2].trim() };
  }, [query]);

  // Debounced search (skip if quick-add pattern)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || quickAdd) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setActiveIndex(-1);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, quickAdd]);

  // Flat list of navigable items for keyboard nav
  const flatItems = useMemo(() => {
    if (!results) return [];
    const items: { href: string; id: string }[] = [];
    for (const section of SECTION_CONFIG) {
      const sectionItems = results[section.key];
      if (!sectionItems || sectionItems.length === 0) continue;
      for (const item of sectionItems) {
        items.push({ href: section.getHref(item), id: item.id });
      }
    }
    return items;
  }, [results]);

  // Navigate and close
  const navigateTo = useCallback((href: string) => {
    close();
    router.push(href);
  }, [close, router]);

  // Quick-add handler
  const handleQuickAdd = useCallback(async () => {
    if (!quickAdd || !quickAdd.name || creating) return;
    setCreating(true);
    try {
      if (quickAdd.type === "card") {
        const res = await fetch("/api/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: quickAdd.name }),
        });
        if (res.ok) {
          const card = await res.json();
          close();
          router.push(`/cards/${card.id}`);
          router.refresh();
        }
      } else {
        // For todo, we need assigned_to — fetch current user from session
        const meRes = await fetch("/api/auth/me");
        let assignedTo: string | undefined;
        if (meRes.ok) {
          const me = await meRes.json();
          assignedTo = me.userId;
        }
        const res = await fetch("/api/todos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: quickAdd.name, assigned_to: assignedTo }),
        });
        if (res.ok) {
          const todo = await res.json();
          close();
          router.push(`/todos/${todo.id}`);
          router.refresh();
        }
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }, [quickAdd, creating, close, router]);

  // Keyboard navigation within results
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (quickAdd && e.key === "Enter") {
      e.preventDefault();
      handleQuickAdd();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = prev + 1;
        return next >= flatItems.length ? 0 : next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? flatItems.length - 1 : next;
      });
    } else if (e.key === "Enter" && activeIndex >= 0 && activeIndex < flatItems.length) {
      e.preventDefault();
      navigateTo(flatItems[activeIndex].href);
    }
  }, [quickAdd, handleQuickAdd, flatItems, activeIndex, navigateTo]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !resultsRef.current) return;
    const buttons = resultsRef.current.querySelectorAll("[data-result-item]");
    const activeButton = buttons[activeIndex];
    if (activeButton) {
      activeButton.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  const hasResults =
    results &&
    SECTION_CONFIG.some((s) => (results[s.key]?.length ?? 0) > 0);

  // Track running index across sections for keyboard nav
  let runningIndex = 0;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh]"
      onClick={close}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy/20 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-cream-dark px-4 py-3">
          <svg
            className="h-4 w-4 shrink-0 text-stone-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search or type + card / + todo to create..."
            className="flex-1 bg-transparent text-sm text-navy placeholder:text-stone-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block rounded border border-stone-200 px-1.5 py-0.5 text-[10px] text-stone-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto" ref={resultsRef}>
          {/* Quick-add prompt */}
          {quickAdd && quickAdd.name && (
            <div className="px-4 py-4">
              <button
                onClick={handleQuickAdd}
                disabled={creating}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg bg-cream hover:bg-cream-dark transition-colors"
              >
                <span className="flex items-center justify-center h-6 w-6 rounded bg-navy text-white text-xs font-bold">
                  +
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-navy">
                    {creating ? "Creating..." : `Create ${quickAdd.type}: "${quickAdd.name}"`}
                  </p>
                  <p className="text-xs text-stone-400">
                    Press Enter to create
                  </p>
                </div>
              </button>
            </div>
          )}

          {quickAdd && !quickAdd.name && (
            <div className="px-4 py-6 text-center text-sm text-stone-400">
              Type a name after &ldquo;+ {quickAdd.type}&rdquo; to create
            </div>
          )}

          {loading && (
            <div className="px-4 py-6 text-center text-sm text-stone-400">
              Searching...
            </div>
          )}

          {!loading && !quickAdd && query.trim() && !hasResults && (
            <div className="px-4 py-6 text-center text-sm text-stone-400">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading && hasResults && (
            <div className="py-2">
              {SECTION_CONFIG.map((section) => {
                const items = results![section.key];
                if (!items || items.length === 0) return null;

                const sectionItems = items.map((item) => {
                  const itemIndex = runningIndex++;
                  return (
                    <button
                      key={item.id}
                      data-result-item
                      onClick={() => navigateTo(section.getHref(item))}
                      className={`flex w-full items-start gap-3 px-4 py-2 text-left transition-colors ${
                        itemIndex === activeIndex
                          ? "bg-cream"
                          : "hover:bg-cream"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-navy">
                          {section.getTitle(item)}
                        </p>
                        {section.getPreview(item) && (
                          <p className="truncate text-xs text-stone-400">
                            {section.getPreview(item)}
                          </p>
                        )}
                      </div>
                      {item.status && (
                        <span className="shrink-0 text-[10px] text-stone-400">
                          {item.status.replace("_", " ")}
                        </span>
                      )}
                    </button>
                  );
                });

                return (
                  <div key={section.key}>
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                        {section.label}
                      </span>
                    </div>
                    {sectionItems}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !quickAdd && !query.trim() && (
            <div className="px-4 py-6 text-center text-sm text-stone-400">
              Start typing to search, or <span className="font-medium">+ card</span> / <span className="font-medium">+ todo</span> to create
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
