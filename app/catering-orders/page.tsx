'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Order = {
  id: string
  square_order_id: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  event_date: string | null
  fulfillment_type: string | null
  status: string | null
  notes: string | null
}

const statusOptions = [
  'inquiry',
  'quoted',
  'confirmed',
  'prep',
  'packed',
  'ready',
  'completed',
  'cancelled',
]

function formatTorontoDate(date: string | null) {
  if (!date) return 'No event date'

  return new Date(date).toLocaleString('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function CateringOrdersPage() {
  const supabase = createClient()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [pageMessage, setPageMessage] = useState('')
  const [pageError, setPageError] = useState('')

  async function load() {
    setLoading(true)
    setPageError('')

    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('catering_orders')
      .select(`
        id,
        square_order_id,
        customer_name,
        customer_phone,
        customer_email,
        event_date,
        fulfillment_type,
        status,
        notes
      `)
      .or(`event_date.gte.${now},status.neq.completed`)
      .order('event_date', { ascending: true })

    if (error) {
      setPageError(error.message)
      setLoading(false)
      return
    }

    setOrders((data as Order[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function importSquareOrders() {
    setImporting(true)
    setPageMessage('')
    setPageError('')

    try {
      const response = await fetch('/api/square/import-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setPageError(result.error || 'Failed to import Square orders.')
        setImporting(false)
        return
      }

      setPageMessage(result.message || 'Square orders imported.')
      await load()
    } finally {
      setImporting(false)
    }
  }

  async function updateOrderStatus(orderId: string, status: string) {
    setPageMessage('')
    setPageError('')

    const { error } = await supabase
      .from('catering_orders')
      .update({ status })
      .eq('id', orderId)

    if (error) {
      setPageError(error.message)
      return
    }

    setPageMessage('Order status updated.')
    await load()
  }

  return (
    <main className="min-h-screen bg-[#f7f1e8] p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.2em] text-[#620b0b]">
              Catering
            </p>

            <h1 className="text-3xl font-semibold text-[#2a1a1a]">
              Catering Orders
            </h1>

            <p className="mt-2 text-sm text-[#6b5a52]">
              Import catering orders from Square and manage production tracking.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/catering-orders/past"
              className="rounded-2xl border border-[#e7ddd1] bg-white px-5 py-3 text-sm text-[#620b0b]"
            >
              Past Orders
            </Link>

            <button
              onClick={importSquareOrders}
              disabled={importing}
              className="rounded-2xl bg-[#620b0b] px-5 py-3 text-sm text-white disabled:opacity-60"
            >
              {importing ? 'Importing...' : 'Import Square Orders'}
            </button>
          </div>
        </div>

        {/* Messages */}
        {pageMessage && (
          <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {pageMessage}
          </div>
        )}

        {pageError && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        {/* Orders */}
        {loading ? (
          <div className="rounded-3xl border border-[#e7ddd1] bg-white p-6 text-sm text-[#6b5a52]">
            Loading...
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/catering-orders/${order.id}`}
                className="block rounded-3xl border border-[#e7ddd1] bg-white p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex justify-between items-start gap-3">

                  {/* Left */}
                  <div>
                    <div className="text-lg font-semibold text-[#2a1a1a]">
                      {order.customer_name || 'Unnamed Customer'}
                    </div>

                    <div className="mt-1 text-sm text-[#6b5a52]">
                      {formatTorontoDate(order.event_date)}
                    </div>

                    <div className="mt-2 text-sm text-[#6b5a52]">
                      {order.customer_phone || 'No phone'} • {order.customer_email || 'No email'}
                    </div>

                    {order.notes && (
                      <div className="mt-2 text-sm text-[#6b5a52]">
                        {order.notes}
                      </div>
                    )}
                  </div>

                  {/* Right */}
                  <div className="text-right">

                    {/* STATUS DROPDOWN */}
                    <div
  onClick={(e) => {
    e.preventDefault()
    e.stopPropagation()
  }}
>
  <select
    value={order.status || 'inquiry'}
    onClick={(e) => {
      e.preventDefault()
      e.stopPropagation()
    }}
    onChange={(e) => {
      e.preventDefault()
      e.stopPropagation()
      updateOrderStatus(order.id, e.target.value)
    }}
    className="rounded-full border border-[#e7ddd1] bg-[#faf7f2] px-3 py-1 text-xs font-medium text-[#620b0b]"
  >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-2 text-xs uppercase text-[#6b5a52]">
                      {order.fulfillment_type || 'pickup'}
                    </div>

                    {order.square_order_id && (
                      <div className="mt-2 text-xs text-[#6b5a52]">
                        Square: {order.square_order_id}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}

            {orders.length === 0 && (
              <div className="rounded-3xl border border-[#e7ddd1] bg-white p-6 text-sm text-[#6b5a52]">
                No active catering orders.
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6">
          <Link href="/dashboard" className="text-sm text-[#620b0b] underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}