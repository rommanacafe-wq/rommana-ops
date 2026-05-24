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

    const productionLogId = String(body.production_log_id ?? '').trim()
    const reversalNote = String(body.reversal_note ?? '').trim()

    if (!productionLogId) {
      return Response.json(
        { error: 'Production log ID is required.' },
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

    let reversedByFirstName: string | null = null

    if (user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .single()

      reversedByFirstName = profile?.first_name || null
    }

    const { data: productionLog, error: productionLogError } = await supabase
      .from('production_logs')
      .select(`
        id,
        recipe_id,
        recipe_name,
        production_quantity,
        reversed_at
      `)
      .eq('id', productionLogId)
      .single()

    if (productionLogError) {
      return Response.json({ error: productionLogError.message }, { status: 500 })
    }

    if (!productionLog) {
      return Response.json({ error: 'Production log not found.' }, { status: 404 })
    }

    if ((productionLog as any).reversed_at) {
      return Response.json(
        { error: 'This production batch has already been reversed.' },
        { status: 400 }
      )
    }

    const recipeId = String((productionLog as any).recipe_id ?? '').trim()
    const productionQuantity = Number((productionLog as any).production_quantity ?? 0)

    if (!recipeId || Number.isNaN(productionQuantity) || productionQuantity <= 0) {
      return Response.json(
        { error: 'Production log is missing a valid recipe or quantity.' },
        { status: 400 }
      )
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

    if (ingredients.length === 0) {
      return Response.json(
        { error: 'This recipe has no ingredients to restore.' },
        { status: 400 }
      )
    }

    for (const ingredient of ingredients) {
      const inventoryItem = ingredient.inventory_items
      const recipeUnit = ingredient.unit || ''
      const restoreQuantity = Number(ingredient.quantity) * productionQuantity

      if (!inventoryItem) {
        return Response.json(
          { error: 'One or more inventory items could not be found.' },
          { status: 400 }
        )
      }

      const usableInventory = getUsableInventoryQuantity(inventoryItem)
      const usableInventoryQuantity = usableInventory.quantity
      const usableInventoryUnit = usableInventory.unit

      if (!areUnitsCompatible(usableInventoryUnit, recipeUnit)) {
        return Response.json(
          {
            error: `Unit mismatch for ${inventoryItem.name}: recipe uses ${recipeUnit}, inventory uses ${usableInventoryUnit}.`,
          },
          { status: 400 }
        )
      }

      const normalizedCurrentUsable = normalizeToBaseUnit(
        usableInventoryQuantity,
        usableInventoryUnit
      )
      const normalizedRestore = normalizeToBaseUnit(restoreQuantity, recipeUnit)

      if (
        normalizedCurrentUsable === null ||
        normalizedRestore === null ||
        Number.isNaN(normalizedCurrentUsable) ||
        Number.isNaN(normalizedRestore)
      ) {
        return Response.json(
          { error: `Failed unit conversion for ${inventoryItem.name}.` },
          { status: 400 }
        )
      }

      const normalizedNewUsable = normalizedCurrentUsable + normalizedRestore

      let newCurrentQuantity: number

      if (inventoryItem.package_size && inventoryItem.package_size_unit) {
        const normalizedPackageSize = normalizeToBaseUnit(
          Number(inventoryItem.package_size),
          inventoryItem.package_size_unit
        )

        if (
          normalizedPackageSize === null ||
          Number.isNaN(normalizedPackageSize) ||
          normalizedPackageSize <= 0
        ) {
          return Response.json(
            { error: `Invalid package size for ${inventoryItem.name}.` },
            { status: 400 }
          )
        }

        newCurrentQuantity = normalizedNewUsable / normalizedPackageSize
      } else {
        newCurrentQuantity = fromBaseUnit(normalizedNewUsable, inventoryItem.unit)
      }

      if (Number.isNaN(newCurrentQuantity)) {
        return Response.json(
          { error: `Invalid restored quantity for ${inventoryItem.name}.` },
          { status: 400 }
        )
      }

      const previousQuantity = Number(inventoryItem.current_quantity ?? 0)
      const changeAmount = newCurrentQuantity - previousQuantity

      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          current_quantity: newCurrentQuantity,
        })
        .eq('id', ingredient.inventory_item_id)

      if (updateError) {
        return Response.json({ error: updateError.message }, { status: 500 })
      }

      const { error: logError } = await supabase.from('inventory_logs').insert([
        {
          inventory_item_id: ingredient.inventory_item_id,
          action: 'adjust',
          previous_quantity: previousQuantity,
          change_amount: changeAmount,
          resulting_quantity: newCurrentQuantity,
          unit: inventoryItem.unit || null,
          note: `Reversal: ${(productionLog as any).recipe_name || (recipe as any).name} x ${productionQuantity}`,
          created_by: user?.id ?? null,
        },
      ])

      if (logError) {
        return Response.json({ error: logError.message }, { status: 500 })
      }
    }

    const { error: reverseLogError } = await supabase
      .from('production_logs')
      .update({
        reversed_at: new Date().toISOString(),
        reversed_by: user?.id ?? null,
        reversed_by_first_name: reversedByFirstName,
        reversal_note: reversalNote || null,
      })
      .eq('id', productionLogId)

    if (reverseLogError) {
      return Response.json({ error: reverseLogError.message }, { status: 500 })
    }

    return Response.json(
      {
        message: `${(productionLog as any).recipe_name || 'Batch'} reversed successfully.`,
      },
      { status: 200 }
    )
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to reverse production batch.',
      },
      { status: 500 }
    )
  }
}