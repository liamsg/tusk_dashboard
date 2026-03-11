"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface SidebarProps {
  user: { id: string; name: string; email: string };
}

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/browse", label: "Browse" },
  { href: "/todos", label: "To-Dos" },
  { href: "/people", label: "People" },
  { href: "/meeting-notes", label: "Meeting Notes" },
  { href: "/agenda", label: "Agenda" },
  { href: "/archive", label: "Archive" },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="flex h-full flex-col bg-white border-r border-cream-dark py-6 px-4">
      {/* Logo */}
      <div className="mb-4">
        <h1 className="font-heading text-sm font-semibold uppercase tracking-widest text-navy">
          Tusk
        </h1>
      </div>

      {/* Search trigger */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("open-search"))}
        className="mb-4 flex w-full items-center gap-2 rounded-md border border-stone-200 px-3 py-1.5 text-sm text-stone-400 hover:border-stone-300 hover:text-navy transition-colors"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span>Search...</span>
        <kbd className="ml-auto rounded border border-stone-200 px-1 py-0.5 text-[10px] text-stone-300">
          {"\u2318"}K
        </kbd>
      </button>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`block rounded-md px-3 py-2 text-sm transition-colors ${
              isActive(link.href)
                ? "bg-cream text-navy font-medium"
                : "text-navy-light hover:bg-cream hover:text-navy"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* User / Logout */}
      <div className="border-t border-cream-dark pt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
            {user.name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-navy">{user.name}</p>
            <button
              onClick={handleLogout}
              className="text-xs text-navy-light hover:text-navy transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
