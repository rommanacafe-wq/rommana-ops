'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type InventoryItem = {
  id: string
  name: string
  unit: string
  cost?: number | null
  purchase_quantity?: number | null
  purchase_unit?: string | null
  package_size?: number | null
  package_size_unit?: string | null
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
  } | null
}

type RecipeStep = {
  id: string
  step_number: number
  instruction: string
}

type Recipe = {
  id: string
  name: string
  recipe_type: string
  category: string | null
  yield_quantity: number
  yield_unit: string
  shelf_life_days: number | null
  selling_price: number | null
  internal_notes: string | null
  status: string | null
  created_at: string
  recipe_ingredients?: RecipeIngredient[]
  recipe_steps?: RecipeStep[]
}

type IngredientRow = {
  inventory_item_id: string
  search: string
  quantity: string
  unit: string
}

type StepRow = {
  instruction: string
}

const recipeTypes = [
 
  { value: 'prep_batch', label: 'Prep Batch' },
  { value: 'event_prep_item', label: 'Event Prep Item' },
  { value: 'catering_tray', label: 'Catering Tray' },
  { value: 'menu)item', label: 'Menu Item' },
]

const recipeStatuses = ['Draft', 'Testing', 'Finalized']

const categoryOptions = [
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

const yieldUnitOptions = [
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

export default function RecipesPage() {
  const supabase = createClient()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [message, setMessage] = useState('')

  const [name, setName] = useState('')
  const [recipeType, setRecipeType] = useState<string>(recipeTypes[0].value)
  const [category, setCategory] = useState('')
  const [yieldQuantity, setYieldQuantity] = useState('')
  const [yieldUnit, setYieldUnit] = useState('')
  const [shelfLifeDays, setShelfLifeDays] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [status, setStatus] = useState('draft')
  const [submitting, setSubmitting] = useState(false)

  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { inventory_item_id: '', search: '', quantity: '', unit: '' },
  ])
  const [steps, setSteps] = useState<StepRow[]>([{ instruction: '' }])

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [loadingSelectedRecipe, setLoadingSelectedRecipe] = useState(false)
  const [editMessage, setEditMessage] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [editName, setEditName] = useState('')
  const [editRecipeType, setEditRecipeType] = useState<string>(recipeTypes[0].value)
  const [editCategory, setEditCategory] = useState('')
  const [editYieldQuantity, setEditYieldQuantity] = useState('')
  const [editYieldUnit, setEditYieldUnit] = useState('')
  const [editShelfLifeDays, setEditShelfLifeDays] = useState('')
  const [editSellingPrice, setEditSellingPrice] = useState('')
  const [editInternalNotes, setEditInternalNotes] = useState('')
  const [editStatus, setEditStatus] = useState('draft')
  const [editIngredients, setEditIngredients] = useState<IngredientRow[]>([
    { inventory_item_id: '', search: '', quantity: '', unit: '' },
  ])
  const [editSteps, setEditSteps] = useState<StepRow[]>([{ instruction: '' }])
  const [activePicker, setActivePicker] = useState<string | null>(null)

  async function loadPage() {
    try {
      setLoading(true)
      setPageError('')

      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select(`
          id,
          name,
          recipe_type,
          category,
          yield_quantity,
          yield_unit,
          shelf_life_days,
          selling_price,
          internal_notes,
          status,
          created_at,
          recipe_ingredients (
            id
          )
        `)
        .order('created_at', { ascending: false })

      if (recipesError) {
        throw new Error(recipesError.message)
      }

      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_items')
        .select(
          'id, name, unit, cost, purchase_quantity, purchase_unit, package_size, package_size_unit'
        )
        .order('name', { ascending: true })

      if (inventoryError) {
        throw new Error(inventoryError.message)
      }

      setRecipes((recipesData as Recipe[]) ?? [])
      setInventoryItems((inventoryData as InventoryItem[]) ?? [])
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Failed to load recipes page.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPage()
  }, [])

  function addIngredientRow() {
    setIngredients((prev) => [
      ...prev,
      { inventory_item_id: '', search: '', quantity: '', unit: '' },
    ])
  }

  function removeIngredientRow(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  function updateIngredientRow(
    index: number,
    field: keyof IngredientRow,
    value: string
  ) {
    setIngredients((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
        return { ...row, [field]: value }
      })
    )
  }

  function addStepRow() {
    setSteps((prev) => [...prev, { instruction: '' }])
  }

  function removeStepRow(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  function updateStepRow(index: number, value: string) {
    setSteps((prev) =>
      prev.map((row, i) => (i === index ? { ...row, instruction: value } : row))
    )
  }

  function resetForm() {
    setName('')
    setRecipeType(recipeTypes[0].value)
    setCategory('')
    setYieldQuantity('')
    setYieldUnit('')
    setShelfLifeDays('')
    setSellingPrice('')
    setInternalNotes('')
    setStatus('draft')
    setIngredients([{ inventory_item_id: '', search: '', quantity: '', unit: '' }])
    setSteps([{ instruction: '' }])
  }

  function renderInventoryPicker(
    row: IngredientRow,
    onSearchChange: (value: string) => void,
    onSelect: (item: InventoryItem) => void,
    pickerId: string
  ) {
    const query = row.search.trim().toLowerCase()

    const filteredItems =
      query.length === 0
        ? []
        : inventoryItems
            .filter((item) => item.name.toLowerCase().includes(query))
            .slice(0, 8)

    const showDropdown =
      activePicker === pickerId && query.length > 0 && filteredItems.length > 0

    return (
      <div className="relative">
        <input
          value={row.search}
          onFocus={() => setActivePicker(pickerId)}
          onBlur={() => {
            setTimeout(() => {
              setActivePicker((current) => (current === pickerId ? null : current))
            }, 150)
          }}
          onChange={(e) => {
            onSearchChange(e.target.value)
          }}
          placeholder="Search inventory item"
          className="w-full rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
        />

        {showDropdown ? (
          <div className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-[#d9cbbd] bg-white shadow-lg">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(item)
                  setActivePicker(null)
                }}
                className="block w-full border-b border-[#f3ece3] px-4 py-3 text-left text-sm text-[#2a1a1a] hover:bg-[#faf7f2]"
              >
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-[#6b5a52]">
                  {item.unit}
                  {item.package_size && item.package_size_unit
                    ? ` • ${item.package_size} ${item.package_size_unit}/${item.unit}`
                    : ''}
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  function getInventoryItemById(itemId: string) {
    return inventoryItems.find((item) => item.id === itemId)
  }

  function getUnitGroup(unit: string | null | undefined) {
    if (!unit) return null

    const normalized = unit.trim().toLowerCase()

    if (
      normalized === 'g' ||
      normalized === 'kg' ||
      normalized === 'lb' ||
      normalized === 'oz'
    ) return 'mass'
    if (normalized === 'ml' || normalized === 'l') return 'volume'
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

  function areUnitsCompatible(
    purchaseUnit: string | null | undefined,
    usageUnit: string | null | undefined
  ) {
    return getUnitGroup(purchaseUnit) === getUnitGroup(usageUnit)
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
    quantityUsed: string,
    usageUnit?: string
  ) {
    if (!inventoryItem) return null

    const cost = Number(inventoryItem.cost)
    const qtyUsed = Number(quantityUsed)
    const recipeUnit = usageUnit || inventoryItem.unit || ''

    const usablePurchased = getUsablePurchasedQuantity(inventoryItem)

    if (
      !usablePurchased ||
      Number.isNaN(cost) ||
      Number.isNaN(qtyUsed) ||
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
    const normalizedUsageQuantity = normalizeToBaseUnit(qtyUsed, recipeUnit)

    if (
      normalizedPurchaseQuantity === null ||
      normalizedUsageQuantity === null ||
      normalizedPurchaseQuantity <= 0
    ) {
      return null
    }

    return (cost / normalizedPurchaseQuantity) * normalizedUsageQuantity
  }

  function getRecipeTotalCost(rows: IngredientRow[]) {
    return rows.reduce((sum, row) => {
      const item = getInventoryItemById(row.inventory_item_id)
      const usageCost = getIngredientUsageCost(item, row.quantity, row.unit)
      return sum + (usageCost || 0)
    }, 0)
  }

  function getCostPerYield(totalCost: number, yieldQuantityValue: string) {
    const qty = Number(yieldQuantityValue)
    if (Number.isNaN(qty) || qty <= 0) return null
    return totalCost / qty
  }

  function getMargin(costPerYield: number | null, sellingPriceValue: string) {
    const price = Number(sellingPriceValue)
    if (costPerYield === null || Number.isNaN(price)) return null
    return price - costPerYield
  }

  const estimatedRecipeCost = getRecipeTotalCost(ingredients)
  const estimatedCostPerYield = getCostPerYield(estimatedRecipeCost, yieldQuantity)
  const estimatedMargin = getMargin(estimatedCostPerYield, sellingPrice)

  const editEstimatedRecipeCost = getRecipeTotalCost(editIngredients)
  const editEstimatedCostPerYield = getCostPerYield(
    editEstimatedRecipeCost,
    editYieldQuantity
  )
  const editEstimatedMargin = getMargin(editEstimatedCostPerYield, editSellingPrice)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')

    try {
      if (!name.trim() || !recipeType || !yieldUnit.trim() || Number(yieldQuantity) <= 0) {
        setMessage('Name, recipe type, yield quantity, and yield unit are required.')
        return
      }

      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert([
          {
            name: name.trim(),
            recipe_type: recipeType,
            category: category.trim() || null,
            yield_quantity: Number(yieldQuantity),
            yield_unit: yieldUnit.trim(),
            shelf_life_days: shelfLifeDays === '' ? null : Number(shelfLifeDays),
            selling_price: sellingPrice === '' ? null : Number(sellingPrice),
            internal_notes: internalNotes.trim() || null,
            status,
          },
        ])
        .select()
        .single()

      if (recipeError) {
        setMessage(recipeError.message)
        return
      }

      const ingredientRows = ingredients
        .filter(
          (item) =>
            item.inventory_item_id &&
            item.quantity !== '' &&
            !Number.isNaN(Number(item.quantity)) &&
            item.unit.trim()
        )
        .map((item) => ({
          recipe_id: recipe.id,
          inventory_item_id: item.inventory_item_id,
          quantity: Number(item.quantity),
          unit: item.unit.trim(),
        }))

      if (ingredientRows.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientRows)

        if (ingredientsError) {
          setMessage(ingredientsError.message)
          return
        }
      }

      const stepRows = steps
        .filter((step) => step.instruction.trim())
        .map((step, index) => ({
          recipe_id: recipe.id,
          step_number: index + 1,
          instruction: step.instruction.trim(),
        }))

      if (stepRows.length > 0) {
        const { error: stepsError } = await supabase
          .from('recipe_steps')
          .insert(stepRows)

        if (stepsError) {
          setMessage(stepsError.message)
          return
        }
      }

      setMessage(`${name} saved successfully.`)
      resetForm()
      await loadPage()
    } finally {
      setSubmitting(false)
    }
  }

  async function openRecipe(recipeId: string) {
    try {
      setLoadingSelectedRecipe(true)
      setEditMessage('')

      const { data, error } = await supabase
        .from('recipes')
        .select(`
          id,
          name,
          recipe_type,
          category,
          yield_quantity,
          yield_unit,
          shelf_life_days,
          selling_price,
          internal_notes,
          status,
          created_at,
          recipe_ingredients (
            id,
            inventory_item_id,
            quantity,
            unit,
            inventory_items (
              id,
              name,
              unit
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

      if (error) throw new Error(error.message)

      const raw = data as any

      const recipe: Recipe = {
        ...raw,
        recipe_ingredients: (raw.recipe_ingredients || []).map((ing: any) => ({
          ...ing,
          inventory_items: Array.isArray(ing.inventory_items)
            ? ing.inventory_items[0] ?? null
            : ing.inventory_items,
        })),
        recipe_steps: raw.recipe_steps || [],
      }

      const normalizedIngredients: IngredientRow[] =
        recipe.recipe_ingredients && recipe.recipe_ingredients.length > 0
          ? recipe.recipe_ingredients.map((ingredient) => ({
              inventory_item_id: ingredient.inventory_item_id,
              search: ingredient.inventory_items?.name || '',
              quantity: String(ingredient.quantity),
              unit: ingredient.unit,
            }))
          : [{ inventory_item_id: '', search: '', quantity: '', unit: '' }]

      const sortedSteps =
        recipe.recipe_steps && recipe.recipe_steps.length > 0
          ? [...recipe.recipe_steps].sort((a, b) => a.step_number - b.step_number)
          : []

      const normalizedSteps: StepRow[] =
        sortedSteps.length > 0
          ? sortedSteps.map((step) => ({ instruction: step.instruction }))
          : [{ instruction: '' }]

      setSelectedRecipe(recipe)
      setEditName(recipe.name)
      setEditRecipeType(recipe.recipe_type)
      setEditCategory(recipe.category || '')
      setEditYieldQuantity(String(recipe.yield_quantity))
      setEditYieldUnit(recipe.yield_unit)
      setEditShelfLifeDays(
        recipe.shelf_life_days === null ? '' : String(recipe.shelf_life_days)
      )
      setEditSellingPrice(
        recipe.selling_price === null ? '' : String(recipe.selling_price)
      )
      setEditInternalNotes(recipe.internal_notes || '')
      setEditStatus(recipe.status || 'draft')
      setEditIngredients(normalizedIngredients)
      setEditSteps(normalizedSteps)
    } catch (error) {
      setEditMessage(
        error instanceof Error ? error.message : 'Failed to load recipe.'
      )
    } finally {
      setLoadingSelectedRecipe(false)
    }
  }

  function closeRecipeModal() {
    setSelectedRecipe(null)
    setEditMessage('')
  }

  function addEditIngredientRow() {
    setEditIngredients((prev) => [
      ...prev,
      { inventory_item_id: '', search: '', quantity: '', unit: '' },
    ])
  }

  function removeEditIngredientRow(index: number) {
    setEditIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  function updateEditIngredientRow(
    index: number,
    field: keyof IngredientRow,
    value: string
  ) {
    setEditIngredients((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
        return { ...row, [field]: value }
      })
    )
  }

  function addEditStepRow() {
    setEditSteps((prev) => [...prev, { instruction: '' }])
  }

  function removeEditStepRow(index: number) {
    setEditSteps((prev) => prev.filter((_, i) => i !== index))
  }

  function updateEditStepRow(index: number, value: string) {
    setEditSteps((prev) =>
      prev.map((row, i) => (i === index ? { ...row, instruction: value } : row))
    )
  }

  async function handleUpdateRecipe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedRecipe) return

    setSavingEdit(true)
    setEditMessage('')

    try {
      if (
        !editName.trim() ||
        !editRecipeType ||
        !editYieldUnit.trim() ||
        Number(editYieldQuantity) <= 0
      ) {
        setEditMessage('Name, recipe type, yield quantity, and yield unit are required.')
        return
      }

      const { error: recipeError } = await supabase
        .from('recipes')
        .update({
          name: editName.trim(),
          recipe_type: editRecipeType,
          category: editCategory.trim() || null,
          yield_quantity: Number(editYieldQuantity),
          yield_unit: editYieldUnit.trim(),
          shelf_life_days: editShelfLifeDays === '' ? null : Number(editShelfLifeDays),
          selling_price: editSellingPrice === '' ? null : Number(editSellingPrice),
          internal_notes: editInternalNotes.trim() || null,
          status: editStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedRecipe.id)

      if (recipeError) {
        setEditMessage(recipeError.message)
        return
      }

      const { error: deleteIngredientsError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', selectedRecipe.id)

      if (deleteIngredientsError) {
        setEditMessage(deleteIngredientsError.message)
        return
      }

      const ingredientRows = editIngredients
        .filter(
          (item) =>
            item.inventory_item_id &&
            item.quantity !== '' &&
            !Number.isNaN(Number(item.quantity)) &&
            item.unit.trim()
        )
        .map((item) => ({
          recipe_id: selectedRecipe.id,
          inventory_item_id: item.inventory_item_id,
          quantity: Number(item.quantity),
          unit: item.unit.trim(),
        }))

      if (ingredientRows.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientRows)

        if (ingredientsError) {
          setEditMessage(ingredientsError.message)
          return
        }
      }

      const { error: deleteStepsError } = await supabase
        .from('recipe_steps')
        .delete()
        .eq('recipe_id', selectedRecipe.id)

      if (deleteStepsError) {
        setEditMessage(deleteStepsError.message)
        return
      }

      const stepRows = editSteps
        .filter((step) => step.instruction.trim())
        .map((step, index) => ({
          recipe_id: selectedRecipe.id,
          step_number: index + 1,
          instruction: step.instruction.trim(),
        }))

      if (stepRows.length > 0) {
        const { error: stepsError } = await supabase
          .from('recipe_steps')
          .insert(stepRows)

        if (stepsError) {
          setEditMessage(stepsError.message)
          return
        }
      }

      await loadPage()
      closeRecipeModal()
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f1e8] p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="mb-2 text-sm uppercase tracking-[0.2em] text-[#620b0b]">
            Rommana Ops
          </p>
          <h1 className="text-3xl font-semibold text-[#2a1a1a]">Recipes</h1>
          <p className="mt-2 text-sm text-[#6b5a52]">
            Create and save recipes directly in the app.
          </p>
        </div>

        <div className="mb-6 rounded-3xl border border-[#e7ddd1] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#2a1a1a]">Add Recipe</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-3 md:grid-cols-4">
              <input
                placeholder="Recipe name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                required
              />

              <select
                value={recipeType}
                onChange={(e) => setRecipeType(e.target.value)}
                className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
              >
                {recipeTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
              >
                <option value="">Select Category</option>
                {categoryOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
              >
                {recipeStatuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <input
                placeholder="Yield quantity"
                type="number"
                step="0.01"
                value={yieldQuantity}
                onChange={(e) => setYieldQuantity(e.target.value)}
                className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                required
              />

              <select
                value={yieldUnit}
                onChange={(e) => setYieldUnit(e.target.value)}
                className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                required
              >
                <option value="">Select Yield Unit</option>
                {yieldUnitOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <input
                placeholder="Shelf life days"
                type="number"
                value={shelfLifeDays}
                onChange={(e) => setShelfLifeDays(e.target.value)}
                className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
              />

              <input
                placeholder="Selling price (optional)"
                type="number"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#2a1a1a]">
                Notes
              </label>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
                placeholder="Draft notes, prep notes, storage notes, serving notes..."
                className="w-full rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
              />
            </div>

            <div className="rounded-2xl border border-[#e7ddd1] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#2a1a1a]">Ingredients</h3>
                <button
                  type="button"
                  onClick={addIngredientRow}
                  className="rounded-xl border border-[#d9cbbd] px-3 py-2 text-sm"
                >
                  Add Ingredient
                </button>
              </div>

              <div className="space-y-3">
                {ingredients.map((row, index) => {
                  const item = getInventoryItemById(row.inventory_item_id)
                  const usageCost = getIngredientUsageCost(item, row.quantity, row.unit)

                  return (
                    <div
                      key={index}
                      className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]"
                    >
                      <div>
                        {renderInventoryPicker(
                          row,
                          (searchValue) => {
                            updateIngredientRow(index, 'search', searchValue)
                            updateIngredientRow(index, 'inventory_item_id', '')
                          },
                          (item) => {
                            updateIngredientRow(index, 'inventory_item_id', item.id)
                            updateIngredientRow(index, 'search', item.name)
                            if (!row.unit) {
                              updateIngredientRow(index, 'unit', item.package_size_unit || item.unit || '')
                            }
                          },
                          `inventory-list-add-${index}`
                        )}
                      </div>

                      <div>
                        <input
                          placeholder="Quantity"
                          type="number"
                          step="0.01"
                          value={row.quantity}
                          onChange={(e) =>
                            updateIngredientRow(index, 'quantity', e.target.value)
                          }
                          className="w-full rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                        />
                        <div className="mt-1 text-xs text-[#6b5a52]">
                          {usageCost === null
                            ? 'No cost data'
                            : `Usage cost: $${usageCost.toFixed(4)}`}
                        </div>
                      </div>

                      <select
                        value={row.unit}
                        onChange={(e) =>
                          updateIngredientRow(index, 'unit', e.target.value)
                        }
                        className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                      >
                        <option value="">Select Unit</option>
                        {yieldUnitOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => removeIngredientRow(index)}
                        disabled={ingredients.length === 1}
                        className="rounded-xl border border-[#d9cbbd] px-3 py-2 text-sm disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl bg-[#faf7f2] px-4 py-4 text-sm text-[#2a1a1a]">
              <div className="font-medium">Recipe Cost Summary</div>
              <div className="mt-2 space-y-1 text-[#6b5a52]">
                <div>Total recipe cost: ${estimatedRecipeCost.toFixed(4)}</div>
                <div>
                  Cost per yield:{' '}
                  {estimatedCostPerYield === null
                    ? '—'
                    : `$${estimatedCostPerYield.toFixed(4)} / ${yieldUnit || 'unit'}`}
                </div>
                <div>
                  Margin:{' '}
                  {estimatedMargin === null ? '—' : `$${estimatedMargin.toFixed(4)}`}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e7ddd1] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#2a1a1a]">Steps</h3>
                <button
                  type="button"
                  onClick={addStepRow}
                  className="rounded-xl border border-[#d9cbbd] px-3 py-2 text-sm"
                >
                  Add Step
                </button>
              </div>

              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={index} className="grid gap-3 md:grid-cols-[auto_1fr_auto]">
                    <div className="flex items-center rounded-2xl bg-[#faf7f2] px-4 py-3 text-sm text-[#2a1a1a]">
                      Step {index + 1}
                    </div>

                    <input
                      placeholder="Instruction"
                      value={step.instruction}
                      onChange={(e) => updateStepRow(index, e.target.value)}
                      className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                    />

                    <button
                      type="button"
                      onClick={() => removeStepRow(index)}
                      disabled={steps.length === 1}
                      className="rounded-xl border border-[#d9cbbd] px-3 py-2 text-sm disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-[#620b0b] px-5 py-3 text-white disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Save Recipe'}
            </button>
          </form>

          {message ? (
            <div className="mt-4 rounded-2xl border border-[#e7ddd1] bg-[#faf7f2] px-4 py-3 text-sm text-[#2a1a1a]">
              {message}
            </div>
          ) : null}
        </div>

        {pageError ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Error loading recipes: {pageError}
          </div>
        ) : null}

        <div className="rounded-3xl border border-[#e7ddd1] bg-white shadow-sm">
          <div className="border-b border-[#f0e7dc] px-6 py-4">
            <h2 className="text-lg font-semibold text-[#2a1a1a]">Recipe List</h2>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#faf7f2] text-left text-sm text-[#6b5a52]">
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Yield</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Ingredients</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-[#6b5a52]">
                    Loading recipes...
                  </td>
                </tr>
              ) : recipes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-[#6b5a52]">
                    No recipes saved yet.
                  </td>
                </tr>
              ) : (
                recipes.map((recipe) => (
                  <tr
                    key={recipe.id}
                    className="cursor-pointer border-t border-[#f0e7dc] hover:bg-[#faf7f2]"
                    onClick={() => openRecipe(recipe.id)}
                  >
                    <td className="px-6 py-4 text-[#2a1a1a]">{recipe.name}</td>
                    <td className="px-6 py-4 text-[#6b5a52]">{recipe.recipe_type}</td>
                    <td className="px-6 py-4 text-[#6b5a52]">{recipe.category || '—'}</td>
                    <td className="px-6 py-4 text-[#6b5a52]">
                      {recipe.yield_quantity} {recipe.yield_unit}
                    </td>
                    <td className="px-6 py-4 text-[#6b5a52]">{recipe.status || 'draft'}</td>
                    <td className="px-6 py-4 text-[#6b5a52]">
                      {recipe.recipe_ingredients?.length || 0}
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

      {selectedRecipe ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[#2a1a1a]">Edit Recipe</h2>
                <p className="mt-1 text-sm text-[#6b5a52]">
                  Update recipe details, ingredients, and steps.
                </p>
              </div>

              <button
                type="button"
                onClick={closeRecipeModal}
                className="rounded-xl border border-[#d9cbbd] px-3 py-2 text-sm"
              >
                Close
              </button>
            </div>

            {loadingSelectedRecipe ? (
              <p className="text-sm text-[#6b5a52]">Loading recipe...</p>
            ) : (
              <form onSubmit={handleUpdateRecipe} className="space-y-6">
                <div className="grid gap-3 md:grid-cols-4">
                  <input
                    placeholder="Recipe name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                    required
                  />

                  <select
                    value={editRecipeType}
                    onChange={(e) => setEditRecipeType(e.target.value)}
                    className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                  >
                    {recipeTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                  >
                    <option value="">Select Category</option>
                    {categoryOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                  >
                    {recipeStatuses.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <input
                    placeholder="Yield quantity"
                    type="number"
                    step="0.01"
                    value={editYieldQuantity}
                    onChange={(e) => setEditYieldQuantity(e.target.value)}
                    className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                    required
                  />

                  <select
                    value={editYieldUnit}
                    onChange={(e) => setEditYieldUnit(e.target.value)}
                    className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                    required
                  >
                    <option value="">Select Yield Unit</option>
                    {yieldUnitOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <input
                    placeholder="Shelf life days"
                    type="number"
                    value={editShelfLifeDays}
                    onChange={(e) => setEditShelfLifeDays(e.target.value)}
                    className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                  />

                  <input
                    placeholder="Selling price"
                    type="number"
                    step="0.01"
                    value={editSellingPrice}
                    onChange={(e) => setEditSellingPrice(e.target.value)}
                    className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#2a1a1a]">
                    Notes
                  </label>
                  <textarea
                    value={editInternalNotes}
                    onChange={(e) => setEditInternalNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                  />
                </div>

                <div className="rounded-2xl border border-[#e7ddd1] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#2a1a1a]">Ingredients</h3>
                    <button
                      type="button"
                      onClick={addEditIngredientRow}
                      className="rounded-xl border border-[#d9cbbd] px-3 py-2 text-sm"
                    >
                      Add Ingredient
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editIngredients.map((row, index) => {
                      const item = getInventoryItemById(row.inventory_item_id)
                      const usageCost = getIngredientUsageCost(item, row.quantity, row.unit)

                      return (
                        <div
                          key={index}
                          className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]"
                        >
                          <div>
                            {renderInventoryPicker(
                              row,
                              (searchValue) => {
                                updateEditIngredientRow(index, 'search', searchValue)
                                updateEditIngredientRow(index, 'inventory_item_id', '')
                              },
                              (item) => {
                                updateEditIngredientRow(index, 'inventory_item_id', item.id)
                                updateEditIngredientRow(index, 'search', item.name)
                                if (!row.unit) {
                                  updateEditIngredientRow(
                                    index,
                                    'unit',
                                    item.package_size_unit || item.unit || ''
                                  )
                                }
                              },
                              `inventory-list-edit-${index}`
                            )}
                          </div>

                          <div>
                            <input
                              placeholder="Quantity"
                              type="number"
                              step="0.01"
                              value={row.quantity}
                              onChange={(e) =>
                                updateEditIngredientRow(index, 'quantity', e.target.value)
                              }
                              className="w-full rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                            />
                            <div className="mt-1 text-xs text-[#6b5a52]">
                              {usageCost === null
                                ? 'No cost data'
                                : `Usage cost: $${usageCost.toFixed(4)}`}
                            </div>
                          </div>

                          <select
                            value={row.unit}
                            onChange={(e) =>
                              updateEditIngredientRow(index, 'unit', e.target.value)
                            }
                            className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                          >
                            <option value="">Select Unit</option>
                            {yieldUnitOptions.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => removeEditIngredientRow(index)}
                            disabled={editIngredients.length === 1}
                            className="rounded-xl border border-[#d9cbbd] px-3 py-2 text-sm disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#faf7f2] px-4 py-4 text-sm text-[#2a1a1a]">
                  <div className="font-medium">Recipe Cost Summary</div>
                  <div className="mt-2 space-y-1 text-[#6b5a52]">
                    <div>Total recipe cost: ${editEstimatedRecipeCost.toFixed(4)}</div>
                    <div>
                      Cost per yield:{' '}
                      {editEstimatedCostPerYield === null
                        ? '—'
                        : `$${editEstimatedCostPerYield.toFixed(4)} / ${editYieldUnit || 'unit'}`}
                    </div>
                    <div>
                      Margin:{' '}
                      {editEstimatedMargin === null
                        ? '—'
                        : `$${editEstimatedMargin.toFixed(4)}`}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e7ddd1] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#2a1a1a]">Steps</h3>
                    <button
                      type="button"
                      onClick={addEditStepRow}
                      className="rounded-xl border border-[#d9cbbd] px-3 py-2 text-sm"
                    >
                      Add Step
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editSteps.map((step, index) => (
                      <div key={index} className="grid gap-3 md:grid-cols-[auto_1fr_auto]">
                        <div className="flex items-center rounded-2xl bg-[#faf7f2] px-4 py-3 text-sm text-[#2a1a1a]">
                          Step {index + 1}
                        </div>

                        <input
                          placeholder="Instruction"
                          value={step.instruction}
                          onChange={(e) => updateEditStepRow(index, e.target.value)}
                          className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
                        />

                        <button
                          type="button"
                          onClick={() => removeEditStepRow(index)}
                          disabled={editSteps.length === 1}
                          className="rounded-xl border border-[#d9cbbd] px-3 py-2 text-sm disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-2xl bg-[#620b0b] px-5 py-3 text-white disabled:opacity-60"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            )}

            {editMessage ? (
              <div className="mt-4 rounded-2xl border border-[#e7ddd1] bg-[#faf7f2] px-4 py-3 text-sm text-[#2a1a1a]">
                {editMessage}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  )
}