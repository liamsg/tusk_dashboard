"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";

interface ArchiveOrgButtonProps {
  orgId: string;
}

export function ArchiveOrgButton({ orgId }: ArchiveOrgButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleArchive = async () => {
    if (!confirm("Archive this organisation? It will be hidden from active views.")) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/organisations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });

      if (!res.ok) throw new Error("Failed to archive");

      showToast("Organisation archived");
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
