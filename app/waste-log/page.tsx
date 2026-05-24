"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Item = {
  id: string;
  name: string;
  unit: string;
};

const wasteReasons = [
  { value: "expired", label: "Expired" },
  { value: "damaged", label: "Dropped / damaged" },
  { value: "made_incorrectly", label: "Made incorrectly" },
  { value: "customer_remake", label: "Customer remake" },
  { value: "over_prepped", label: "Over-prepped" },
  { value: "quality_issue", label: "Quality issue" },
  { value: "end_of_day", label: "End of day waste" },
  { value: "other", label: "Other" },
];

export default function WasteLogPage() {
  const supabase = createClient();

  const [items, setItems] = useState<Item[]>([]);
  const [itemId, setItemId] = useState("");
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);

  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("expired");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadItems() {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, unit")
        .order("name", { ascending: true });

      if (error) {
        alert(error.message);
        return;
      }

      setItems(data || []);
    }

    loadItems();
  }, [supabase]);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedItem = items.find((item) => item.id === itemId);

  async function handleSubmit() {
    if (!itemId) {
      alert("Please select an item.");
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("waste_logs").insert({
      inventory_item_id: itemId,
      quantity: Number(quantity),
      unit: selectedItem?.unit || null,
      reason,
      source_type: "manual",
      reference_id: null,
      notes: notes || null,
      created_by: user.id,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setItemId("");
    setSearch("");
    setQuantity("");
    setReason("expired");
    setNotes("");
    setLoading(false);

    alert("Waste logged successfully.");
  }

  return (
    <main className="min-h-screen bg-[#f8f5f0] p-6 text-[#2f241f]">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Log Waste</h1>

        <p className="mt-2 text-sm text-[#6f625c]">
          Record wasted inventory items so we can track loss, prep issues, and
          recurring problems.
        </p>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <label className="mb-2 block text-sm font-medium">
              Inventory Item
            </label>

            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setItemId("");
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              placeholder="Search item..."
              className="w-full rounded-xl border p-3"
            />

            {showResults && search && (
              <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border bg-white shadow">
                {filteredItems.length === 0 ? (
                  <div className="p-3 text-sm text-[#6f625c]">
                    No items found
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setItemId(item.id);
                        setSearch(item.name);
                        setShowResults(false);
                      }}
                      className="block w-full px-4 py-2 text-left hover:bg-[#f8f5f0]"
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="ml-2 text-xs text-[#8a7a72]">
                        {item.unit}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            {selectedItem && (
              <p className="mt-2 text-xs text-[#6f625c]">
                Selected unit: {selectedItem.unit}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Quantity Wasted
            </label>

            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Quantity wasted"
              className="w-full rounded-xl border p-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Reason
            </label>

            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border p-3"
            >
              {wasteReasons.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              className="min-h-24 w-full rounded-xl border p-3"
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-2xl bg-[#620b0b] py-4 font-bold text-white disabled:opacity-40"
          >
            {loading ? "Saving..." : "Log Waste"}
          </button>
        </div>
      </div>
    </main>
  );
}