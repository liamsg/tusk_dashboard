"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";

interface ArchiveButtonProps {
  cardId: string;
}

export function ArchiveButton({ cardId }: ArchiveButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleArchive = async () => {
    if (!confirm("Archive this card? It will be moved to the archive.")) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });

      if (!res.ok) throw new Error("Failed to archive");

      showToast("Card archived");
      router.push("/browse");
      router.refresh();
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleArchive}
      disabled={submitting}
      className="rounded border border-stone-200 px-3 py-2 text-xs text-stone-400 hover:text-amber-warn hover:border-amber-warn transition-colors disabled:opacity-40"
    >
      {submitting ? "Archiving..." : "Archive"}
    </button>
  );
}
