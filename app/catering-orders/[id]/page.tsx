'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Item = {
  id: string
  item_name: string
  quantity: number
}

export default function OrderDetailsPage() {
  const supabase = createClient()
  const params = useParams()

  const [items, setItems] = useState<Item[]>([])
  const [order, setOrder] = useState<any>(null)

  const [name, setName] = useState('')
  const [qty, setQty] = useState('')

  async function load() {
    const { data: orderData } = await supabase
      .from('catering_orders')
      .select('*')
      .eq('id', params.id)
      .single()

    const { data: itemsData } = await supabase
      .from('catering_order_items')
      .select('*')
      .eq('catering_order_id', params.id)

    setOrder(orderData)
    setItems(itemsData || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function addItem(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()

  if (!name.trim() || !qty || Number(qty) <= 0) {
    alert('Item name and valid quantity are required.')
    return
  }

  const payload = {
    catering_order_id: String(params.id),
    item_name: name.trim(),
    quantity: Number(qty),
    production_status: 'not_started',
    produced_quantity: 0,
  }

  const { data, error } = await supabase
    .from('catering_order_items')
    .insert([payload])
    .select()

  if (error) {
    const errorMessage =
      error.message ||
      error.details ||
      error.hint ||
      JSON.stringify(error)

    alert(errorMessage)
    return
  }

  setName('')
  setQty('')
  await load()
}

  return (
    <main className="min-h-screen bg-[#f7f1e8] p-8">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-[#620b0b] mb-2">
            Catering Order
          </p>

          <h1 className="text-3xl font-semibold text-[#2a1a1a]">
            {order?.customer_name || 'Unnamed Order'}
          </h1>

          <p className="mt-2 text-sm text-[#6b5a52]">
            {order?.event_date
              ? new Date(order.event_date).toLocaleString()
              : 'No event date'}
          </p>
        </div>

        {/* Add Item Card */}
        <div className="mb-6 rounded-3xl border border-[#e7ddd1] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#2a1a1a] mb-4">
            Add Item
          </h2>

          <form onSubmit={addItem} className="flex flex-wrap gap-3">
            <input
              placeholder="Item name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 min-w-[200px] rounded-2xl border border-[#d9cbbd] px-4 py-3"
            />

            <input
              placeholder="Qty"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-24 rounded-2xl border border-[#d9cbbd] px-4 py-3"
            />

            <button className="rounded-2xl bg-[#620b0b] px-5 py-3 text-white">
              Add
            </button>
          </form>
        </div>

        {/* Items List */}
        <div className="rounded-3xl border border-[#e7ddd1] bg-white shadow-sm">
          <div className="border-b border-[#f0e7dc] px-6 py-4">
            <h2 className="text-lg font-semibold text-[#2a1a1a]">
              Order Items
            </h2>
          </div>

          {items.length === 0 ? (
            <div className="p-6 text-sm text-[#6b5a52]">
              No items added yet.
            </div>
          ) : (
            <div className="divide-y divide-[#f0e7dc]">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div className="text-[#2a1a1a]">
                    {item.item_name}
                  </div>

                  <div className="text-[#6b5a52] font-medium">
                    {item.quantity}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back */}
        <div className="mt-6">
          <Link
            href="/catering-orders"
            className="text-sm text-[#620b0b] underline"
          >
            Back to catering orders
          </Link>
        </div>
      </div>
    </main>
  )
}