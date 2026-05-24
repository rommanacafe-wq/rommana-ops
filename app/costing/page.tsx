'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Profile = {
  id: string
  role: string | null
}

type InventoryItem = {
  id: string
  name: string
  unit: string
  cost: number | null
  purchase_quantity: number | null
  purchase_unit: string | null
  package_size: number | null
  package_size_unit: string | null
}

type EditableInventoryItem = {
  id: string
  name: string
  unit: string
  cost: string
  purchase_quantity: string
  purchase_unit: string
  package_size: string
  package_size_unit: string
}

const unitOptions = [
  'ml',
  'L',
  'g',
  'kg',
  'lb',
  'oz',
  'piece',
  'bag',
  'box',
  'tray',
  'slice',
  'jar',
  'bottle',
  'pan',
  'batch',
  'serving',
]

export default function CostingPage() {
  const supabase = createClient()

  const [items, setItems] = useState<EditableInventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [pageMessage, setPageMessage] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savingAll, setSavingAll] = useState(false)

  const [authChecked, setAuthChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  async function checkAdmin() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setIsAdmin(false)
      setAuthChecked(true)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      setIsAdmin(false)
      setAuthChecked(true)
      return
    }

    const typedProfile = profile as Profile
    setIsAdmin(typedProfile.role === 'admin')
    setAuthChecked(true)
  }

  async function loadItems() {
    setLoading(true)
    setPageMessage('')

    const { data, error } = await supabase
      .from('inventory_items')
      .select(
        'id, name, unit, cost, purchase_quantity, purchase_unit, package_size, package_size_unit'
      )
      .order('name', { ascending: true })

    if (error) {
      setPageMessage(error.message)
      setLoading(false)
      return
    }

    const mapped: EditableInventoryItem[] = ((data || []) as InventoryItem[]).map(
      (item) => ({
        id: item.id,
        name: item.name,
        unit: item.unit || '',
        cost: item.cost === null ? '' : String(item.cost),
        purchase_quantity:
          item.purchase_quantity === null ? '' : String(item.purchase_quantity),
        purchase_unit: item.purchase_unit || '',
        package_size: item.package_size === null ? '' : String(item.package_size),
        package_size_unit: item.package_size_unit || '',
      })
    )

    setItems(mapped)
    setLoading(false)
  }

  useEffect(() => {
    checkAdmin()
  }, [])

  useEffect(() => {
    if (!authChecked || !isAdmin) return
    loadItems()
  }, [authChecked, isAdmin])

  function updateLocalItem(
    id: string,
    field: keyof EditableInventoryItem,
    value: string
  ) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  function normalizeToBaseUnit(value: number, unit: string | null | undefined) {
    if (!unit) return null
    const u = unit.toLowerCase()

    if (u === 'kg') return value * 1000
    if (u === 'g') return value
    if (u === 'lb') return value * 453.59237
    if (u === 'oz') return value * 28.349523125
    if (u === 'l') return value * 1000
    if (u === 'ml') return value

    return value
  }

  function getUsableStock(item: EditableInventoryItem) {
    const purchaseQty = Number(item.purchase_quantity)
    const packageSize = Number(item.package_size)

    if (
      item.package_size &&
      item.package_size_unit &&
      !Number.isNaN(purchaseQty) &&
      !Number.isNaN(packageSize)
    ) {
      return {
        quantity: purchaseQty * packageSize,
        unit: item.package_size_unit,
      }
    }

    if (
      item.purchase_quantity &&
      item.purchase_unit &&
      !Number.isNaN(purchaseQty)
    ) {
      return {
        quantity: purchaseQty,
        unit: item.purchase_unit,
      }
    }

    return null
  }

  function getCostPerUnit(item: EditableInventoryItem) {
    const cost = Number(item.cost)
    const usable = getUsableStock(item)

    if (!usable || Number.isNaN(cost) || usable.quantity <= 0) return null

    const normalized = normalizeToBaseUnit(usable.quantity, usable.unit)

    if (!normalized || normalized <= 0) return null

    return cost / normalized
  }

  function buildPayload(item: EditableInventoryItem) {
    const payload = {
      cost: item.cost === '' ? null : Number(item.cost),
      purchase_quantity:
        item.purchase_quantity === '' ? null : Number(item.purchase_quantity),
      purchase_unit: item.purchase_unit || null,
      package_size: item.package_size === '' ? null : Number(item.package_size),
      package_size_unit: item.package_size_unit || null,
    }

    if (
      (payload.cost !== null && Number.isNaN(payload.cost)) ||
      (payload.purchase_quantity !== null &&
        Number.isNaN(payload.purchase_quantity)) ||
      (payload.package_size !== null && Number.isNaN(payload.package_size))
    ) {
      return null
    }

    return payload
  }

  async function saveRow(item: EditableInventoryItem) {
    setSavingId(item.id)
    setPageMessage('')

    const payload = buildPayload(item)

    if (!payload) {
      setPageMessage(`Invalid numeric value for ${item.name}.`)
      setSavingId(null)
      return
    }

    const { error } = await supabase
      .from('inventory_items')
      .update(payload)
      .eq('id', item.id)

    if (error) {
      setPageMessage(error.message)
      setSavingId(null)
      return
    }

    setPageMessage(`${item.name} saved.`)
    setSavingId(null)
  }

  async function saveAllRows() {
    setSavingAll(true)
    setPageMessage('')

    for (const item of items) {
      const payload = buildPayload(item)

      if (!payload) {
        setPageMessage(`Invalid numeric value for ${item.name}.`)
        setSavingAll(false)
        return
      }

      const { error } = await supabase
        .from('inventory_items')
        .update(payload)
        .eq('id', item.id)

      if (error) {
        setPageMessage(`Failed saving ${item.name}: ${error.message}`)
        setSavingAll(false)
        return
      }
    }

    setPageMessage('All costing rows saved.')
    setSavingAll(false)
  }

  const rows = useMemo(() => items, [items])

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-[#f7f1e8] p-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-[#e7ddd1] bg-white p-6 text-[#2a1a1a] shadow-sm">
          Checking access...
        </div>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#f7f1e8] p-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-[#2a1a1a]">Access denied</h1>
          <p className="mt-2 text-sm text-[#6b5a52]">
            This page is viewable only to admins.
          </p>
          <div className="mt-4">
            <Link href="/dashboard" className="text-sm text-[#620b0b] underline">
              Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f1e8] p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold text-[#2a1a1a]">
            Ingredient Costing
          </h1>

          <button
            type="button"
            onClick={saveAllRows}
            disabled={loading || savingAll || savingId !== null}
            className="rounded-2xl bg-[#620b0b] px-5 py-3 text-white disabled:opacity-60"
          >
            {savingAll ? 'Saving All...' : 'Save All'}
          </button>
        </div>

        {pageMessage ? (
          <div className="mb-4 rounded-2xl border border-[#e7ddd1] bg-white px-4 py-3 text-sm text-[#2a1a1a]">
            {pageMessage}
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-3xl border border-[#e7ddd1] bg-white shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#faf7f2] text-left text-sm text-[#6b5a52]">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Inventory Unit</th>
                <th className="px-4 py-3">Cost ($)</th>
                <th className="px-4 py-3">Purchase Qty</th>
                <th className="px-4 py-3">Purchase Unit</th>
                <th className="px-4 py-3">Package Size</th>
                <th className="px-4 py-3">Package Unit</th>
                <th className="px-4 py-3">Usable Total</th>
                <th className="px-4 py-3">Cost / Unit</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="p-6 text-center text-sm text-[#6b5a52]"
                  >
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="p-6 text-center text-sm text-[#6b5a52]"
                  >
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                rows.map((item) => {
                  const usable = getUsableStock(item)
                  const costPerUnit = getCostPerUnit(item)

                  return (
                    <tr key={item.id} className="border-t border-[#f0e7dc]">
                      <td className="px-4 py-3 text-[#2a1a1a]">{item.name}</td>

                      <td className="px-4 py-3 text-sm text-[#6b5a52]">
                        {item.unit || '—'}
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={item.cost}
                          onChange={(e) =>
                            updateLocalItem(item.id, 'cost', e.target.value)
                          }
                        className="w-28 rounded-xl border border-[#d9cbbd] px-3 py-2 text-sm outline-none focus:border-[#620b0b]"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={item.purchase_quantity}
                          onChange={(e) =>
                            updateLocalItem(
                              item.id,
                              'purchase_quantity',
                              e.target.value
                            )
                          }
                        className="w-28 rounded-xl border border-[#d9cbbd] px-3 py-2 text-sm outline-none focus:border-[#620b0b]"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <select
                          value={item.purchase_unit}
                          onChange={(e) =>
                            updateLocalItem(
                              item.id,
                              'purchase_unit',
                              e.target.value
                            )
                          }
                        className="w-28 rounded-xl border border-[#d9cbbd] px-3 py-2 text-sm outline-none focus:border-[#620b0b]"
                        >
                          <option value="">—</option>
                          {unitOptions.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={item.package_size}
                          onChange={(e) =>
                            updateLocalItem(
                              item.id,
                              'package_size',
                              e.target.value
                            )
                          }
                        className="w-28 rounded-xl border border-[#d9cbbd] px-3 py-2 text-sm outline-none focus:border-[#620b0b]"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <select
                          value={item.package_size_unit}
                          onChange={(e) =>
                            updateLocalItem(
                              item.id,
                              'package_size_unit',
                              e.target.value
                            )
                          }
                        className="w-28 rounded-xl border border-[#d9cbbd] px-3 py-2 text-sm outline-none focus:border-[#620b0b]"
                        >
                          <option value="">—</option>
                          {unitOptions.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3 text-sm text-[#6b5a52]">
                        {usable ? `${usable.quantity} ${usable.unit}` : '—'}
                      </td>

                      <td className="px-4 py-3 text-sm font-medium text-[#2a1a1a]">
                        {costPerUnit ? `$${costPerUnit.toFixed(4)}` : '—'}
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => saveRow(item)}
                          disabled={savingId === item.id || savingAll}
                          className="rounded-xl bg-[#620b0b] px-3 py-2 text-sm text-white disabled:opacity-60"
                        >
                          {savingId === item.id ? 'Saving...' : 'Save'}
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