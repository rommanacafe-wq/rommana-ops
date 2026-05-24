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

type Announcement = {
  id: string;
  title: string;
  body: string;
  shift_window: string;
  is_pinned: boolean;
};

export default function DashboardOpsPanel() {
  const supabase = createClient();

  const [sops, setSops] = useState<Sop[]>([]);
  const [logs, setLogs] = useState<SopLog[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
  async function loadDashboardOps() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "admin") {
        setIsAdmin(true);
      }
    }

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

    const { data: announcementData } = await supabase
      .from("announcements")
      .select("id, title, body, shift_window, is_pinned")
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt."${new Date().toISOString()}"`)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(6);

    setSops(sopData || []);
    setLogs(logData || []);
    setAnnouncements(announcementData || []);
    setLoading(false);
  }

  loadDashboardOps();
}, [supabase]);

  function isCompleted(sopId: string) {
    return logs.some((log) => log.sop_id === sopId);
  }

  async function submitNote() {
    if (!note.trim()) return;

    setSavingNote(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in.");
      setSavingNote(false);
      return;
    }

    const { error } = await supabase.from("shift_notes").insert({
      note: note.trim(),
      shift_window: "all_day",
      created_by: user.id,
    });

    if (error) {
      alert(error.message);
      setSavingNote(false);
      return;
    }

    setNote("");
    setSavingNote(false);
    alert("Note sent to admin.");
  }

  const completedCount = sops.filter((sop) => isCompleted(sop.id)).length;

  return (
    <section className="mb-6 grid gap-6 lg:grid-cols-2">
      {/* Announcements */}
      <div className="rounded-3xl border border-[#e7ddd1] bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#620b0b]">
              Staff Updates
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[#2a1a1a]">
              Announcements
            </h2>
          </div>

          {isAdmin && (
  <Link
    href="/admin/announcements"
    className="rounded-xl bg-[#620b0b] px-4 py-2 text-sm font-bold text-white"
  >
    Manage
  </Link>
)}
        </div>

        {loading ? (
          <p className="text-sm text-[#6b5a52]">Loading announcements...</p>
        ) : announcements.length === 0 ? (
          <p className="rounded-2xl bg-[#faf7f2] p-4 text-sm text-[#6b5a52]">
            No active announcements right now.
          </p>
        ) : (
          <div className="space-y-3">
            {announcements.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[#e7ddd1] bg-[#faf7f2] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#2a1a1a]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm text-[#6b5a52]">
                      {item.body}
                    </p>
                  </div>

                  {item.is_pinned && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#620b0b]">
                      Pinned
                    </span>
                  )}
                </div>

                <span className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-xs text-[#6b5a52]">
                  {item.shift_window === "opening"
                    ? "Opening"
                    : item.shift_window === "closing"
                    ? "Closing"
                    : "All Day"}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-[#e7ddd1] pt-4">
          <p className="mb-2 text-sm font-medium text-[#2a1a1a]">
            Leave a note for admin
          </p>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything the admin should know from your shift..."
            className="min-h-24 w-full rounded-xl border border-[#e7ddd1] bg-[#faf7f2] p-3 text-sm outline-none focus:border-[#620b0b]"
          />

          <button
            type="button"
            onClick={submitNote}
            disabled={savingNote || !note.trim()}
            className="mt-3 w-full rounded-xl bg-[#620b0b] py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {savingNote ? "Sending..." : "Send Note"}
          </button>
        </div>
      </div>

      {/* SOP Checklist */}
      <div className="rounded-3xl border border-[#e7ddd1] bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#620b0b]">
              Today
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[#2a1a1a]">
              SOP Checklist
            </h2>
            <p className="mt-1 text-sm text-[#6b5a52]">
              {loading
                ? "Loading tasks..."
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
          <p className="text-sm text-[#6b5a52]">Loading SOPs...</p>
        ) : sops.length === 0 ? (
          <p className="rounded-2xl bg-[#faf7f2] p-4 text-sm text-[#6b5a52]">
            No SOPs scheduled today.
          </p>
        ) : (
          <div className="space-y-3">
            {sops.slice(0, 5).map((sop) => {
              const done = isCompleted(sop.id);

              return (
                <Link
                  key={sop.id}
                  href={`/ops/${sop.id}`}
                  className="flex items-center justify-between rounded-2xl border border-[#e7ddd1] bg-[#faf7f2] p-4 transition hover:bg-white"
                >
                  <div>
                    <p className="font-semibold text-[#2a1a1a]">
                      {sop.title}
                    </p>
                    <p className="mt-1 text-xs text-[#6b5a52]">
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
                        : "bg-white text-[#620b0b]"
                    }`}
                  >
                    {done ? "Done" : "To Do"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}