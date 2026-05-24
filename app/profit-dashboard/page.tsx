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
  cost: number | null
  purchase_quantity: number | null
  purchase_unit: string | null
  package_size: number | null
  package_size_unit: string | null
}

type RecipeIngredient = {
  id: string
  inventory_item_id: string
  quantity: number
  unit: string
}

type Recipe = {
  id: string
  name: string
  recipe_type: string
  category: string | null
  yield_quantity: number
  yield_unit: string
  selling_price: number | null
  status: string | null
  recipe_ingredients?: RecipeIngredient[]
}

type RecipeProfitRow = {
  id: string
  name: string
  recipe_type: string
  category: string | null
  yield_quantity: number
  yield_unit: string
  selling_price: number | null
  total_recipe_cost: number
  cost_per_yield_unit: number | null
  gross_profit: number | null
  gross_margin_percent: number | null
  status: string | null
}

const categoryFilters = [
  'all',
  'Drinks',
  'Syrup',
  'Filling',
  'Desserts',
  'Baked Goods',
  'Sandwiches',
  'Salads',
  'Waffles',
  'Manaeesh',
]

export default function ProfitDashboardPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pageError, setPageError] = useState('')
  const [pageMessage, setPageMessage] = useState('')

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({})
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  function getUnitGroup(unit: string | null | undefined) {
    if (!unit) return null
    const normalized = unit.trim().toLowerCase()

    if (
      normalized === 'g' ||
      normalized === 'kg' ||
      normalized === 'lb' ||
      normalized === 'oz'
    ) {
      return 'mass'
    }

    if (normalized === 'ml' || normalized === 'l') {
      return 'volume'
    }

    if (
      normalized === 'piece' ||
      normalized === 'bag' ||
      normalized === 'box' ||
      normalized === 'tray' ||
      normalized === 'slice' ||
      normalized === 'jar' ||
      normalized === 'bottle' ||
      normalized === 'pan' ||
      normalized === 'batch' ||
      normalized === 'serving'
    ) {
      return 'count'
    }

    return normalized
  }

  function areUnitsCompatible(a: string | null | undefined, b: string | null | undefined) {
    return getUnitGroup(a) === getUnitGroup(b)
  }

  function normalizeToBaseUnit(value: number, unit: string | null | undefined) {
    if (!unit) return null
    const normalized = unit.trim().toLowerCase()

    if (normalized === 'kg') return value * 1000
    if (normalized === 'g') return value
    if (normalized === 'lb') return value * 453.59237
    if (normalized === 'oz') return value * 28.349523125
    if (normalized === 'l') return value * 1000
    if (normalized === 'ml') return value

    return value
  }

  function getInventoryItemById(itemId: string) {
    return inventoryItems.find((item) => item.id === itemId)
  }

  function getUsablePurchasedQuantity(item: InventoryItem | undefined) {
    if (!item) return null

    const purchaseQuantity = Number(item.purchase_quantity)
    const packageSize = Number(item.package_size)

    if (
      item.package_size &&
      item.package_size_unit &&
      !Number.isNaN(purchaseQuantity) &&
      !Number.isNaN(packageSize)
    ) {
      return {
        quantity: purchaseQuantity * packageSize,
        unit: item.package_size_unit,
      }
    }

    if (!Number.isNaN(purchaseQuantity) && item.purchase_unit) {
      return {
        quantity: purchaseQuantity,
        unit: item.purchase_unit,
      }
    }

    return null
  }

  function getIngredientUsageCost(
    inventoryItem: InventoryItem | undefined,
    quantityUsed: number,
    usageUnit?: string
  ) {
    if (!inventoryItem) return null

    const cost = Number(inventoryItem.cost)
    const recipeUnit = usageUnit || ''
    const usablePurchased = getUsablePurchasedQuantity(inventoryItem)

    if (
      !usablePurchased ||
      Number.isNaN(cost) ||
      Number.isNaN(quantityUsed) ||
      usablePurchased.quantity <= 0
    ) {
      return null
    }

    if (!areUnitsCompatible(usablePurchased.unit, recipeUnit)) {
      return null
    }

    const normalizedPurchaseQuantity = normalizeToBaseUnit(
      usablePurchased.quantity,
      usablePurchased.unit
    )
    const normalizedUsageQuantity = normalizeToBaseUnit(quantityUsed, recipeUnit)

    if (
      normalizedPurchaseQuantity === null ||
      normalizedUsageQuantity === null ||
      normalizedPurchaseQuantity <= 0
    ) {
      return null
    }

    return (cost / normalizedPurchaseQuantity) * normalizedUsageQuantity
  }

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

  async function loadPage() {
    try {
      setLoading(true)
      setPageError('')
      setPageMessage('')

      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select(`
          id,
          name,
          recipe_type,
          category,
          yield_quantity,
          yield_unit,
          selling_price,
          status,
          recipe_ingredients (
            id,
            inventory_item_id,
            quantity,
            unit
          )
        `)
        .order('name', { ascending: true })

      if (recipeError) {
        throw new Error(recipeError.message)
      }

      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_items')
        .select(`
          id,
          name,
          cost,
          purchase_quantity,
          purchase_unit,
          package_size,
          package_size_unit
        `)
        .order('name', { ascending: true })

      if (inventoryError) {
        throw new Error(inventoryError.message)
      }

      const typedRecipes = (recipeData as Recipe[]) ?? []
      setRecipes(typedRecipes)
      setInventoryItems((inventoryData as InventoryItem[]) ?? [])

      const nextPriceEdits: Record<string, string> = {}
      for (const recipe of typedRecipes) {
        nextPriceEdits[recipe.id] =
          recipe.selling_price === null ? '' : String(recipe.selling_price)
      }
      setPriceEdits(nextPriceEdits)
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to load profit dashboard.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAdmin()
  }, [])

  useEffect(() => {
    if (!authChecked || !isAdmin) return
    loadPage()
  }, [authChecked, isAdmin])

  function updatePriceEdit(recipeId: string, value: string) {
    setPriceEdits((prev) => ({
      ...prev,
      [recipeId]: value,
    }))
  }

  async function saveSellingPrice(recipeId: string) {
    const rawValue = priceEdits[recipeId] ?? ''

    if (rawValue !== '' && Number.isNaN(Number(rawValue))) {
      setPageMessage('Selling price must be a valid number.')
      return
    }

    setSavingRecipeId(recipeId)
    setPageMessage('')
    setPageError('')

    const sellingPrice = rawValue === '' ? null : Number(rawValue)

    const { error } = await supabase
      .from('recipes')
      .update({
        selling_price: sellingPrice,
      })
      .eq('id', recipeId)

    if (error) {
      setPageError(error.message)
      setSavingRecipeId(null)
      return
    }

    setRecipes((prev) =>
      prev.map((recipe) =>
        recipe.id === recipeId
          ? { ...recipe, selling_price: sellingPrice }
          : recipe
      )
    )

    setPageMessage('Selling price updated.')
    setSavingRecipeId(null)
  }

  const profitRows: RecipeProfitRow[] = useMemo(() => {
    return recipes.map((recipe) => {
      const totalRecipeCost = (recipe.recipe_ingredients ?? []).reduce((sum, ingredient) => {
        const item = getInventoryItemById(ingredient.inventory_item_id)
        const usageCost = getIngredientUsageCost(
          item,
          Number(ingredient.quantity),
          ingredient.unit
        )
        return sum + (usageCost || 0)
      }, 0)

      const costPerYieldUnit =
        Number(recipe.yield_quantity) > 0
          ? totalRecipeCost / Number(recipe.yield_quantity)
          : null

      const sellingPrice =
        recipe.selling_price === null ? null : Number(recipe.selling_price)

      const grossProfit =
        sellingPrice !== null && costPerYieldUnit !== null
          ? sellingPrice - costPerYieldUnit
          : null

      const grossMarginPercent =
        sellingPrice !== null &&
        sellingPrice > 0 &&
        grossProfit !== null
          ? (grossProfit / sellingPrice) * 100
          : null

      return {
        id: recipe.id,
        name: recipe.name,
        recipe_type: recipe.recipe_type,
        category: recipe.category,
        yield_quantity: recipe.yield_quantity,
        yield_unit: recipe.yield_unit,
        selling_price: recipe.selling_price,
        total_recipe_cost: totalRecipeCost,
        cost_per_yield_unit: costPerYieldUnit,
        gross_profit: grossProfit,
        gross_margin_percent: grossMarginPercent,
        status: recipe.status,
      }
    })
  }, [recipes, inventoryItems])

  const filteredProfitRows = useMemo(() => {
    if (categoryFilter === 'all') return profitRows

    return profitRows.filter(
      (row) => (row.category || '').toLowerCase() === categoryFilter.toLowerCase()
    )
  }, [profitRows, categoryFilter])

  const summary = useMemo(() => {
    const rowsWithPrice = filteredProfitRows.filter((row) => row.selling_price !== null)
    const rowsWithMargin = filteredProfitRows.filter(
      (row) => row.gross_margin_percent !== null
    )

    const topMargin =
      [...rowsWithMargin].sort(
        (a, b) => (b.gross_margin_percent ?? 0) - (a.gross_margin_percent ?? 0)
      )[0] ?? null

    const lowestMargin =
      [...rowsWithMargin].sort(
        (a, b) => (a.gross_margin_percent ?? 0) - (b.gross_margin_percent ?? 0)
      )[0] ?? null

    const avgMargin =
      rowsWithMargin.length > 0
        ? rowsWithMargin.reduce((sum, row) => sum + (row.gross_margin_percent ?? 0), 0) /
          rowsWithMargin.length
        : null

    return {
      pricedItems: rowsWithPrice.length,
      avgMargin,
      topMargin,
      lowestMargin,
    }
  }, [filteredProfitRows])

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-[#f7f1e8] p-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-[#e7ddd1] bg-white p-6 shadow-sm text-[#2a1a1a]">
          Checking access...
        </div>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#f7f1e8] p-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
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
        <div className="mb-6">
          <p className="mb-2 text-sm uppercase tracking-[0.2em] text-[#620b0b]">
            Rommana Ops
          </p>
          <h1 className="text-3xl font-semibold text-[#2a1a1a]">Profit Dashboard</h1>
          <p className="mt-2 text-sm text-[#6b5a52]">
            Recipe cost, selling price, gross profit, and margin by menu item.
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

        <div className="mb-4 flex flex-wrap gap-2">
          {categoryFilters.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                categoryFilter === category
                  ? 'bg-[#620b0b] text-white'
                  : 'border border-[#e7ddd1] bg-white text-[#2a1a1a]'
              }`}
            >
              {category === 'all' ? 'All' : category}
            </button>
          ))}
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-[#e7ddd1] bg-white p-5 shadow-sm">
            <div className="text-sm text-[#6b5a52]">Priced items</div>
            <div className="mt-2 text-2xl font-semibold text-[#2a1a1a]">
              {summary.pricedItems}
            </div>
          </div>

          <div className="rounded-3xl border border-[#e7ddd1] bg-white p-5 shadow-sm">
            <div className="text-sm text-[#6b5a52]">Average gross margin</div>
            <div className="mt-2 text-2xl font-semibold text-[#2a1a1a]">
              {summary.avgMargin === null ? '—' : `${summary.avgMargin.toFixed(1)}%`}
            </div>
          </div>

          <div className="rounded-3xl border border-[#e7ddd1] bg-white p-5 shadow-sm">
            <div className="text-sm text-[#6b5a52]">Top margin item</div>
            <div className="mt-2 text-lg font-semibold text-[#2a1a1a]">
              {summary.topMargin?.name || '—'}
            </div>
            <div className="mt-1 text-sm text-[#6b5a52]">
              {summary.topMargin?.gross_margin_percent !== null &&
              summary.topMargin?.gross_margin_percent !== undefined
                ? `${summary.topMargin.gross_margin_percent.toFixed(1)}%`
                : '—'}
            </div>
          </div>

          <div className="rounded-3xl border border-[#e7ddd1] bg-white p-5 shadow-sm">
            <div className="text-sm text-[#6b5a52]">Lowest margin item</div>
            <div className="mt-2 text-lg font-semibold text-[#2a1a1a]">
              {summary.lowestMargin?.name || '—'}
            </div>
            <div className="mt-1 text-sm text-[#6b5a52]">
              {summary.lowestMargin?.gross_margin_percent !== null &&
              summary.lowestMargin?.gross_margin_percent !== undefined
                ? `${summary.lowestMargin.gross_margin_percent.toFixed(1)}%`
                : '—'}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[#e7ddd1] bg-white shadow-sm">
          <div className="border-b border-[#f0e7dc] px-6 py-4">
            <h2 className="text-lg font-semibold text-[#2a1a1a]">Menu Profitability</h2>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#faf7f2] text-left text-sm text-[#6b5a52]">
                <th className="px-6 py-4 font-medium">Item</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Yield</th>
                <th className="px-6 py-4 font-medium">Total Recipe Cost</th>
                <th className="px-6 py-4 font-medium">Cost / Unit</th>
                <th className="px-6 py-4 font-medium">Selling Price</th>
                <th className="px-6 py-4 font-medium">Gross Profit</th>
                <th className="px-6 py-4 font-medium">Margin %</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-6 py-8 text-center text-sm text-[#6b5a52]">
                    Loading profitability...
                  </td>
                </tr>
              ) : filteredProfitRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-8 text-center text-sm text-[#6b5a52]">
                    No recipes found for this category.
                  </td>
                </tr>
              ) : (
                filteredProfitRows.map((row) => (
                  <tr key={row.id} className="border-t border-[#f0e7dc]">
                    <td className="px-6 py-4 text-[#2a1a1a]">{row.name}</td>
                    <td className="px-6 py-4 text-[#6b5a52]">{row.recipe_type}</td>
                    <td className="px-6 py-4 text-[#6b5a52]">{row.category || '—'}</td>
                    <td className="px-6 py-4 text-[#6b5a52]">
                      {row.yield_quantity} {row.yield_unit}
                    </td>
                    <td className="px-6 py-4 text-[#2a1a1a]">
                      ${row.total_recipe_cost.toFixed(4)}
                    </td>
                    <td className="px-6 py-4 text-[#6b5a52]">
                      {row.cost_per_yield_unit === null
                        ? '—'
                        : `$${row.cost_per_yield_unit.toFixed(4)}`}
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        step="0.01"
                        value={priceEdits[row.id] ?? ''}
                        onChange={(e) => updatePriceEdit(row.id, e.target.value)}
                        className="w-28 rounded-xl border border-[#d9cbbd] px-3 py-2 text-sm outline-none focus:border-[#620b0b]"
                        placeholder="Set price"
                      />
                    </td>
                    <td className="px-6 py-4 text-[#2a1a1a]">
                      {row.gross_profit === null ? '—' : `$${row.gross_profit.toFixed(4)}`}
                    </td>
                    <td className="px-6 py-4">
                      {row.gross_margin_percent === null ? (
                        <span className="text-[#6b5a52]">—</span>
                      ) : (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            row.gross_margin_percent >= 70
                              ? 'bg-green-100 text-green-700'
                              : row.gross_margin_percent >= 50
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {row.gross_margin_percent.toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[#6b5a52]">{row.status || '—'}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => saveSellingPrice(row.id)}
                        disabled={savingRecipeId === row.id}
                        className="rounded-xl bg-[#620b0b] px-3 py-2 text-sm text-white disabled:opacity-60"
                      >
                        {savingRecipeId === row.id ? 'Saving...' : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))
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