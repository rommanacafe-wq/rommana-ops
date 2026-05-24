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

type InventoryLog = {
  id: string
  action: 'create' | 'set' | 'adjust'
  previous_quantity: number
  change_amount: number
  resulting_quantity: number
  unit: string | null
  note: string | null
  created_at: string
}

type SortKey =
  | 'name'
  | 'category'
  | 'current_quantity'
  | 'unit'
  | 'reorder_level'
  | 'supplier'

const categories = [
  'raw ingredient',
  'syrups',
  'packaging supply',
  'retail service item',
  'cleaning supply',
]

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

export default function InventoryPage() {
  const supabase = createClient()

  const [items, setItems] = useState<InventoryItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [pageError, setPageError] = useState('')
  const [formMessage, setFormMessage] = useState('')

  const [name, setName] = useState('')
  const [category, setCategory] = useState(categories[0])
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [reorderLevel, setReorderLevel] = useState('')
  const [packageSize, setPackageSize] = useState('')
  const [packageSizeUnit, setPackageSizeUnit] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState(categories[0])
  const [editUnit, setEditUnit] = useState('')
  const [editSupplierId, setEditSupplierId] = useState('')
  const [editReorderLevel, setEditReorderLevel] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editPackageSize, setEditPackageSize] = useState('')
  const [editPackageSizeUnit, setEditPackageSizeUnit] = useState('')
  const [editMode, setEditMode] = useState<'set' | 'adjust'>('set')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editMessage, setEditMessage] = useState('')

  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [lowStockOnly, setLowStockOnly] = useState(false)

  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  async function loadSuppliers() {
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name')
      .order('name', { ascending: true })

    if (!error) {
      const supplierData = (data as Supplier[]) ?? []
      setSuppliers(supplierData)

      if (supplierData.length > 0 && !supplierId) {
        setSupplierId(supplierData[0].id)
      }
    }
  }

  async function loadItems() {
    try {
      setLoadingItems(true)
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

      if (error) {
        throw new Error(error.message)
      }

      const normalized = ((data as any[]) ?? []).map((item) => ({
        ...item,
        suppliers: Array.isArray(item.suppliers) ? item.suppliers[0] ?? null : item.suppliers,
      }))

      setItems(normalized as InventoryItem[])
    } catch (error) {
      console.error('loadItems failed:', error)
      setPageError(
        error instanceof Error ? error.message : 'Failed to load inventory.'
      )
      setItems([])
    } finally {
      setLoadingItems(false)
    }
  }

  async function loadLogs(itemId: string) {
    try {
      setLoadingLogs(true)

      const { data, error } = await supabase
        .from('inventory_logs')
        .select(
          'id, action, previous_quantity, change_amount, resulting_quantity, unit, note, created_at'
        )
        .eq('inventory_item_id', itemId)
        .order('created_at', { ascending: false })
        .limit(3)

      if (error) {
        throw new Error(error.message)
      }

      setLogs((data as InventoryLog[]) ?? [])
    } catch (error) {
      console.error('loadLogs failed:', error)
      setLogs([])
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    loadSuppliers()
    loadItems()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, supplierFilter, categoryFilter, lowStockOnly, sortKey, sortDirection, pageSize])

  async function handleAddItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setFormMessage('')

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          quantity: Number(quantity),
          unit,
          supplier_id: supplierId || null,
          reorder_level: Number(reorderLevel),
          package_size: packageSize === '' ? null : Number(packageSize),
          package_size_unit: packageSizeUnit || null,
        }),
      })

      let result: any = {}
      try {
        result = await response.json()
      } catch {}

      if (!response.ok) {
        setFormMessage(result.error || 'Failed to add item.')
        return
      }

      setFormMessage(result.message || 'Item added successfully.')
      setName('')
      setCategory(categories[0])
      setQuantity('')
      setUnit('')
      setReorderLevel('')
      setPackageSize('')
      setPackageSizeUnit('')
      await loadItems()
    } finally {
      setSubmitting(false)
    }
  }

  async function openItemModal(item: InventoryItem) {
    setSelectedItem(item)
    setEditName(item.name)
    setEditCategory(item.category)
    setEditUnit(item.unit)
    setEditSupplierId(item.supplier_id || '')
    setEditReorderLevel(String(item.reorder_level ?? 0))
    setEditQuantity(String(item.current_quantity ?? 0))
    setEditPackageSize(item.package_size === null ? '' : String(item.package_size))
    setEditPackageSizeUnit(item.package_size_unit || '')
    setEditMode('set')
    setEditMessage('')
    await loadLogs(item.id)
  }

  function closeItemModal() {
    setSelectedItem(null)
    setEditMessage('')
    setLogs([])
  }

  async function handleSaveItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedItem) return

    setSavingEdit(true)
    setEditMessage('')

    try {
      const response = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedItem.id,
          name: editName,
          category: editCategory,
          unit: editUnit,
          supplier_id: editSupplierId || null,
          reorder_level: Number(editReorderLevel),
          quantity: Number(editQuantity),
          mode: editMode,
          package_size: editPackageSize === '' ? null : Number(editPackageSize),
          package_size_unit: editPackageSizeUnit || null,
        }),
      })

      let result: any = {}
      try {
        result = await response.json()
      } catch {
        setEditMessage('Server returned an invalid response.')
        return
      }

      if (!response.ok) {
        setEditMessage(result.error || 'Failed to update item.')
        return
      }

      setEditMessage(result.message || 'Item updated successfully.')
      await loadItems()

      const { data } = await supabase
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
        .eq('id', selectedItem.id)
        .single()

      if (data) {
        const normalized = {
          ...(data as any),
          suppliers: Array.isArray((data as any).suppliers)
            ? (data as any).suppliers[0] ?? null
            : (data as any).suppliers,
        } as InventoryItem

        setSelectedItem(normalized)
        setEditName(normalized.name)
        setEditCategory(normalized.category)
        setEditUnit(normalized.unit)
        setEditSupplierId(normalized.supplier_id || '')
        setEditReorderLevel(String(normalized.reorder_level ?? 0))
        setEditPackageSize(
          normalized.package_size === null ? '' : String(normalized.package_size)
        )
        setEditPackageSizeUnit(normalized.package_size_unit || '')
        setEditQuantity(
          editMode === 'set' ? String(normalized.current_quantity ?? 0) : ''
        )
        await loadLogs(normalized.id)
      }
    } finally {
      setSavingEdit(false)
    }
  }

  function handleSort(column: SortKey) {
    if (sortKey === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(column)
      setSortDirection('asc')
    }
  }

  function clearFilters() {
    setSearchTerm('')
    setSupplierFilter('all')
    setCategoryFilter('all')
    setLowStockOnly(false)
    setCurrentPage(1)
  }

  const filteredAndSortedItems = useMemo(() => {
    let filtered = [...items]

    if (searchTerm.trim()) {
      const search = searchTerm.trim().toLowerCase()
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(search)
      )
    }

    if (supplierFilter !== 'all') {
      filtered = filtered.filter((item) => item.supplier_id === supplierFilter)
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((item) => item.category === categoryFilter)
    }

    if (lowStockOnly) {
      filtered = filtered.filter(
        (item) => Number(item.current_quantity) <= Number(item.reorder_level)
      )
    }

    filtered.sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1

      if (sortKey === 'supplier') {
        const aSupplier = a.suppliers?.name ?? ''
        const bSupplier = b.suppliers?.name ?? ''
        return aSupplier.localeCompare(bSupplier) * direction
      }

      const aValue = a[sortKey as keyof InventoryItem]
      const bValue = b[sortKey as keyof InventoryItem]

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction
      }

      return String(aValue ?? '').localeCompare(String(bValue ?? '')) * direction
    })

    return filtered
  }, [items, searchTerm, supplierFilter, categoryFilter, lowStockOnly, sortKey, sortDirection])

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedItems.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const visibleItems = filteredAndSortedItems.slice(startIndex, endIndex)

  function sortLabel(label: string, column: SortKey) {
    if (sortKey !== column) return label
    return `${label} ${sortDirection === 'asc' ? '↑' : '↓'}`
  }

  function getEquivalentText(item: InventoryItem) {
    if (!item.package_size || !item.package_size_unit) return null
    const total = Number(item.current_quantity) * Number(item.package_size)
    return `${total} ${item.package_size_unit}`
  }

  return (
    <main className="min-h-screen bg-[#f7f1e8] p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="mb-2 text-sm uppercase tracking-[0.2em] text-[#620b0b]">
            Rommana Ops
          </p>
          <h1 className="text-3xl font-semibold text-[#2a1a1a]">Inventory</h1>
        </div>

        <div className="mb-6 rounded-3xl border border-[#e7ddd1] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#2a1a1a]">
            Add Inventory Item
          </h2>

          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-6">
              <input
                placeholder="Item name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                required
              />

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <input
                placeholder="Current quantity"
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                required
              />

              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                required
              >
                <option value="">Select Unit</option>
                {unitOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
              >
                <option value="">No supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>

              <input
                placeholder="Reorder level"
                type="number"
                step="0.01"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                required
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                placeholder="Package size (optional)"
                type="number"
                step="0.01"
                value={packageSize}
                onChange={(e) => setPackageSize(e.target.value)}
                className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
              />

              <select
                value={packageSizeUnit}
                onChange={(e) => setPackageSizeUnit(e.target.value)}
                className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
              >
                <option value="">Select package size unit</option>
                {unitOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-[#6b5a52]">
              Example: 5 bags of 5 kg coffee beans = current quantity 5, unit bag, package size 5, package size unit kg.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-[#620b0b] px-5 py-3 text-white disabled:opacity-60"
            >
              {submitting ? 'Adding...' : 'Add Item'}
            </button>
          </form>

          {formMessage ? (
            <div className="mt-4 rounded-2xl border border-[#e7ddd1] bg-[#faf7f2] px-4 py-3 text-sm text-[#2a1a1a]">
              {formMessage}
            </div>
          ) : null}
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search item name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="min-w-[240px] rounded-2xl border border-[#d9cbbd] bg-white px-4 py-2"
          />

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="rounded-2xl border border-[#d9cbbd] bg-white px-4 py-2"
          >
            <option value="all">Supplier: all</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                Supplier: {supplier.name}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-2xl border border-[#d9cbbd] bg-white px-4 py-2"
          >
            <option value="all">Category: all</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                Category: {cat}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setLowStockOnly((prev) => !prev)}
            className={`rounded-2xl px-4 py-2 ${
              lowStockOnly
                ? 'bg-[#620b0b] text-white'
                : 'border border-[#d9cbbd] bg-white text-[#2a1a1a]'
            }`}
          >
            Low Stock
          </button>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-2xl border border-[#d9cbbd] bg-white px-4 py-2 text-[#2a1a1a]"
          >
            Clear Filters
          </button>
        </div>

        {pageError ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Error loading inventory: {pageError}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-[#e7ddd1] bg-white shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#faf7f2] text-left text-sm text-[#6b5a52]">
                <th className="px-6 py-4 font-medium">
                  <button type="button" onClick={() => handleSort('name')}>
                    {sortLabel('Item', 'name')}
                  </button>
                </th>
                <th className="px-6 py-4 font-medium">
                  <button type="button" onClick={() => handleSort('category')}>
                    {sortLabel('Category', 'category')}
                  </button>
                </th>
                <th className="px-6 py-4 font-medium">
                  <button type="button" onClick={() => handleSort('current_quantity')}>
                    {sortLabel('Quantity', 'current_quantity')}
                  </button>
                </th>
                <th className="px-6 py-4 font-medium">
                  <button type="button" onClick={() => handleSort('unit')}>
                    {sortLabel('Unit', 'unit')}
                  </button>
                </th>
                <th className="px-6 py-4 font-medium">
                  <button type="button" onClick={() => handleSort('supplier')}>
                    {sortLabel('Supplier', 'supplier')}
                  </button>
                </th>
                <th className="px-6 py-4 font-medium">
                  <button type="button" onClick={() => handleSort('reorder_level')}>
                    {sortLabel('Reorder Level', 'reorder_level')}
                  </button>
                </th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingItems ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-[#6b5a52]">
                    Loading inventory...
                  </td>
                </tr>
              ) : visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-[#6b5a52]">
                    No inventory items found for this view.
                  </td>
                </tr>
              ) : (
                visibleItems.map((item) => {
                  const isLowStock =
                    Number(item.current_quantity) <= Number(item.reorder_level)
                  const equivalentText = getEquivalentText(item)

                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer border-t border-[#f0e7dc] hover:bg-[#faf7f2]"
                      onClick={() => openItemModal(item)}
                    >
                      <td className="px-6 py-4 text-[#2a1a1a]">{item.name}</td>
                      <td className="px-6 py-4 text-[#6b5a52]">{item.category}</td>
                      <td className="px-6 py-4 text-[#2a1a1a]">
                        <div>{item.current_quantity}</div>
                        {equivalentText ? (
                          <div className="text-xs text-[#6b5a52]">{equivalentText}</div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-[#6b5a52]">{item.unit}</td>
                      <td className="px-6 py-4 text-[#6b5a52]">
                        {item.suppliers?.name || '—'}
                      </td>
                      <td className="px-6 py-4 text-[#6b5a52]">{item.reorder_level}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            isLowStock
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {isLowStock ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e7ddd1] bg-white px-4 py-3">
          <div className="text-sm text-[#6b5a52]">
            Showing {filteredAndSortedItems.length === 0 ? 0 : startIndex + 1}
            {'–'}
            {Math.min(endIndex, filteredAndSortedItems.length)} of {filteredAndSortedItems.length}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-xl border border-[#d9cbbd] bg-white px-3 py-2 text-sm"
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              className="rounded-xl border border-[#d9cbbd] px-3 py-2 text-sm disabled:opacity-50"
            >
              Previous
            </button>

            <span className="text-sm text-[#2a1a1a]">
              Page {safeCurrentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage === totalPages}
              className="rounded-xl border border-[#d9cbbd] px-3 py-2 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        <div className="mt-6">
          <Link href="/dashboard" className="text-sm text-[#620b0b] underline">
            Back to dashboard
          </Link>
        </div>
      </div>

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[#2a1a1a]">Edit Item</h2>
                <p className="mt-1 text-sm text-[#6b5a52]">
                  Update item details and review history.
                </p>
              </div>

              <button
                type="button"
                onClick={closeItemModal}
                className="rounded-xl border border-[#d9cbbd] px-3 py-2 text-sm"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-[#6b5a52]">Item name</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-[#6b5a52]">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-[#6b5a52]">Purchase Unit</label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                    required
                  >
                    <option value="">Select Unit</option>
                    {unitOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-[#6b5a52]">Supplier</label>
                  <select
                    value={editSupplierId}
                    onChange={(e) => setEditSupplierId(e.target.value)}
                    className="w-full rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                  >
                    <option value="">No supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-[#6b5a52]">Reorder level</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editReorderLevel}
                    onChange={(e) => setEditReorderLevel(e.target.value)}
                    className="w-full rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-[#6b5a52]">Package Unit Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPackageSize}
                    onChange={(e) => setEditPackageSize(e.target.value)}
                    className="w-full rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-[#6b5a52]">Package Unit</label>
                  <select
                    value={editPackageSizeUnit}
                    onChange={(e) => setEditPackageSizeUnit(e.target.value)}
                    className="w-full rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                  >
                    <option value="">Select package size unit</option>
                    {unitOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl bg-[#faf7f2] p-4">
                <p className="mb-3 text-sm font-medium text-[#2a1a1a]">
                  Stock Update Mode
                </p>

                <div className="mb-4 flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-[#2a1a1a]">
                    <input
                      type="radio"
                      name="mode"
                      checked={editMode === 'set'}
                      onChange={() => {
                        setEditMode('set')
                        setEditQuantity(String(selectedItem.current_quantity))
                      }}
                    />
                    Set Quantity
                  </label>

                  <label className="flex items-center gap-2 text-sm text-[#2a1a1a]">
                    <input
                      type="radio"
                      name="mode"
                      checked={editMode === 'adjust'}
                      onChange={() => {
                        setEditMode('adjust')
                        setEditQuantity('')
                      }}
                    />
                    Adjust (+ / -)
                  </label>
                </div>

                <label className="mb-1 block text-sm text-[#6b5a52]">
                  {editMode === 'set' ? 'Current quantity' : 'Adjustment amount'}
                </label>

                <div className="flex gap-2">
  <input
    type="number"
    step="0.01"
    value={editQuantity}
    onChange={(e) => setEditQuantity(e.target.value)}
    className="w-full rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
    required
  />

  <select
    value={editUnit}
    onChange={(e) => setEditUnit(e.target.value)}
    className="w-40 rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
  >
    <option value="">Unit</option>
    {unitOptions.map((item) => (
      <option key={item} value={item}>
        {item}
      </option>
    ))}
  </select>
</div>

                <p className="mt-2 text-xs text-[#6b5a52]">
                  Current stored quantity: {selectedItem.current_quantity} {selectedItem.unit}
                  {selectedItem.package_size && selectedItem.package_size_unit
                    ? ` • Equivalent: ${
                        Number(selectedItem.current_quantity) * Number(selectedItem.package_size)
                      } ${selectedItem.package_size_unit}`
                    : ''}
                </p>
              </div>

              <button
                type="submit"
                disabled={savingEdit}
                className="rounded-2xl bg-[#620b0b] px-5 py-3 text-white disabled:opacity-60"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </form>

            {editMessage ? (
              <div className="mt-4 rounded-2xl border border-[#e7ddd1] bg-[#faf7f2] px-4 py-3 text-sm text-[#2a1a1a]">
                {editMessage}
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl border border-[#e7ddd1] p-4">
              <h3 className="text-lg font-semibold text-[#2a1a1a]">Last 3 Changes</h3>

              {loadingLogs ? (
                <p className="mt-3 text-sm text-[#6b5a52]">Loading history...</p>
              ) : logs.length === 0 ? (
                <p className="mt-3 text-sm text-[#6b5a52]">No log entries yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="rounded-2xl bg-[#faf7f2] px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-[#2a1a1a]">
                            {log.action === 'create'
                              ? 'Created item'
                              : log.action === 'set'
                              ? 'Set quantity'
                              : 'Adjusted quantity'}
                          </p>
                          <p className="mt-1 text-sm text-[#6b5a52]">
                            Previous: {log.previous_quantity} {log.unit ?? ''}
                            {' • '}
                            Change: {log.change_amount > 0 ? '+' : ''}
                            {log.change_amount} {log.unit ?? ''}
                            {' • '}
                            Result: {log.resulting_quantity} {log.unit ?? ''}
                          </p>
                        </div>

                        <p className="shrink-0 text-xs text-[#6b5a52]">
                          {new Date(log.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}