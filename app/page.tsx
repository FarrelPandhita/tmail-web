import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Redirect to role-appropriate dashboard
  switch (session.role) {
    case "buyer":
      redirect("/dashboard");
    case "generator_admin":
      redirect("/generator");
    case "superadmin":
      redirect("/superadmin");
    default:
      redirect("/login");
  }
}
