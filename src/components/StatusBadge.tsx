"use client";

const STATUS_CONFIG: Record<
  string,
  { label: string; dotClass: string; borderClass: string }
> = {
  new: { label: "New", dotClass: "bg-stone-400", borderClass: "border-stone-400" },
  in_progress: { label: "In Progress", dotClass: "bg-blue-500", borderClass: "border-blue-500" },
  done: { label: "Done", dotClass: "bg-green-500", borderClass: "border-green-500" },
  on_hold: { label: "On Hold", dotClass: "bg-amber-500", borderClass: "border-amber-500" },
};

interface StatusBadgeProps {
  status: "new" | "in_progress" | "done" | "on_hold";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.new;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border-l-2 ${config.borderClass} bg-cream px-2 py-0.5 text-xs font-medium text-navy`}
    >
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${config.dotClass}`}
      />
      {config.label}
    </span>
  );
}
