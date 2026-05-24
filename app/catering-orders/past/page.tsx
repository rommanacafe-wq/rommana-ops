'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Order = {
  id: string
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  event_date: string | null
  fulfillment_type: string | null
  status: string | null
  notes: string | null
}

export default function PastCateringOrdersPage() {
  const supabase = createClient()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  async function load() {
    setLoading(true)
    setPageError('')

    const today = new Date().toISOString()

    const { data, error } = await supabase
      .from('catering_orders')
      .select(`
        id,
        customer_name,
        customer_phone,
        customer_email,
        event_date,
        fulfillment_type,
        status,
        notes
      `)
      .lt('event_date', today)
      .eq('status', 'completed')
      .order('event_date', { ascending: false })

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

  return (
    <main className="min-h-screen bg-[#f7f1e8] p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.2em] text-[#620b0b]">
              Catering
            </p>
            <h1 className="text-3xl font-semibold text-[#2a1a1a]">
              Past Catering Orders
            </h1>
          </div>

          <Link
            href="/catering-orders"
            className="rounded-2xl bg-[#620b0b] px-5 py-3 text-sm text-white"
          >
            Active Orders
          </Link>
        </div>

        {pageError ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-[#e7ddd1] bg-white p-6">
            Loading past orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-[#e7ddd1] bg-white p-6 text-sm text-[#6b5a52]">
            No past completed orders yet.
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/catering-orders/${order.id}`}
                className="block rounded-3xl border border-[#e7ddd1] bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-[#2a1a1a]">
                      {order.customer_name || 'Unnamed Customer'}
                    </div>

                    <div className="mt-1 text-sm text-[#6b5a52]">
                      {order.event_date
                        ? new Date(order.event_date).toLocaleString()
                        : 'No event date'}
                    </div>

                    <div className="mt-2 text-sm text-[#6b5a52]">
                      {order.customer_phone || 'No phone'} •{' '}
                      {order.customer_email || 'No email'}
                    </div>

                    {order.notes ? (
                      <div className="mt-2 text-sm text-[#6b5a52]">
                        {order.notes}
                      </div>
                    ) : null}
                  </div>

                  <div className="text-right">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      {order.status || 'completed'}
                    </span>

                    <div className="mt-2 text-xs uppercase tracking-[0.15em] text-[#6b5a52]">
                      {order.fulfillment_type || 'pickup'}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}