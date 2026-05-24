"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type ShiftNote = {
  id: string;
  note: string;
  shift_window: string | null;
  created_at: string;
  is_resolved: boolean;
  profiles:
    | {
        first_name: string | null;
        last_name: string | null;
      }
    | {
        first_name: string | null;
        last_name: string | null;
      }[]
    | null;
};

function getProfile(note: ShiftNote) {
  if (Array.isArray(note.profiles)) {
    return note.profiles[0] || null;
  }

  return note.profiles || null;
}

export default function AdminShiftNotesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [notes, setNotes] = useState<ShiftNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    const { data, error } = await supabase
      .from("shift_notes")
      .select(`
        id,
        note,
        shift_window,
        created_at,
        is_resolved,
        profiles (
          first_name,
          last_name
        )
      `)
      .order("is_resolved", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setNotes((data as unknown as ShiftNote[]) || []);
    setLoading(false);
  }

  async function toggleResolved(id: string, current: boolean) {
    const { error } = await supabase
      .from("shift_notes")
      .update({ is_resolved: !current })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadNotes();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f1e8] p-8 text-[#2a1a1a]">
        Loading shift notes...
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
              <h1 className="text-3xl font-semibold">Shift Notes</h1>
              <p className="mt-2 text-sm text-white/80">
                Staff notes from shifts, issues, reminders, and updates for admin.
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

        <section className="rounded-3xl border border-[#e7ddd1] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Staff Notes</h2>
              <p className="mt-1 text-sm text-[#6b5a52]">
                {notes.filter((note) => !note.is_resolved).length} unresolved
              </p>
            </div>
          </div>

          {notes.length === 0 ? (
            <div className="rounded-2xl bg-[#faf7f2] p-5 text-sm text-[#6b5a52]">
              No shift notes yet.
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((item) => {
                const profile = getProfile(item);
                const staffName =
                  `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
                  "Staff";

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 ${
                      item.is_resolved
                        ? "border-green-100 bg-green-50/50"
                        : "border-[#e7ddd1] bg-[#faf7f2]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[#2a1a1a]">
                          {staffName}
                        </p>
                        <p className="mt-1 text-sm text-[#6b5a52]">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          item.is_resolved
                            ? "bg-green-100 text-green-700"
                            : "bg-white text-[#620b0b]"
                        }`}
                      >
                        {item.is_resolved ? "Resolved" : "Open"}
                      </span>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#2a1a1a]">
                      {item.note}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-white px-3 py-1 text-xs text-[#6b5a52]">
                        {item.shift_window === "opening"
                          ? "Opening"
                          : item.shift_window === "closing"
                          ? "Closing"
                          : "All Day"}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          toggleResolved(item.id, item.is_resolved)
                        }
                        className="rounded-xl bg-[#620b0b] px-4 py-2 text-sm font-bold text-white"
                      >
                        {item.is_resolved
                          ? "Mark Open"
                          : "Mark Resolved"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}