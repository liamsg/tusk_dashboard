"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FlagButtonProps {
  cardId: string;
  flagged: boolean;
}

export function FlagButton({ cardId, flagged }: FlagButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagged_for_discussion: flagged ? 0 : 1 }),
      });

      if (!res.ok) throw new Error("Failed to update flag");

      router.refresh();
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  if (flagged) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs text-amber-700 font-medium">
          <span>&#9888;</span> Flagged for discussion
        </span>
        <button
          type="button"
          onClick={handleToggle}
          disabled={submitting}
          className="text-xs text-stone-400 hover:text-navy transition-colors disabled:opacity-40"
        >
          {submitting ? "..." : "Unflag"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={submitting}
      className="rounded border border-stone-200 px-3 py-1.5 text-xs text-stone-400 hover:text-amber-600 hover:border-amber-400 transition-colors disabled:opacity-40"
    >
      {submitting ? "Flagging..." : "Flag for discussion"}
    </button>
  );
}
