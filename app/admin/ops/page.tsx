"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

type Sop = {
  id: string;
  title: string;
  sop_type: string;
  frequency: string;
  is_active: boolean;
};

export default function AdminOpsPage() {
  const supabase = createClient();
  const [sops, setSops] = useState<Sop[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadSops() {
    const { data, error } = await supabase
      .from("sops")
      .select("id, title, sop_type, frequency, is_active")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      console.error(error);
    } else {
      setSops(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSops();
  }, []);

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase
      .from("sops")
      .update({ is_active: !current })
      .eq("id", id);

    if (error) {
      alert(error.message);
      console.error(error);
      return;
    }

    await loadSops();
  }

  if (loading) {
    return <main className="p-6">Loading...</main>;
  }

  return (
    <main className="min-h-screen bg-[#f8f5f0] p-6 text-[#2f241f]">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Ops Admin</h1>
<Link
  href="/admin/ops/dashboard"
  className="rounded-xl border px-4 py-2 text-sm"
>
  View Dashboard
</Link>
          <Link
            href="/admin/ops/new"
            className="rounded-xl bg-[#620b0b] px-4 py-2 text-white"
          >
            + New SOP
          </Link>
          
        </div>

        <div className="space-y-4">
          {sops.map((sop) => (
            <div
              key={sop.id}
              className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
            >
              <div>
                <h2 className="font-bold">{sop.title}</h2>
                <p className="text-sm text-[#6f625c]">
                  {sop.sop_type} • {sop.frequency} •{" "}
                  {sop.is_active ? "Active" : "Inactive"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/ops/${sop.id}`}
                  className="rounded-xl border px-3 py-2 text-sm"
                >
                  Edit
                </Link>

                <button
                  type="button"
                  onClick={() => toggleActive(sop.id, sop.is_active)}
                  className="rounded-xl border px-3 py-2 text-sm"
                >
                  {sop.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}