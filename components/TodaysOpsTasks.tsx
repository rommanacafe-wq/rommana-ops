"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

type Sop = {
  id: string;
  title: string;
  frequency: string;
  estimated_time_minutes: number | null;
};

type SopLog = {
  sop_id: string;
  completed_at: string;
};

export default function TodaysOpsTasks() {
  const supabase = createClient();

  const [sops, setSops] = useState<Sop[]>([]);
  const [logs, setLogs] = useState<SopLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: sopData } = await supabase
        .from("sops")
        .select("id, title, frequency, estimated_time_minutes")
        .eq("is_active", true)
        .in("frequency", ["daily", "as_needed"])
        .order("created_at", { ascending: true });

      const { data: logData } = await supabase
        .from("sop_logs")
        .select("sop_id, completed_at")
        .gte("completed_at", todayStart.toISOString());

      setSops(sopData || []);
      setLogs(logData || []);
      setLoading(false);
    }

    load();
  }, []);

  function isCompleted(sopId: string) {
    return logs.some((log) => log.sop_id === sopId);
  }

  const completedCount = sops.filter((s) => isCompleted(s.id)).length;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#2f241f]">
            Today’s Ops
          </h2>
          <p className="text-sm text-[#6f625c]">
            {loading
              ? "Loading..."
              : `${completedCount}/${sops.length} completed`}
          </p>
        </div>

        <Link
          href="/ops"
          className="rounded-xl bg-[#620b0b] px-4 py-2 text-sm font-bold text-white"
        >
          View All
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-[#6f625c]">Loading tasks...</p>
      ) : sops.length === 0 ? (
        <p className="text-sm text-[#6f625c]">
          No tasks for today.
        </p>
      ) : (
        <div className="space-y-3">
          {sops.slice(0, 4).map((sop) => {
            const done = isCompleted(sop.id);

            return (
              <Link
                key={sop.id}
                href={`/ops/${sop.id}`}
                className="flex items-center justify-between rounded-2xl border border-[#eee6df] p-4"
              >
                <div>
                  <p className="font-semibold">{sop.title}</p>
                  <p className="text-xs text-[#8a7a72]">
                    {sop.frequency}
                    {sop.estimated_time_minutes
                      ? ` • ${sop.estimated_time_minutes} min`
                      : ""}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    done
                      ? "bg-green-100 text-green-700"
                      : "bg-[#f8f5f0] text-[#620b0b]"
                  }`}
                >
                  {done ? "Done" : "To Do"}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}