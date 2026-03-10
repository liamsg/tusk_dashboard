"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/browse", label: "Browse" },
  { href: "/todos", label: "To-Dos" },
  { href: "/people", label: "People" },
];

const moreItems = [
  { href: "/meeting-notes", label: "Meetings" },
  { href: "/archive", label: "Archive" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isMoreActive = moreItems.some((item) => isActive(item.href));

  // Close the menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    if (moreOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moreOpen]);

  // Close when navigating
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setMoreOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-cream-dark bg-white">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center px-2 py-1 text-xs transition-colors ${
              isActive(item.href)
                ? "text-navy font-medium"
                : "text-navy-light hover:text-navy"
            }`}
          >
            <span>{item.label}</span>
          </Link>
        ))}

        {/* More menu */}
        <div ref={moreRef} className="relative">
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className={`flex flex-col items-center px-2 py-1 text-xs transition-colors ${
              isMoreActive || moreOpen
                ? "text-navy font-medium"
                : "text-navy-light hover:text-navy"
            }`}
          >
            <span>More</span>
          </button>

          {moreOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-40 rounded-md border border-cream-dark bg-white py-1 shadow-lg">
              {moreItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    isActive(item.href)
                      ? "bg-cream text-navy font-medium"
                      : "text-navy-light hover:bg-cream hover:text-navy"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="my-1 border-t border-cream-dark" />
              <button
                onClick={handleLogout}
                className="block w-full px-4 py-2 text-left text-sm text-navy-light transition-colors hover:bg-cream hover:text-navy"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
