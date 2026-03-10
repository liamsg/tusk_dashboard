import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";

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
      {/* Desktop: sidebar + main */}
      <div className="hidden md:flex">
        <aside className="fixed inset-y-0 left-0 w-56">
          <Sidebar user={session.user} />
        </aside>
        <main className="ml-56 flex-1 p-6">{children}</main>
      </div>

      {/* Mobile: main + bottom nav */}
      <div className="md:hidden">
        <main className="p-4 pb-20">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
