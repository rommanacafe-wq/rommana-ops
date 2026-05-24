"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Announcement = {
  id: string;
  title: string;
  body: string;
  shift_window: string;
  timeframe: string;
  expires_at: string | null;
  is_active: boolean;
  is_pinned: boolean;
  created_at: string;
};

const shiftOptions = [
  { value: "opening", label: "Opening" },
  { value: "closing", label: "Closing" },
  { value: "all_day", label: "All Day" },
];

const timeframeOptions = [
  { value: "one_day", label: "1 Day" },
  { value: "week", label: "This Week" },
  { value: "manual", label: "Manual Off" },
];

export default function AdminAnnouncementsPage() {
  const supabase = createClient();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [shiftWindow, setShiftWindow] = useState("all_day");
  const [timeframe, setTimeframe] = useState("manual");
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
    } else {
      setAnnouncements(data || []);
    }

    setLoading(false);
  }

  function getExpiryDate(selectedTimeframe: string) {
    const now = new Date();

    if (selectedTimeframe === "one_day") {
      now.setDate(now.getDate() + 1);
      return now.toISOString();
    }

    if (selectedTimeframe === "week") {
      now.setDate(now.getDate() + 7);
      return now.toISOString();
    }

    return null;
  }

  async function createAnnouncement() {
    if (!title.trim() || !body.trim()) {
      alert("Title and body are required.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("announcements").insert({
      title: title.trim(),
      body: body.trim(),
      shift_window: shiftWindow,
      timeframe,
      expires_at: getExpiryDate(timeframe),
      is_active: true,
      is_pinned: isPinned,
      created_by: user.id,
    });

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    setTitle("");
    setBody("");
    setShiftWindow("all_day");
    setTimeframe("manual");
    setIsPinned(false);
    setSaving(false);
    await loadAnnouncements();
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase
      .from("announcements")
      .update({
        is_active: !current,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadAnnouncements();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f1e8] p-8 text-[#2a1a1a]">
        Loading announcements...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f1e8] p-8 text-[#2a1a1a]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl bg-[#620b0b] p-8 text-white shadow-sm">
          <p className="mb-2 text-sm uppercase tracking-[0.2em] text-white/80">
            Rommana Ops
          </p>
          <h1 className="text-3xl font-semibold">Announcements</h1>
          <p className="mt-2 text-sm text-white/80">
            Post shift-specific updates for opening, closing, or all-day staff.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <section className="rounded-3xl border border-[#e7ddd1] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">New Announcement</h2>

            <div className="mt-5 space-y-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement title"
                className="w-full rounded-xl border border-[#e7ddd1] bg-[#faf7f2] p-3 outline-none focus:border-[#620b0b]"
              />

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the announcement..."
                className="min-h-32 w-full rounded-xl border border-[#e7ddd1] bg-[#faf7f2] p-3 outline-none focus:border-[#620b0b]"
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-[#6b5a52]">
                  Shift Section
                </label>
                <select
                  value={shiftWindow}
                  onChange={(e) => setShiftWindow(e.target.value)}
                  className="w-full rounded-xl border border-[#e7ddd1] bg-[#faf7f2] p-3 outline-none focus:border-[#620b0b]"
                >
                  {shiftOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#6b5a52]">
                  Timeframe
                </label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full rounded-xl border border-[#e7ddd1] bg-[#faf7f2] p-3 outline-none focus:border-[#620b0b]"
                >
                  {timeframeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-[#6b5a52]">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                />
                Pin to top
              </label>

              <button
                type="button"
                onClick={createAnnouncement}
                disabled={saving}
                className="w-full rounded-2xl bg-[#620b0b] py-4 font-bold text-white disabled:opacity-40"
              >
                {saving ? "Posting..." : "Post Announcement"}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-[#e7ddd1] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Current Announcements</h2>

            <div className="mt-5 space-y-3">
              {announcements.length === 0 ? (
                <p className="text-sm text-[#6b5a52]">
                  No announcements yet.
                </p>
              ) : (
                announcements.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#e7ddd1] bg-[#faf7f2] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{item.title}</p>
                        <p className="mt-1 text-sm text-[#6b5a52]">
                          {item.body}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          item.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.is_active ? "Active" : "Off"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-white px-3 py-1">
                        {item.shift_window}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1">
                        {item.timeframe}
                      </span>
                      {item.is_pinned && (
                        <span className="rounded-full bg-white px-3 py-1">
                          Pinned
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleActive(item.id, item.is_active)}
                      className="mt-4 text-sm font-semibold text-[#620b0b]"
                    >
                      {item.is_active ? "Turn Off" : "Turn On"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}