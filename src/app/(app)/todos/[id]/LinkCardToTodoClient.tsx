"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LinkedCard {
  id: string;
  title: string;
  category_name: string | null;
  subcategory_name: string | null;
}

interface LinkCardToTodoClientProps {
  todoId: string;
  allCards: LinkedCard[];
}

export function LinkCardToTodoClient({
  todoId,
  allCards,
}: LinkCardToTodoClientProps) {
  const [open, setOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(
    allCards[0]?.id ?? ""
  );
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!selectedCardId || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link_card_id: selectedCardId }),
      });

      if (!res.ok) throw new Error("Failed to link card");

      setOpen(false);
      setSelectedCardId(allCards[0]?.id ?? "");
      router.refresh();
    } catch {
      // keep form open
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-stone-400 hover:text-navy transition-colors"
      >
        + Link
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-stone-200 bg-white p-3">
      <div>
        <label className="block text-xs text-stone-400 mb-1">
          Select card
        </label>
        <select
          value={selectedCardId}
          onChange={(e) => setSelectedCardId(e.target.value)}
          className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm text-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        >
          {allCards.map((c) => {
            const path = [c.category_name, c.subcategory_name]
              .filter(Boolean)
              .join(" > ");
            return (
              <option key={c.id} value={c.id}>
                {c.title}
                {path ? ` (${path})` : ""}
              </option>
            );
          })}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !selectedCardId}
          className="rounded bg-navy px-3 py-1.5 text-xs text-white hover:bg-navy-light disabled:opacity-40 transition-colors"
        >
          {submitting ? "Linking..." : "Link Card"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-stone-400 hover:text-navy transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
