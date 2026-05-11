import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export default async function GeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || !["generator_admin", "superadmin"].includes(session.role)) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.role} email={session.email} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
