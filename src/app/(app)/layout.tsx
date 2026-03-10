import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { SearchDialog } from "@/components/SearchDialog";
import { Toast } from "@/components/Toast";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = getSession(cookieStore);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Global overlays */}
      <SearchDialog />
      <Toast />

      {/* Desktop: sidebar + main */}
      <div className="hidden md:flex">
        <aside className="fixed inset-y-0 left-0 w-56">
          <Sidebar user={session.user} />
        </aside>
        <main className="ml-56 flex-1 p-6">{children}</main>
      </div>

      {/* Mobile: header + main + bottom nav */}
      <div className="md:hidden">
        <header className="fixed top-0 left-0 right-0 z-50 flex h-12 items-center justify-between border-b border-cream-dark bg-white px-4">
          <span className="font-heading text-sm font-semibold uppercase tracking-widest text-navy">
            Tusk
          </span>
          <span className="text-sm text-navy-light">{session.user.name?.split(" ")[0]}</span>
        </header>
        <main className="p-4 pt-16 pb-20">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
