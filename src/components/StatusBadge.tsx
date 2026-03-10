"use client";

const STATUS_CONFIG: Record<
  string,
  { label: string; colorClass: string }
> = {
  new: { label: "New", colorClass: "bg-stone-400" },
  in_progress: { label: "In Progress", colorClass: "bg-blue-500" },
  done: { label: "Done", colorClass: "bg-green-500" },
  on_hold: { label: "On Hold", colorClass: "bg-amber-500" },
};

interface StatusBadgeProps {
  status: "new" | "in_progress" | "done" | "on_hold";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.new;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-navy">
      <span
        className={`inline-block h-2 w-2 rounded-full ${config.colorClass}`}
      />
      {config.label}
    </span>
  );
}
