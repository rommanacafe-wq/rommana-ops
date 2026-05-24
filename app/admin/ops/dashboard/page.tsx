"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Sop = {
  id: string;
  title: string;
  frequency: string;
};

type Log = {
  sop_id: string;
  completed_at: string;
  completed_by: string;
  profiles?: {
    first_name: string;
  }[];
};

export default function OpsDashboard() {
  const supabase = createClient();

  const [sops, setSops] = useState<Sop[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: sopData } = await supabase
        .from("sops")
        .select("id, title, frequency")
        .eq("is_active", true);

      const { data: logData } = await supabase
        .from("sop_logs")
        .select(`
          sop_id,
          completed_at,
          completed_by,
          profiles(first_name)
        `)
        .gte("completed_at", todayStart.toISOString());

      setSops(sopData || []);
      setLogs(logData || []);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  function getLog(sopId: string) {
    return logs.find((log) => log.sop_id === sopId);
  }

  return (
    <main className="min-h-screen bg-[#f8f5f0] p-6 text-[#2f241f]">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-2xl font-bold">
          Today’s Ops Status
        </h1>

        <div className="space-y-4">
          {sops.map((sop) => {
            const log = getLog(sop.id);

            return (
              <div
                key={sop.id}
                className="rounded-2xl bg-white p-4 shadow-sm"
              >
                <h2 className="font-bold">{sop.title}</h2>

                {log ? (
                  <p className="mt-2 text-green-600">
                    ✔ Completed by{" "}
                    {log.profiles?.[0]?.first_name || "Staff"} at{" "}
                    {new Date(log.completed_at).toLocaleTimeString()}
                  </p>
                ) : (
                  <p className="mt-2 text-red-500">
                    ❌ Not completed
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}