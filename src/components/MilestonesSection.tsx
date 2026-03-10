"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Milestone {
  id: string;
  title: string;
  target_date: string | null;
  status: string;
}

interface MilestonesSectionProps {
  milestones: Milestone[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysFromNow(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + (iso.includes("T") ? "" : "T00:00:00"));
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function shortDate(iso: string): string {
  const d = new Date(iso + (iso.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const STATUS_ORDER = ["upcoming", "in_progress", "complete"] as const;
type MilestoneStatus = (typeof STATUS_ORDER)[number];

const STATUS_LABELS: Record<MilestoneStatus, string> = {
  upcoming: "Upcoming",
  in_progress: "In Progress",
  complete: "Complete",
};

const STATUS_DOT_COLORS: Record<MilestoneStatus, string> = {
  upcoming: "bg-stone-400",
  in_progress: "bg-blue-500",
  complete: "bg-green-500",
};

function nextStatus(current: string): MilestoneStatus {
  const idx = STATUS_ORDER.indexOf(current as MilestoneStatus);
  if (idx === -1) return "upcoming";
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
}

// ── Component ──────────────────────────────────────────────────────────────────

export function MilestonesSection({ milestones: initialMilestones }: MilestonesSectionProps) {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const newTitleRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // ── PATCH milestone ────────────────────────────────────────────────────────

  const patchMilestone = async (id: string, updates: Partial<Milestone>) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/milestones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = (await res.json()) as Milestone;
      setMilestones((prev) =>
        prev.map((ms) => (ms.id === id ? { ...ms, ...updated } : ms))
      );
      showToast("Milestone updated");
      router.refresh();
    } catch {
      // revert silently
    } finally {
      setSavingId(null);
    }
  };

  // ── POST new milestone ─────────────────────────────────────────────────────

  const createMilestone = async () => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle || !newDate) return;

    setSavingId("new");
    try {
      const res = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle, target_date: newDate }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const created = (await res.json()) as Milestone;
      setMilestones((prev) => [...prev, created].sort((a, b) => {
        if (!a.target_date) return 1;
        if (!b.target_date) return -1;
        return a.target_date.localeCompare(b.target_date);
      }));
      showToast("Milestone added");
      setNewTitle("");
      setNewDate("");
      setAdding(false);
      router.refresh();
    } catch {
      // keep form open
    } finally {
      setSavingId(null);
    }
  };

  // ── Inline title edit ──────────────────────────────────────────────────────

  const startEditTitle = (ms: Milestone) => {
    setEditingTitleId(ms.id);
    setEditTitle(ms.title);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const saveTitle = (id: string) => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== milestones.find((m) => m.id === id)?.title) {
      patchMilestone(id, { title: trimmed });
    }
    setEditingTitleId(null);
  };

  // ── Inline date edit ───────────────────────────────────────────────────────

  const startEditDate = (ms: Milestone) => {
    setEditingDateId(ms.id);
    setEditDate(ms.target_date ?? "");
    setTimeout(() => dateInputRef.current?.focus(), 0);
  };

  const saveDate = (id: string) => {
    if (editDate !== milestones.find((m) => m.id === id)?.target_date) {
      patchMilestone(id, { target_date: editDate || null });
    }
    setEditingDateId(null);
  };

  // ── Status toggle ──────────────────────────────────────────────────────────

  const toggleStatus = (ms: Milestone) => {
    const newStatus = nextStatus(ms.status);
    patchMilestone(ms.id, { status: newStatus });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {milestones.length === 0 && !adding ? (
        <p className="text-sm text-stone-500">No milestones set yet.</p>
      ) : (
        <ul className="space-y-2">
          {milestones.map((ms) => {
            const days = ms.target_date ? daysFromNow(ms.target_date) : null;
            const date = ms.target_date ? shortDate(ms.target_date) : null;
            const status = ms.status as MilestoneStatus;
            const isSaving = savingId === ms.id;

            return (
              <li
                key={ms.id}
                className={`text-sm flex items-baseline gap-2 group ${isSaving ? "opacity-60" : ""}`}
              >
                {/* Status dot */}
                <button
                  type="button"
                  onClick={() => toggleStatus(ms)}
                  title={`Status: ${STATUS_LABELS[status] ?? ms.status}. Click to change.`}
                  className="flex-shrink-0 mt-1 cursor-pointer"
                >
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT_COLORS[status] ?? "bg-stone-400"} transition-colors`}
                  />
                </button>

                {/* Title */}
                {editingTitleId === ms.id ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => saveTitle(ms.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveTitle(ms.id);
                      if (e.key === "Escape") setEditingTitleId(null);
                    }}
                    className="font-medium text-navy bg-transparent border-b border-navy/30 focus:outline-none focus:border-navy min-w-0 flex-shrink"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditTitle(ms)}
                    className="font-medium text-navy text-left hover:bg-stone-50 rounded px-0.5 -mx-0.5 transition-colors group/title"
                  >
                    {ms.title}
                    <svg
                      className="inline-block ml-1 h-3 w-3 text-stone-300 opacity-0 group-hover:opacity-100 group-hover/title:opacity-100 transition-opacity"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}

                {/* Dotted leader */}
                <span className="flex-1 border-b border-dotted border-stone-300" />

                {/* Date */}
                {editingDateId === ms.id ? (
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    onBlur={() => saveDate(ms.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveDate(ms.id);
                      if (e.key === "Escape") setEditingDateId(null);
                    }}
                    className="text-sm text-stone-500 bg-transparent border-b border-navy/30 focus:outline-none focus:border-navy tabular-nums"
                  />
                ) : date ? (
                  <button
                    type="button"
                    onClick={() => startEditDate(ms)}
                    className="text-stone-500 whitespace-nowrap tabular-nums hover:bg-stone-50 rounded px-0.5 -mx-0.5 transition-colors group/date"
                  >
                    {date}{" "}
                    <span className="text-stone-400">
                      ({days !== null && days >= 0 ? `${days} days` : `${Math.abs(days!)}d ago`})
                    </span>
                    <svg
                      className="inline-block ml-1 h-3 w-3 text-stone-300 opacity-0 group-hover:opacity-100 group-hover/date:opacity-100 transition-opacity"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditDate(ms)}
                    className="text-stone-400 hover:text-navy transition-colors"
                  >
                    No date set
                  </button>
                )}

                {/* Status label */}
                <button
                  type="button"
                  onClick={() => toggleStatus(ms)}
                  className="text-xs text-stone-400 hover:text-navy whitespace-nowrap transition-colors"
                >
                  {STATUS_LABELS[status] ?? ms.status}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add new milestone */}
      {adding ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              ref={newTitleRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Milestone title"
              onKeyDown={(e) => {
                if (e.key === "Enter") createMilestone();
                if (e.key === "Escape") {
                  setAdding(false);
                  setNewTitle("");
                  setNewDate("");
                }
              }}
              className="flex-1 rounded border border-stone-200 bg-white px-3 py-1.5 text-sm text-navy placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-navy/20"
            />
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="rounded border border-stone-200 bg-white px-3 py-1.5 text-sm text-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={createMilestone}
              disabled={!newTitle.trim() || !newDate || savingId === "new"}
              className="rounded bg-navy px-3 py-1 text-xs text-white hover:bg-navy-light disabled:opacity-40 transition-colors"
            >
              {savingId === "new" ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewTitle("");
                setNewDate("");
              }}
              className="text-xs text-stone-400 hover:text-navy transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setAdding(true);
            setTimeout(() => newTitleRef.current?.focus(), 0);
          }}
          className="mt-3 text-xs text-stone-400 hover:text-navy transition-colors"
        >
          + Add
        </button>
      )}
    </div>
  );
}
