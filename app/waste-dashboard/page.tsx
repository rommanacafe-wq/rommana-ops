"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type WasteLog = {
  id: string;
  quantity: number;
  unit: string | null;
  reason: string;
  created_at: string;
  inventory_items:
    | {
        name: string;
        unit: string | null;
        cost_per_unit: number | null;
      }
    | {
        name: string;
        unit: string | null;
        cost_per_unit: number | null;
      }[]
    | null;
};

type WasteSummary = {
  name: string;
  unit: string;
  quantity: number;
  loss: number;
};

function getItem(log: WasteLog) {
  if (Array.isArray(log.inventory_items)) {
    return log.inventory_items[0] || null;
  }

  return log.inventory_items || null;
}

export default function WasteDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [logs, setLogs] = useState<WasteLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWaste() {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || profile?.role !== "admin") {
        router.replace("/");
        return;
      }

      const { data, error } = await supabase
        .from("waste_logs")
        .select(`
          id,
          quantity,
          unit,
          reason,
          created_at,
          inventory_items (
            name,
            unit,
            cost_per_unit
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        alert(error.message);
        setLoading(false);
        return;
      }

      setLogs((data as unknown as WasteLog[]) || []);
      setLoading(false);
    }

    loadWaste();
  }, [router, supabase]);

  const totalLoss = logs.reduce((sum, log) => {
    const item = getItem(log);
    const cost = Number(item?.cost_per_unit || 0);
    return sum + Number(log.quantity || 0) * cost;
  }, 0);

  const totalQuantity = logs.reduce(
    (sum, log) => sum + Number(log.quantity || 0),
    0
  );

  const itemMap = new Map<string, WasteSummary>();

  logs.forEach((log) => {
    const item = getItem(log);

    const name = item?.name || "Unknown Item";
    const unit = log.unit || item?.unit || "";
    const cost = Number(item?.cost_per_unit || 0);
    const quantity = Number(log.quantity || 0);
    const loss = quantity * cost;

    const existing = itemMap.get(name);

    if (existing) {
      existing.quantity += quantity;
      existing.loss += loss;
    } else {
      itemMap.set(name, {
        name,
        unit,
        quantity,
        loss,
      });
    }
  });

  const topItems = Array.from(itemMap.values()).sort(
    (a, b) => b.loss - a.loss
  );

  const reasonMap = new Map<string, number>();

  logs.forEach((log) => {
    reasonMap.set(log.reason, (reasonMap.get(log.reason) || 0) + 1);
  });

  const topReasons = Array.from(reasonMap.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f5f0] p-6 text-[#2f241f]">
        Loading waste dashboard...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f5f0] p-6 text-[#2f241f]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-3xl bg-[#620b0b] p-6 text-white">
          <p className="text-sm uppercase tracking-[0.2em] text-white/70">
            Rommana Ops
          </p>
          <h1 className="mt-2 text-3xl font-bold">Waste Dashboard</h1>
          <p className="mt-2 text-white/80">
            Track wasted items, reasons, and estimated dollar loss.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-[#6f625c]">Estimated Waste Loss</p>
            <p className="mt-2 text-3xl font-bold text-[#620b0b]">
              ${totalLoss.toFixed(2)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-[#6f625c]">Waste Logs</p>
            <p className="mt-2 text-3xl font-bold text-[#620b0b]">
              {logs.length}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-[#6f625c]">Total Quantity Wasted</p>
            <p className="mt-2 text-3xl font-bold text-[#620b0b]">
              {totalQuantity}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Top Wasted Items</h2>

            <div className="mt-4 space-y-3">
              {topItems.length === 0 ? (
                <p className="text-sm text-[#6f625c]">No waste logged yet.</p>
              ) : (
                topItems.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-2xl bg-[#faf7f2] px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-[#6f625c]">
                        {item.quantity} {item.unit} wasted
                      </p>
                    </div>

                    <p className="font-bold text-[#620b0b]">
                      ${item.loss.toFixed(2)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Top Waste Reasons</h2>

            <div className="mt-4 space-y-3">
              {topReasons.length === 0 ? (
                <p className="text-sm text-[#6f625c]">No reasons yet.</p>
              ) : (
                topReasons.map(([reason, count]) => (
                  <div
                    key={reason}
                    className="flex items-center justify-between rounded-2xl bg-[#faf7f2] px-4 py-3"
                  >
                    <p className="font-semibold">{reason}</p>
                    <p className="font-bold text-[#620b0b]">{count}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Recent Waste Logs</h2>

          <div className="mt-4 space-y-3">
            {logs.length === 0 ? (
              <p className="text-sm text-[#6f625c]">No recent waste logs.</p>
            ) : (
              logs.slice(0, 10).map((log) => {
                const item = getItem(log);
                const cost = Number(item?.cost_per_unit || 0);
                const loss = Number(log.quantity || 0) * cost;

                return (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-[#eee6df] p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold">
                          {item?.name || "Unknown Item"}
                        </p>
                        <p className="text-sm text-[#6f625c]">
                          {log.quantity} {log.unit || item?.unit || ""} •{" "}
                          {log.reason}
                        </p>
                      </div>

                      <p className="font-bold text-[#620b0b]">
                        ${loss.toFixed(2)}
                      </p>
                    </div>

                    <p className="mt-2 text-xs text-[#8a7a72]">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}