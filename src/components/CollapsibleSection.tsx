"use client";

import { useState, type ReactNode } from "react";

interface CollapsibleSectionProps {
  title: ReactNode;
  count?: number;
  defaultOpen?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  actions,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-stone-400 w-4 text-center select-none hover:text-navy transition-colors flex-shrink-0"
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? "\u25BE" : "\u25B8"}
        </button>
        <span className="text-sm font-medium text-navy">{title}</span>
        {count !== undefined && (
          <span className="text-sm text-stone-400 font-normal">
            ({count}{" "}
            {count === 1 ? "card" : "cards"})
          </span>
        )}
        {actions && (
          <div className="ml-auto flex items-center gap-1">{actions}</div>
        )}
      </div>
      {open && <div className="mt-2 ml-5.5">{children}</div>}
    </div>
  );
}
