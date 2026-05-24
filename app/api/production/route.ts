import { createClient } from '@/utils/supabase/server'

type IngredientRow = {
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

function getUnitGroup(unit: string | null | undefined) {
  if (!unit) return null
  const normalized = unit.trim().toLowerCase()

  if (['g','kg','lb','oz'].includes(normalized)) return 'mass'
  if (['ml','l'].includes(normalized)) return 'volume'

  if (
    ['piece','bag','box','tray','slice','jar','bottle','pan','batch','serving']
      .includes(normalized)
  ) return 'count'

  return normalized
}

function normalizeToBaseUnit(value: number, unit: string | null | undefined) {
  if (!unit) return null
  const u = unit.toLowerCase()

  if (u === 'kg') return value * 1000
  if (u === 'lb') return value * 453.59237
  if (u === 'oz') return value * 28.349523125
  if (u === 'l') return value * 1000

  return value
}

function fromBaseUnit(value: number, unit: string | null | undefined) {
  if (!unit) return value
  const u = unit.toLowerCase()

  if (u === 'kg') return value / 1000
  if (u === 'lb') return value / 453.59237
  if (u === 'oz') return value / 28.349523125
  if (u === 'l') return value / 1000

  return value
}

function areUnitsCompatible(a: string | null | undefined, b: string | null | undefined) {
  return getUnitGroup(a) === getUnitGroup(b)
}

function getUsableInventoryQuantity(item: IngredientRow['inventory_items']) {
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

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()

    const recipeId = String(body.recipe_id ?? '').trim()
    const productionQuantity = Number(body.production_quantity ?? 0)
    const notes = String(body.notes ?? '').trim()

    if (!recipeId || Number.isNaN(productionQuantity) || productionQuantity <= 0) {
      return Response.json(
        { error: 'Recipe ID and a valid production quantity are required.' },
        { status: 400 }
      )
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      return Response.json({ error: userError.message }, { status: 500 })
    }

    // ✅ FIXED BLOCK
    let producedByFirstName: string | null = null

    if (user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .single()

      producedByFirstName = profile?.first_name ?? null
    }

    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select(`
        id,
        name,
        recipe_ingredients (
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
        )
      `)
      .eq('id', recipeId)
      .single()

    if (recipeError) {
      return Response.json({ error: recipeError.message }, { status: 500 })
    }

    const ingredients: IngredientRow[] = ((recipe as any).recipe_ingredients || []).map(
      (ingredient: any) => ({
        ...ingredient,
        inventory_items: Array.isArray(ingredient.inventory_items)
          ? ingredient.inventory_items[0] ?? null
          : ingredient.inventory_items,
      })
    )

    for (const ingredient of ingredients) {
      const inventoryItem = ingredient.inventory_items
      const recipeUnit = ingredient.unit || ''
      const requiredQuantity = Number(ingredient.quantity) * productionQuantity

      const usableInventory = getUsableInventoryQuantity(inventoryItem)

      if (!areUnitsCompatible(usableInventory.unit, recipeUnit)) {
        return Response.json(
          { error: `Unit mismatch for ${inventoryItem?.name}` },
          { status: 400 }
        )
      }

      const normalizedCurrent = normalizeToBaseUnit(
        usableInventory.quantity,
        usableInventory.unit
      )
      const normalizedRequired = normalizeToBaseUnit(requiredQuantity, recipeUnit)

      if (!normalizedCurrent || !normalizedRequired || normalizedCurrent < normalizedRequired) {
        return Response.json(
          { error: `Not enough stock for ${inventoryItem?.name}` },
          { status: 400 }
        )
      }
    }

    for (const ingredient of ingredients) {
      const inventoryItem = ingredient.inventory_items
      const recipeUnit = ingredient.unit || ''
      const requiredQuantity = Number(ingredient.quantity) * productionQuantity

      const usableInventory = getUsableInventoryQuantity(inventoryItem)

      const normalizedCurrent = normalizeToBaseUnit(
        usableInventory.quantity,
        usableInventory.unit
      )
      const normalizedRequired = normalizeToBaseUnit(requiredQuantity, recipeUnit)

      const remaining = normalizedCurrent! - normalizedRequired!

      let newQty: number

      if (inventoryItem?.package_size && inventoryItem.package_size_unit) {
        const packageBase = normalizeToBaseUnit(
          Number(inventoryItem.package_size),
          inventoryItem.package_size_unit
        )
        newQty = remaining / packageBase!
      } else {
        newQty = fromBaseUnit(remaining, inventoryItem?.unit)
      }

      const prev = Number(inventoryItem?.current_quantity ?? 0)

      await supabase
        .from('inventory_items')
        .update({ current_quantity: newQty })
        .eq('id', ingredient.inventory_item_id)

      await supabase.from('inventory_logs').insert([
        {
          inventory_item_id: ingredient.inventory_item_id,
          action: 'adjust',
          previous_quantity: prev,
          change_amount: newQty - prev,
          resulting_quantity: newQty,
          note: `Production: ${(recipe as any).name} x ${productionQuantity}`,
        },
      ])
    }

    await supabase.from('production_logs').insert([
      {
        recipe_id: (recipe as any).id,
        recipe_name: (recipe as any).name,
        production_quantity: productionQuantity,
        produced_by: user?.id ?? null,
        produced_by_first_name: producedByFirstName,
        notes: notes || null,
      },
    ])

    return Response.json({ message: 'Production successful' })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    )
  }
}