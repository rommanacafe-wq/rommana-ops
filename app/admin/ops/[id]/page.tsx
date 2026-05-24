"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

type SopTask = {
  id: string | null;
  task_text: string;
  task_order: number;
  is_required: boolean;
};

export default function EditSopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [sopType, setSopType] = useState("opening");
  const [frequency, setFrequency] = useState("daily");
  const [estimatedTime, setEstimatedTime] = useState<number | "">("");
  const [tasks, setTasks] = useState<SopTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: sop, error: sopError } = await supabase
        .from("sops")
        .select("*")
        .eq("id", id)
        .single();

      if (sopError) {
        alert(sopError.message);
        setLoading(false);
        return;
      }

      const { data: taskData, error: taskError } = await supabase
        .from("sop_tasks")
        .select("*")
        .eq("sop_id", id)
        .order("task_order", { ascending: true });

      if (taskError) {
        alert(taskError.message);
        setLoading(false);
        return;
      }

      setTitle(sop.title || "");
      setNotes(sop.notes || "");
      setSopType(sop.sop_type || "opening");
      setFrequency(sop.frequency || "daily");
      setEstimatedTime(sop.estimated_time_minutes || "");
      setTasks(taskData || []);
      setLoading(false);
    }

    load();
  }, [id, supabase]);

  function updateTask(index: number, value: string) {
    setTasks((prev) =>
      prev.map((task, i) =>
        i === index ? { ...task, task_text: value } : task
      )
    );
  }

  function toggleRequired(index: number) {
    setTasks((prev) =>
      prev.map((task, i) =>
        i === index ? { ...task, is_required: !task.is_required } : task
      )
    );
  }

  function addTask() {
    setTasks((prev) => [
      ...prev,
      {
        id: null,
        task_text: "",
        task_order: prev.length + 1,
        is_required: true,
      },
    ]);
  }

  function removeTask(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!title.trim()) {
      alert("Title is required.");
      return;
    }

    setSaving(true);

    const { error: sopError } = await supabase
      .from("sops")
      .update({
        title: title.trim(),
        notes: notes.trim() || null,
        sop_type: sopType,
        frequency,
        estimated_time_minutes:
          estimatedTime === "" ? null : Number(estimatedTime),
        requires_photo: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (sopError) {
      alert(sopError.message);
      setSaving(false);
      return;
    }

    const { error: deleteError } = await supabase
      .from("sop_tasks")
      .delete()
      .eq("sop_id", id);

    if (deleteError) {
      alert(deleteError.message);
      setSaving(false);
      return;
    }

    const cleanTasks = tasks
      .map((task, index) => ({
        sop_id: id,
        task_order: index + 1,
        task_text: task.task_text.trim(),
        is_required: task.is_required,
      }))
      .filter((task) => task.task_text.length > 0);

    if (cleanTasks.length > 0) {
      const { error: taskError } = await supabase
        .from("sop_tasks")
        .insert(cleanTasks);

      if (taskError) {
        alert(taskError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    alert("SOP updated.");
    router.push("/admin/ops");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f1e8] p-8 text-[#2a1a1a]">
        Loading SOP editor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f1e8] p-8 text-[#2a1a1a]">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-3xl bg-[#620b0b] p-8 text-white shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm uppercase tracking-[0.2em] text-white/80">
                Rommana Ops
              </p>
              <h1 className="text-3xl font-semibold">Edit SOP</h1>
              <p className="mt-2 text-sm text-white/80">
                Update checklist details, timing, and staff instructions.
              </p>
            </div>

            <Link
              href="/admin/ops"
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#620b0b]"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <section className="rounded-3xl border border-[#e7ddd1] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#2a1a1a]">
              SOP Details
            </h2>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#6b5a52]">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="SOP title"
                  className="w-full rounded-xl border border-[#e7ddd1] bg-[#faf7f2] p-3 outline-none focus:border-[#620b0b]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#6b5a52]">
                  Description / Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Short description / notes"
                  className="min-h-28 w-full rounded-xl border border-[#e7ddd1] bg-[#faf7f2] p-3 outline-none focus:border-[#620b0b]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#6b5a52]">
                  SOP Type
                </label>
                <select
                  value={sopType}
                  onChange={(e) => setSopType(e.target.value)}
                  className="w-full rounded-xl border border-[#e7ddd1] bg-[#faf7f2] p-3 outline-none focus:border-[#620b0b]"
                >
                  <option value="opening">Opening</option>
                  <option value="closing">Closing</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="bathroom_cleaning">Bathroom Cleaning</option>
                  <option value="bar_reset">Bar Reset</option>
                  <option value="kitchen_prep">Kitchen Prep</option>
                  <option value="event_setup">Event Setup</option>
                  <option value="event_teardown">Event Teardown</option>
                  <option value="catering_packing">Catering Packing</option>
                  <option value="deep_cleaning">Deep Cleaning</option>
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#6b5a52]">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full rounded-xl border border-[#e7ddd1] bg-[#faf7f2] p-3 outline-none focus:border-[#620b0b]"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="event_based">Event Based</option>
                    <option value="as_needed">As Needed</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#6b5a52]">
                    Estimated Minutes
                  </label>
                  <input
                    type="number"
                    value={estimatedTime}
                    onChange={(e) =>
                      setEstimatedTime(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    placeholder="Estimated minutes"
                    className="w-full rounded-xl border border-[#e7ddd1] bg-[#faf7f2] p-3 outline-none focus:border-[#620b0b]"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#e7ddd1] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#2a1a1a]">
                  Checklist Tasks
                </h2>
                <p className="mt-1 text-sm text-[#6b5a52]">
                  Add the exact steps staff should follow.
                </p>
              </div>

              <button
                type="button"
                onClick={addTask}
                className="rounded-xl border border-[#e7ddd1] bg-[#faf7f2] px-4 py-2 text-sm font-semibold text-[#620b0b]"
              >
                + Add
              </button>
            </div>

            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="rounded-2xl bg-[#faf7f2] p-5 text-sm text-[#6b5a52]">
                  No tasks yet. Add the first checklist step.
                </div>
              ) : (
                tasks.map((task, index) => (
                  <div
                    key={`${task.id || "new"}-${index}`}
                    className="rounded-2xl border border-[#e7ddd1] bg-[#faf7f2] p-4"
                  >
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#620b0b]">
                        {index + 1}
                      </div>

                      <div className="flex-1">
                        <input
                          value={task.task_text}
                          onChange={(e) => updateTask(index, e.target.value)}
                          placeholder={`Task ${index + 1}`}
                          className="w-full rounded-xl border border-[#e7ddd1] bg-white p-3 outline-none focus:border-[#620b0b]"
                        />

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <label className="flex items-center gap-2 text-sm text-[#6b5a52]">
                            <input
                              type="checkbox"
                              checked={task.is_required}
                              onChange={() => toggleRequired(index)}
                            />
                            Required
                          </label>

                          <button
                            type="button"
                            onClick={() => removeTask(index)}
                            className="text-sm font-semibold text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="sticky bottom-4 mt-6 rounded-3xl border border-[#e7ddd1] bg-white/95 p-4 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="w-full rounded-2xl bg-[#620b0b] py-4 font-bold text-white disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </main>
  );
}