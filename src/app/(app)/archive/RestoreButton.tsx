"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";

interface RestoreButtonProps {
  entityType: string;
  entityId: string;
  apiPath: string;
}

export function RestoreButton({ entityType, entityId, apiPath }: RestoreButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  void entityType;
  void entityId;

  const handleRestore = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      });

      if (!res.ok) throw new Error("Failed to restore");

      showToast("Item restored");
      router.refresh();
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRestore}
      disabled={submitting}
      className="text-sm text-blue-600 hover:underline disabled:opacity-40 transition-colors ml-4 flex-shrink-0"
    >
      {submitting ? "Restoring..." : "Restore"}
    </button>
  );
}
