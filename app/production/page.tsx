'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Recipe = {
  id: string
  name: string
  recipe_type: string
  category: string | null
  yield_quantity: number
  yield_unit: string
}

type RecipeStep = {
  id: string
  step_number: number
  instruction: string
}

type RecipeIngredient = {
  id: string
  inventory_item_id: string
  quantity: number
  unit: string
  inventory_items?: {
    id: string
    name: string
    unit: string
    current_quantity: number
    package_size: number | null
    package_size_unit: string | null
  } | null
}

type ProductionPreviewRow = {
  inventory_item_id: string
  ingredient_name: string
  recipe_quantity: number
  recipe_unit: string
  inventory_quantity: number
  inventory_unit: string
  package_size: number | null
  package_size_unit: string | null
  required_quantity_display: number
  required_quantity_base: number | null
  current_quantity_base: number | null
  remaining_quantity_base: number | null
  enough_stock: boolean
  unit_mismatch: boolean
}

export default function ProductionPage() {
  const supabase = createClient()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedRecipeId, setSelectedRecipeId] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [recipeSteps, setRecipeSteps] = useState<RecipeStep[]>([])
  const [productionQuantity, setProductionQuantity] = useState('1')
  const [productionNotes, setProductionNotes] = useState('')

  const [loadingRecipes, setLoadingRecipes] = useState(true)
  const [loadingRecipeDetails, setLoadingRecipeDetails] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [pageError, setPageError] = useState('')
  const [message, setMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

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

  function fromBaseUnit(value: number, unit: string | null | undefined) {
    if (!unit) return value
    const normalized = unit.trim().toLowerCase()

    if (normalized === 'kg') return value / 1000
    if (normalized === 'g') return value
    if (normalized === 'lb') return value / 453.59237
    if (normalized === 'oz') return value / 28.349523125
    if (normalized === 'l') return value / 1000
    if (normalized === 'ml') return value

    return value
  }

  function areUnitsCompatible(a: string | null | undefined, b: string | null | undefined) {
    return getUnitGroup(a) === getUnitGroup(b)
  }

  function getUsableInventoryQuantity(item: RecipeIngredient['inventory_items']) {
    if (!item) return { quantity: 0, unit: '' }

    if (item.package_size && item.package_size_unit) {
      return {
        quantity: Number(item.current_quantity) * Number(item.package_size),
        unit: item.package_size_unit,
      }
    }

    return {
      quantity: Number(item.current_quantity),
      unit: item.unit,
    }
  }

  async function loadRecipes() {
    try {
      setLoadingRecipes(true)
      setPageError('')

      const { data, error } = await supabase
        .from('recipes')
        .select(`
          id,
          name,
          recipe_type,
          category,
          yield_quantity,
          yield_unit
        `)
        .order('name', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      setRecipes((data as Recipe[]) ?? [])
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to load recipes.'
      )
    } finally {
      setLoadingRecipes(false)
    }
  }

  useEffect(() => {
    loadRecipes()
  }, [])

  useEffect(() => {
    if (!successMessage) return

    const timer = setTimeout(() => {
      setSuccessMessage('')
    }, 3000)

    return () => clearTimeout(timer)
  }, [successMessage])

  async function loadRecipeDetails(recipeId: string) {
    if (!recipeId) {
      setSelectedRecipe(null)
      setIngredients([])
      setRecipeSteps([])
      return
    }

    try {
      setLoadingRecipeDetails(true)
      setMessage('')
      setPageError('')

      const { data, error } = await supabase
        .from('recipes')
        .select(`
          id,
          name,
          recipe_type,
          category,
          yield_quantity,
          yield_unit,
          recipe_ingredients (
            id,
            inventory_item_id,
            quantity,
            unit,
            inventory_items (
              id,
              name,
              unit,
              current_quantity,
              package_size,
              package_size_unit
            )
          ),
          recipe_steps (
            id,
            step_number,
            instruction
          )
        `)
        .eq('id', recipeId)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      const raw = data as any

      const normalizedIngredients: RecipeIngredient[] = (raw.recipe_ingredients || []).map(
        (ingredient: any) => ({
          ...ingredient,
          inventory_items: Array.isArray(ingredient.inventory_items)
            ? ingredient.inventory_items[0] ?? null
            : ingredient.inventory_items,
        })
      )

      const normalizedSteps: RecipeStep[] = ((raw.recipe_steps || []) as RecipeStep[]).sort(
        (a, b) => a.step_number - b.step_number
      )

      setSelectedRecipe({
        id: raw.id,
        name: raw.name,
        recipe_type: raw.recipe_type,
        category: raw.category,
        yield_quantity: raw.yield_quantity,
        yield_unit: raw.yield_unit,
      })

      setIngredients(normalizedIngredients)
      setRecipeSteps(normalizedSteps)
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to load recipe details.'
      )
      setSelectedRecipe(null)
      setIngredients([])
      setRecipeSteps([])
    } finally {
      setLoadingRecipeDetails(false)
    }
  }

  function handleRecipeChange(recipeId: string) {
    setSelectedRecipeId(recipeId)
    loadRecipeDetails(recipeId)
  }

  const multiplier = Number(productionQuantity)

  const previewRows: ProductionPreviewRow[] = useMemo(() => {
    if (!selectedRecipe || Number.isNaN(multiplier) || multiplier <= 0) {
      return []
    }

    return ingredients.map((ingredient) => {
      const inventory = ingredient.inventory_items
      const recipeUnit = ingredient.unit || ''
      const recipeQuantity = Number(ingredient.quantity ?? 0)
      const requiredQuantityDisplay = recipeQuantity * multiplier

      const usableInventory = getUsableInventoryQuantity(inventory)
      const inventoryQuantity = usableInventory.quantity
      const inventoryUnit = usableInventory.unit

      const unitsCompatible = areUnitsCompatible(recipeUnit, inventoryUnit)
      const requiredQuantityBase = unitsCompatible
        ? normalizeToBaseUnit(requiredQuantityDisplay, recipeUnit)
        : null
      const currentQuantityBase = unitsCompatible
        ? normalizeToBaseUnit(inventoryQuantity, inventoryUnit)
        : null
      const remainingQuantityBase =
        requiredQuantityBase !== null && currentQuantityBase !== null
          ? currentQuantityBase - requiredQuantityBase
          : null

      return {
        inventory_item_id: ingredient.inventory_item_id,
        ingredient_name: inventory?.name || 'Unknown item',
        recipe_quantity: recipeQuantity,
        recipe_unit: recipeUnit,
        inventory_quantity: inventory?.current_quantity ?? 0,
        inventory_unit: inventory?.unit || '',
        package_size: inventory?.package_size ?? null,
        package_size_unit: inventory?.package_size_unit ?? null,
        required_quantity_display: requiredQuantityDisplay,
        required_quantity_base: requiredQuantityBase,
        current_quantity_base: currentQuantityBase,
        remaining_quantity_base: remainingQuantityBase,
        enough_stock: remainingQuantityBase !== null ? remainingQuantityBase >= 0 : false,
        unit_mismatch: !unitsCompatible,
      }
    })
  }, [ingredients, multiplier, selectedRecipe])

  const hasInsufficientStock = previewRows.some(
    (row) => row.unit_mismatch || !row.enough_stock
  )

  async function handleProduce() {
    if (!selectedRecipe) {
      setMessage('Please select a recipe.')
      setSuccessMessage('')
      return
    }

    if (Number.isNaN(multiplier) || multiplier <= 0) {
      setMessage('Enter a valid production quantity.')
      setSuccessMessage('')
      return
    }

    if (previewRows.length === 0) {
      setMessage('This recipe has no ingredients to deduct.')
      setSuccessMessage('')
      return
    }

    if (hasInsufficientStock) {
      setMessage('Not enough stock or unit mismatch for one or more ingredients.')
      setSuccessMessage('')
      return
    }

    try {
      setSubmitting(true)
      setMessage('')
      setSuccessMessage('')

      const response = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe_id: selectedRecipe.id,
          production_quantity: multiplier,
          notes: productionNotes,
        }),
      })

      const text = await response.text()

      let result: any = {}
      try {
        result = text ? JSON.parse(text) : {}
      } catch {
        setMessage(`Invalid server response: ${text}`)
        return
      }

      if (!response.ok) {
        setMessage(result.error || 'Failed to produce recipe.')
        return
      }

      setSuccessMessage(result.message || 'Batch created successfully.')
      setProductionNotes('')
      await loadRecipeDetails(selectedRecipe.id)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f1e8] p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="mb-2 text-sm uppercase tracking-[0.2em] text-[#620b0b]">
            Rommana Ops
          </p>
          <h1 className="text-3xl font-semibold text-[#2a1a1a]">Production</h1>
          <p className="mt-2 text-sm text-[#6b5a52]">
            Select a recipe, enter how many batches you are making, preview usage,
            then deduct ingredients from inventory.
          </p>
        </div>

        <div className="mb-6 rounded-3xl border border-[#e7ddd1] bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#2a1a1a]">
                Select recipe
              </label>
              <select
                value={selectedRecipeId}
                onChange={(e) => handleRecipeChange(e.target.value)}
                className="w-full rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
              >
                <option value="">Choose a recipe</option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#2a1a1a]">
                Production quantity
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={productionQuantity}
                onChange={(e) => setProductionQuantity(e.target.value)}
                className="w-full rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                placeholder="1"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleProduce}
                disabled={
                  submitting ||
                  !selectedRecipe ||
                  loadingRecipeDetails ||
                  previewRows.length === 0 ||
                  hasInsufficientStock
                }
                className="w-full rounded-2xl bg-[#620b0b] px-5 py-3 text-white disabled:opacity-60"
              >
                {submitting ? 'Producing...' : 'Produce Batch'}
              </button>
            </div>

            <div className="md:col-span-3">
              <label className="mb-2 block text-sm font-medium text-[#2a1a1a]">
                Production notes
              </label>
              <textarea
                value={productionNotes}
                onChange={(e) => setProductionNotes(e.target.value)}
                rows={3}
                placeholder="Optional notes about this batch..."
                className="w-full rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
              />
            </div>
          </div>

          {selectedRecipe ? (
            <div className="mt-4 rounded-2xl bg-[#faf7f2] px-4 py-3 text-sm text-[#2a1a1a]">
              <span className="font-medium">{selectedRecipe.name}</span>
              {' • '}
              {selectedRecipe.recipe_type}
              {selectedRecipe.category ? ` • ${selectedRecipe.category}` : ''}
              {' • '}
              Yield: {selectedRecipe.yield_quantity} {selectedRecipe.yield_unit}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </div>
          ) : null}

          {message ? (
            <div className="mt-4 rounded-2xl border border-[#e7ddd1] bg-[#faf7f2] px-4 py-3 text-sm text-[#2a1a1a]">
              {message}
            </div>
          ) : null}

          {pageError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {pageError}
            </div>
          ) : null}
        </div>

        {selectedRecipe && recipeSteps.length > 0 ? (
          <div className="mb-6 rounded-3xl border border-[#e7ddd1] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#2a1a1a]">Recipe Steps</h2>
            <div className="mt-4 space-y-3">
              {recipeSteps.map((step) => (
                <div
                  key={step.id}
                  className="rounded-2xl bg-[#faf7f2] px-4 py-3"
                >
                  <div className="text-sm font-medium text-[#620b0b]">
                    Step {step.step_number}
                  </div>
                  <div className="mt-1 text-sm text-[#2a1a1a]">
                    {step.instruction}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-[#e7ddd1] bg-white shadow-sm">
          <div className="border-b border-[#f0e7dc] px-6 py-4">
            <h2 className="text-lg font-semibold text-[#2a1a1a]">Production Preview</h2>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#faf7f2] text-left text-sm text-[#6b5a52]">
                <th className="px-6 py-4 font-medium">Ingredient</th>
                <th className="px-6 py-4 font-medium">Recipe Qty</th>
                <th className="px-6 py-4 font-medium">Required</th>
                <th className="px-6 py-4 font-medium">In Stock</th>
                <th className="px-6 py-4 font-medium">After</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingRecipes || loadingRecipeDetails ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-[#6b5a52]">
                    Loading preview...
                  </td>
                </tr>
              ) : !selectedRecipe ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-[#6b5a52]">
                    Select a recipe to preview production usage.
                  </td>
                </tr>
              ) : previewRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-[#6b5a52]">
                    This recipe has no ingredients.
                  </td>
                </tr>
              ) : (
                previewRows.map((row) => (
                  <tr key={row.inventory_item_id} className="border-t border-[#f0e7dc]">
                    <td className="px-6 py-4 text-[#2a1a1a]">{row.ingredient_name}</td>
                    <td className="px-6 py-4 text-[#6b5a52]">
                      {row.recipe_quantity} {row.recipe_unit}
                    </td>
                    <td className="px-6 py-4 text-[#2a1a1a]">
                      {row.required_quantity_display} {row.recipe_unit}
                    </td>
                    <td className="px-6 py-4 text-[#6b5a52]">
                      <div>
                        {row.inventory_quantity} {row.inventory_unit}
                      </div>
                      {row.package_size && row.package_size_unit ? (
                        <div className="text-xs text-[#6b5a52]">
                          = {Number(row.inventory_quantity) * Number(row.package_size)} {row.package_size_unit}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-[#6b5a52]">
                      {row.unit_mismatch
                        ? '—'
                        : row.package_size && row.package_size_unit
                        ? `${(
                            (row.remaining_quantity_base ?? 0) /
                            normalizeToBaseUnit(Number(row.package_size), row.package_size_unit)!
                          ).toFixed(2)} ${row.inventory_unit}`
                        : `${fromBaseUnit(
                            row.remaining_quantity_base ?? 0,
                            row.inventory_unit
                          ).toFixed(2)} ${row.inventory_unit}`}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          row.unit_mismatch
                            ? 'bg-yellow-100 text-yellow-700'
                            : row.enough_stock
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {row.unit_mismatch
                          ? 'Unit Mismatch'
                          : row.enough_stock
                          ? 'Enough Stock'
                          : 'Insufficient'}
                      </span>
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