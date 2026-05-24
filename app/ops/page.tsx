"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

type Sop = {
  id: string;
  title: string;
  sop_type: string;
  frequency: string;
  estimated_time_minutes: number | null;
  requires_photo: boolean;
  notes: string | null;
};

const typeLabels: Record<string, string> = {
  opening: "Opening",
  closing: "Closing",
  cleaning: "Cleaning",
  bathroom_cleaning: "Bathroom Cleaning",
  bar_reset: "Bar Reset",
  kitchen_prep: "Kitchen Prep",
  event_setup: "Event Setup",
  event_teardown: "Event Teardown",
  catering_packing: "Catering Packing",
  deep_cleaning: "Deep Cleaning",
};

export default function OpsPage() {
  const supabase = createClient();

  const [sops, setSops] = useState<Sop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSops() {
      const { data, error } = await supabase
        .from("sops")
        .select(
          "id, title, sop_type, frequency, estimated_time_minutes, requires_photo, notes"
        )
        .eq("is_active", true)
        .order("sop_type", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error);
      } else {
        setSops(data || []);
      }

      setLoading(false);
    }

    loadSops();
  }, [supabase]);

  const grouped = sops.reduce<Record<string, Sop[]>>((acc, sop) => {
    const key = sop.sop_type || "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(sop);
    return acc;
  }, {});

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f5f0] p-6 text-[#2f241f]">
        Loading Ops Hub...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f5f0] px-4 py-6 text-[#2f241f]">
      <div className="mx-auto max-w-5xl">
        <section className="mb-8 rounded-3xl bg-[#620b0b] p-6 text-white shadow-sm">
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="text-sm uppercase tracking-[0.2em] text-white/70">
        Rommana Staff
      </p>

      <h1 className="mt-2 text-3xl font-bold">Ops Hub</h1>

      <p className="mt-3 max-w-2xl text-white/85">
        Follow opening, closing, cleaning, prep, and service procedures.
      </p>
    </div>

    <Link
      href="/admin/ops"
      className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#620b0b]"
    >
      Admin
    </Link>
  </div>
</section>

        {sops.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            No active SOPs found.
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([type, items]) => (
              <section key={type}>
                <h2 className="mb-3 text-xl font-semibold">
                  {typeLabels[type] || type}
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  {items.map((sop) => (
                    <Link
                      key={sop.id}
                      href={`/ops/${sop.id}`}
                      className="rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
                    >
                      <h3 className="text-lg font-bold">{sop.title}</h3>

                      {sop.notes && (
                        <p className="mt-2 text-sm text-[#6f625c]">
                          {sop.notes}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-[#f8f5f0] px-3 py-1">
                          {sop.frequency}
                        </span>

                        {sop.estimated_time_minutes && (
                          <span className="rounded-full bg-[#f8f5f0] px-3 py-1">
                            {sop.estimated_time_minutes} min
                          </span>
                        )}

                        {sop.requires_photo && (
                          <span className="rounded-full bg-[#f8f5f0] px-3 py-1">
                            Photo required
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}