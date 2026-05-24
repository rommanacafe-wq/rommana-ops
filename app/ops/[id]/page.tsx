"use client";

import { use, useEffect, useState } from "react";
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

type SopTask = {
  id: string;
  task_order: number;
  task_text: string;
  is_required: boolean;
};

type SopLog = {
  id: string;
  completed_at: string;
  completed_by: string;
};

export default function SopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const supabase = createClient();

  const [sop, setSop] = useState<Sop | null>(null);
  const [tasks, setTasks] = useState<SopTask[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [completedToday, setCompletedToday] = useState(false);
  const [completionTime, setCompletionTime] = useState<string | null>(null);

  useEffect(() => {
    async function loadSop() {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: userData } = await supabase.auth.getUser();

      if (userData?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userData.user.id)
          .single();

        if (profile?.role === "admin") {
          setIsAdmin(true);
        }

        const { data: logData } = await supabase
          .from("sop_logs")
          .select("id, completed_at, completed_by")
          .eq("sop_id", id)
          .gte("completed_at", todayStart.toISOString())
          .order("completed_at", { ascending: false })
          .limit(1);

        if (logData && logData.length > 0) {
          setCompletedToday(true);
          setCompletionTime(logData[0].completed_at);
        }
      }

      const { data: sopData } = await supabase
        .from("sops")
        .select(
          "id, title, sop_type, frequency, estimated_time_minutes, requires_photo, notes"
        )
        .eq("id", id)
        .single();

      const { data: taskData } = await supabase
        .from("sop_tasks")
        .select("id, task_order, task_text, is_required")
        .eq("sop_id", id)
        .order("task_order", { ascending: true });

      setSop(sopData);
      setTasks(taskData || []);
      setLoading(false);
    }

    loadSop();
  }, [id, supabase]);

  const requiredTasks = tasks.filter((task) => task.is_required);
  const allRequiredComplete = requiredTasks.every((task) => checked[task.id]);

  async function handleComplete() {
    if (completedToday) {
      alert("This SOP has already been completed today.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in to complete this SOP.");
      setSaving(false);
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: existingLog, error: checkError } = await supabase
      .from("sop_logs")
      .select("id, completed_at")
      .eq("sop_id", id)
      .gte("completed_at", todayStart.toISOString())
      .limit(1);

    if (checkError) {
      alert(checkError.message);
      setSaving(false);
      return;
    }

    if (existingLog && existingLog.length > 0) {
      setCompletedToday(true);
      setCompletionTime(existingLog[0].completed_at);
      alert("This SOP has already been completed today.");
      setSaving(false);
      return;
    }

    const { data: newLog, error } = await supabase
      .from("sop_logs")
      .insert({
        sop_id: id,
        completed_by: user.id,
        notes: notes || null,
      })
      .select("id, completed_at")
      .single();

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    setCompletedToday(true);
    setCompletionTime(newLog?.completed_at || new Date().toISOString());
    setChecked({});
    setNotes("");
    setSaving(false);

    alert("SOP completed successfully.");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f5f0] p-6 text-[#2f241f]">
        Loading SOP...
      </main>
    );
  }

  if (!sop) {
    return (
      <main className="min-h-screen bg-[#f8f5f0] p-6 text-[#2f241f]">
        SOP not found.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f5f0] px-4 py-6 text-[#2f241f]">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/ops" className="text-sm underline">
            ← Back to Ops Hub
          </Link>

          {isAdmin && (
  <Link
    href={`/admin/ops/${sop.id}`}
    className="inline-flex rounded-xl bg-[#620b0b] px-4 py-2 text-sm font-bold text-white"
  >
    Admin Edit
  </Link>
)}
        </div>

        {completedToday && (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800">
            <p className="font-bold">Completed Today</p>
            {completionTime && (
              <p className="mt-1 text-sm">
                This SOP was completed at{" "}
                {new Date(completionTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                .
              </p>
            )}
          </div>
        )}

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-[#8a7a72]">
            {sop.frequency}
          </p>

          <h1 className="mt-2 text-3xl font-bold">{sop.title}</h1>

          {sop.notes && <p className="mt-3 text-[#6f625c]">{sop.notes}</p>}

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
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
        </section>

        <section className="mt-5 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Checklist</h2>

          <div className="mt-5 space-y-3">
            {tasks.map((task) => (
              <label
                key={task.id}
                className={`flex gap-3 rounded-2xl border p-4 ${
                  completedToday
                    ? "border-green-100 bg-green-50/40"
                    : "border-[#eee6df]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={completedToday || !!checked[task.id]}
                  disabled={completedToday}
                  onChange={(e) =>
                    setChecked((prev) => ({
                      ...prev,
                      [task.id]: e.target.checked,
                    }))
                  }
                  className="mt-1 h-5 w-5"
                />

                <div>
                  <p className="font-medium">
                    {task.task_order}. {task.task_text}
                  </p>

                  {task.is_required && (
                    <p className="mt-1 text-xs text-[#8a7a72]">Required</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Completion Notes</h2>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={completedToday}
            placeholder={
              completedToday
                ? "This SOP has already been completed today."
                : "Add any notes for the manager..."
            }
            className="mt-4 min-h-28 w-full rounded-2xl border border-[#eee6df] bg-[#fffdf9] p-4 outline-none disabled:opacity-60"
          />

          <button
            type="button"
            onClick={handleComplete}
            disabled={completedToday || !allRequiredComplete || saving}
            className="mt-4 w-full rounded-2xl bg-[#620b0b] px-5 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving
              ? "Saving..."
              : completedToday
              ? "Completed Today"
              : "Mark SOP Complete"}
          </button>

          {!completedToday && !allRequiredComplete && (
            <p className="mt-3 text-center text-sm text-[#8a7a72]">
              Complete all required tasks before submitting.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}