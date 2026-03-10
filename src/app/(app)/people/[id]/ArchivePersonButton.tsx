"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";

interface ArchivePersonButtonProps {
  personId: string;
}

export function ArchivePersonButton({ personId }: ArchivePersonButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleArchive = async () => {
    if (!confirm("Archive this person? They will be hidden from active views.")) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/people/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });

      if (!res.ok) throw new Error("Failed to archive");

      showToast("Person archived");
      router.push("/people");
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
      className="rounded border border-stone-200 px-3 py-1.5 text-xs text-stone-400 hover:text-amber-warn hover:border-amber-warn transition-colors disabled:opacity-40"
    >
      {submitting ? "Archiving..." : "Archive"}
    </button>
  );
}
