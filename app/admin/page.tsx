import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const cards = [
    {
      title: "SOP Admin",
      description: "Create, edit, and deactivate staff checklists.",
      href: "/admin/ops",
      label: "Operations",
    },
    {
      title: "Announcements",
      description: "Post updates for opening, closing, or all-day staff.",
      href: "/admin/announcements",
      label: "Comms",
    },
    {
      title: "Shift Notes",
      description: "Review staff notes and mark them resolved.",
      href: "/admin/shift-notes",
      label: "Staff",
    },
    {
      title: "Profiles",
      description: "Manage staff profiles and roles.",
      href: "/admin-profiles",
      label: "People",
    },
    {
      title: "Ingredient Costing",
      description: "Set purchase costs and calculate unit costs.",
      href: "/costing",
      label: "Finance",
    },
    {
      title: "Profit Dashboard",
      description: "Review sales, margins, and profitability.",
      href: "/profit-dashboard",
      label: "Finance",
    },
    {
      title: "Purchase Planner",
      description: "See reorder needs and suggested purchase quantities.",
      href: "/purchase-planner",
      label: "Inventory",
    },
    {
      title: "Waste Dashboard",
      description: "Review wasted items, reasons, and estimated loss.",
      href: "/waste-dashboard",
      label: "Waste",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f1e8] p-8 text-[#2a1a1a]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl bg-[#620b0b] p-8 text-white shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm uppercase tracking-[0.2em] text-white/80">
                Rommana Ops
              </p>
              <h1 className="text-3xl font-semibold">Admin Hub</h1>
              <p className="mt-2 text-sm text-white/80">
                Manage operations, staff tools, reporting, and admin-only pages.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#620b0b]"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-3xl border border-[#e7ddd1] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <p className="text-sm uppercase tracking-[0.2em] text-[#620b0b]">
                {card.label}
              </p>
              <h2 className="mt-3 text-xl font-semibold text-[#2a1a1a]">
                {card.title}
              </h2>
              <p className="mt-2 text-sm text-[#6b5a52]">
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}