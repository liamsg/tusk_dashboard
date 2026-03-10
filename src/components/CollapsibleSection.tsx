"use client";

import { useState, type ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
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
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-sm font-medium text-navy hover:text-navy-light transition-colors text-left"
        >
          <span className="text-stone-400 w-4 text-center select-none">
            {open ? "\u25BE" : "\u25B8"}
          </span>
          <span>{title}</span>
          {count !== undefined && (
            <span className="text-stone-400 font-normal">
              ({count}{" "}
              {count === 1 ? "card" : "cards"})
            </span>
          )}
        </button>
        {actions && (
          <div className="ml-auto flex items-center gap-1">{actions}</div>
        )}
      </div>
      {open && <div className="mt-2 ml-5.5">{children}</div>}
    </div>
  );
}
