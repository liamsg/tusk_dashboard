"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";

const STATUS_OPTIONS = [
  { value: "new", label: "New", dotClass: "bg-stone-400" },
  { value: "in_progress", label: "In Progress", dotClass: "bg-blue-500" },
  { value: "done", label: "Done", dotClass: "bg-green-500" },
  { value: "on_hold", label: "On Hold", dotClass: "bg-amber-500" },
] as const;

interface StatusDropdownProps {
  cardId: string;
  currentStatus: "new" | "in_progress" | "done" | "on_hold";
}

export function StatusDropdown({ cardId, currentStatus }: StatusDropdownProps) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const current = STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0];

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as typeof currentStatus;
    setStatus(newStatus);
    setSaving(true);

    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        setStatus(currentStatus); // revert
        throw new Error("Failed to update status");
      }

      showToast("Status updated");
      router.refresh();
    } catch {
      // reverted above
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <span
        className={`inline-block h-2 w-2 rounded-full ${current.dotClass}`}
      />
      <select
        value={status}
        onChange={handleChange}
        disabled={saving}
        className="appearance-none bg-transparent text-sm text-navy cursor-pointer border-none focus:outline-none pr-4 disabled:opacity-50"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none text-stone-400 text-xs -ml-3">
        &#9662;
      </span>
    </div>
  );
}
