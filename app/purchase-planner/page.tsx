'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Supplier = {
  id: string
  name: string
}

type InventoryItem = {
  id: string
  name: string
  category: string
  current_quantity: number
  unit: string
  reorder_level: number
  supplier_id: string | null
  package_size: number | null
  package_size_unit: string | null
  suppliers: Supplier | null
}

type PlannerRow = {
  id: string
  name: string
  supplier: string
  category: string
  current_quantity: number
  reorder_level: number
  shortage: number
  unit: string
  suggested_order_quantity: number
  suggested_order_unit: string
  equivalent_text: string | null
}

export default function PurchasePlannerPage() {
  const supabase = createClient()

  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('all')

  async function loadPage() {
    try {
      setLoading(true)
      setPageError('')

      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          id,
          name,
          category,
          current_quantity,
          unit,
          reorder_level,
          supplier_id,
          package_size,
          package_size_unit,
          suppliers (
            id,
            name
          )
        `)
        .order('name', { ascending: true })

      if (error) throw new Error(error.message)

      const normalized = ((data as any[]) ?? []).map((item) => ({
        ...item,
        suppliers: Array.isArray(item.suppliers) ? item.suppliers[0] ?? null : item.suppliers,
      }))

      setItems(normalized as InventoryItem[])
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to load purchase planner.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPage()
  }, [])

  const suppliers = useMemo(() => {
    const map = new Map<string, string>()
    items.forEach((item) => {
      if (item.supplier_id && item.suppliers?.name) {
        map.set(item.supplier_id, item.suppliers.name)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [items])

  const plannerRows: PlannerRow[] = useMemo(() => {
    return items
      .filter((item) => Number(item.current_quantity) <= Number(item.reorder_level))
      .map((item) => {
        const current = Number(item.current_quantity ?? 0)
        const reorder = Number(item.reorder_level ?? 0)
        const shortage = Math.max(0, reorder - current)

        let suggestedOrderQuantity = shortage
        let suggestedOrderUnit = item.unit
        let equivalentText: string | null = null

        if (item.package_size && item.package_size_unit) {
          const packageSize = Number(item.package_size)
          if (!Number.isNaN(packageSize) && packageSize > 0) {
            suggestedOrderQuantity = Math.ceil(shortage / packageSize)
            suggestedOrderUnit = item.unit
            equivalentText = `${suggestedOrderQuantity * packageSize} ${item.package_size_unit}`
          }
        }

        return {
          id: item.id,
          name: item.name,
          supplier: item.suppliers?.name || '—',
          category: item.category,
          current_quantity: current,
          reorder_level: reorder,
          shortage,
          unit: item.unit,
          suggested_order_quantity: suggestedOrderQuantity,
          suggested_order_unit: suggestedOrderUnit,
          equivalent_text: equivalentText,
        }
      })
      .filter((row) =>
        supplierFilter === 'all' ? true : row.supplier === suppliers.find((s) => s.id === supplierFilter)?.name
      )
      .sort((a, b) => a.supplier.localeCompare(b.supplier) || a.name.localeCompare(b.name))
  }, [items, supplierFilter, suppliers])

  const grouped = useMemo(() => {
    const groups: Record<string, PlannerRow[]> = {}
    plannerRows.forEach((row) => {
      const key = row.supplier || '—'
      if (!groups[key]) groups[key] = []
      groups[key].push(row)
    })
    return groups
  }, [plannerRows])

  return (
    <main className="min-h-screen bg-[#f7f1e8] p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="mb-2 text-sm uppercase tracking-[0.2em] text-[#620b0b]">Rommana Ops</p>
          <h1 className="text-3xl font-semibold text-[#2a1a1a]">Purchase Planner</h1>
          <p className="mt-2 text-sm text-[#6b5a52]">
            Items at or below reorder level, with suggested order quantities.
          </p>
        </div>

        <div className="mb-4">
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="rounded-2xl border border-[#d9cbbd] bg-white px-4 py-2"
          >
            <option value="all">All suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        {pageError ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-[#e7ddd1] bg-white p-6">Loading...</div>
        ) : plannerRows.length === 0 ? (
          <div className="rounded-3xl border border-[#e7ddd1] bg-white p-6 text-[#6b5a52]">
            Nothing needs reordering right now.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([supplier, rows]) => (
              <div key={supplier} className="overflow-hidden rounded-3xl border border-[#e7ddd1] bg-white shadow-sm">
                <div className="border-b border-[#f0e7dc] px-6 py-4">
                  <h2 className="text-lg font-semibold text-[#2a1a1a]">{supplier}</h2>
                </div>

                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#faf7f2] text-left text-sm text-[#6b5a52]">
                      <th className="px-6 py-4 font-medium">Item</th>
                      <th className="px-6 py-4 font-medium">Category</th>
                      <th className="px-6 py-4 font-medium">Current</th>
                      <th className="px-6 py-4 font-medium">Reorder At</th>
                      <th className="px-6 py-4 font-medium">Shortage</th>
                      <th className="px-6 py-4 font-medium">Suggested Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-t border-[#f0e7dc]">
                        <td className="px-6 py-4 text-[#2a1a1a]">{row.name}</td>
                        <td className="px-6 py-4 text-[#6b5a52]">{row.category}</td>
                        <td className="px-6 py-4 text-[#6b5a52]">
                          {row.current_quantity} {row.unit}
                        </td>
                        <td className="px-6 py-4 text-[#6b5a52]">
                          {row.reorder_level} {row.unit}
                        </td>
                        <td className="px-6 py-4 text-[#6b5a52]">
                          {row.shortage} {row.unit}
                        </td>
                        <td className="px-6 py-4 text-[#2a1a1a]">
                          <div>
                            {row.suggested_order_quantity} {row.suggested_order_unit}
                          </div>
                          {row.equivalent_text ? (
                            <div className="text-xs text-[#6b5a52]">{row.equivalent_text}</div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Link href="/dashboard" className="text-sm text-[#620b0b] underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}