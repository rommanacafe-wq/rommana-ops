'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type ProductionLog = {
  id: string
  recipe_id: string | null
  recipe_name: string | null
  production_quantity: number
  produced_by_first_name: string | null
  notes: string | null
  created_at: string
  reversed_at: string | null
  reversed_by_first_name: string | null
  reversal_note: string | null
}

export default function ProductionHistoryPage() {
  const supabase = createClient()

  const [logs, setLogs] = useState<ProductionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [pageMessage, setPageMessage] = useState('')
  const [pageError, setPageError] = useState('')
  const [reversingId, setReversingId] = useState<string | null>(null)

  async function loadLogs() {
    setLoading(true)
    setPageError('')

    const { data, error } = await supabase
      .from('production_logs')
      .select(`
        id,
        recipe_id,
        recipe_name,
        production_quantity,
        produced_by_first_name,
        notes,
        created_at,
        reversed_at,
        reversed_by_first_name,
        reversal_note
      `)
      .order('created_at', { ascending: false })

    if (error) {
      setPageError(error.message)
      setLoading(false)
      return
    }

    setLogs((data as ProductionLog[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadLogs()
  }, [])

  async function reverseBatch(log: ProductionLog) {
    const confirmed = window.confirm(
      `Reverse production batch for ${log.recipe_name || 'this recipe'}? This will add the used ingredients back into inventory.`
    )
console.log(logs)
    if (!confirmed) return

    setReversingId(log.id)
    setPageMessage('')
    setPageError('')

    try {
      const response = await fetch('/api/production-history/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          production_log_id: log.id,
          reversal_note: `Reversed from production history page`,
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setPageError(result.error || 'Failed to reverse batch.')
        setReversingId(null)
        return
      }

      setPageMessage(result.message || 'Batch reversed successfully.')
      await loadLogs()
    } finally {
      setReversingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f1e8] p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="mb-2 text-sm uppercase tracking-[0.2em] text-[#620b0b]">
            Rommana Ops
          </p>
          <h1 className="text-3xl font-semibold text-[#2a1a1a]">
            Production History
          </h1>
          <p className="mt-2 text-sm text-[#6b5a52]">
            Review completed batches and reverse mistakes safely.
          </p>
        </div>

        {pageMessage ? (
          <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {pageMessage}
          </div>
        ) : null}

        {pageError ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-[#e7ddd1] bg-white shadow-sm">
          <div className="border-b border-[#f0e7dc] px-6 py-4">
            <h2 className="text-lg font-semibold text-[#2a1a1a]">
              Recent Production
            </h2>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#faf7f2] text-left text-sm text-[#6b5a52]">
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Recipe</th>
                <th className="px-6 py-4 font-medium">Quantity</th>
                <th className="px-6 py-4 font-medium">Produced By</th>
                <th className="px-6 py-4 font-medium">Notes</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-[#6b5a52]">
                    Loading production history...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-[#6b5a52]">
                    No production history yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isReversed = Boolean(log.reversed_at)

                  return (
                    <tr key={log.id} className="border-t border-[#f0e7dc]">
                      <td className="px-6 py-4 text-sm text-[#6b5a52]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>

                      <td className="px-6 py-4 text-[#2a1a1a]">
                        {log.recipe_name || '—'}
                      </td>

                      <td className="px-6 py-4 text-[#6b5a52]">
                        {log.production_quantity}
                      </td>

                      <td className="px-6 py-4 text-[#6b5a52]">
                        {log.produced_by_first_name || '—'}
                      </td>

                      <td className="px-6 py-4 text-[#6b5a52]">
                        {log.notes || '—'}
                        {log.reversal_note ? (
                          <div className="mt-1 text-xs text-red-700">
                            Reversal note: {log.reversal_note}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            isReversed
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {isReversed ? 'Reversed' : 'Completed'}
                        </span>

                        {isReversed && log.reversed_by_first_name ? (
                          <div className="mt-1 text-xs text-[#6b5a52]">
                            by {log.reversed_by_first_name}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => reverseBatch(log)}
                          disabled={isReversed || reversingId === log.id}
                          className="rounded-xl bg-[#620b0b] px-3 py-2 text-sm text-white disabled:opacity-50"
                        >
                          {reversingId === log.id
                            ? 'Reversing...'
                            : isReversed
                            ? 'Reversed'
                            : 'Reverse'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <Link href="/dashboard" className="text-sm text-[#620b0b] underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}