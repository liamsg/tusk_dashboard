"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CardOption {
  id: string;
  title: string;
}

interface PersonOption {
  id: string;
  name: string;
}

interface LinkItemToNoteProps {
  meetingNoteId: string;
  availableCards: CardOption[];
  availablePeople: PersonOption[];
}

export function LinkItemToNote({
  meetingNoteId,
  availableCards,
  availablePeople,
}: LinkItemToNoteProps) {
  const [open, setOpen] = useState(false);
  const [linkType, setLinkType] = useState<"card" | "person">("card");
  const [selectedId, setSelectedId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const resetForm = () => {
    setLinkType("card");
    setSelectedId("");
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (!selectedId || submitting) return;

    setSubmitting(true);
    try {
      const body =
        linkType === "card"
          ? { link_card_id: selectedId }
          : { link_person_id: selectedId };

      const res = await fetch(`/api/meeting-notes/${meetingNoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to link item");

      resetForm();
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
        <label className="block text-xs text-stone-400 mb-1">Link type</label>
        <select
          value={linkType}
          onChange={(e) => {
            setLinkType(e.target.value as "card" | "person");
            setSelectedId("");
          }}
          className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm text-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        >
          <option value="card">Card</option>
          <option value="person">Person</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-stone-400 mb-1">
          Select {linkType}
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-sm text-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        >
          <option value="">Choose...</option>
          {linkType === "card"
            ? availableCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.title}
                </option>
              ))
            : availablePeople.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !selectedId}
          className="rounded bg-navy px-3 py-1.5 text-xs text-white hover:bg-navy-light disabled:opacity-40 transition-colors"
        >
          {submitting ? "Linking..." : "Link"}
        </button>
        <button
          type="button"
          onClick={resetForm}
          className="text-xs text-stone-400 hover:text-navy transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
