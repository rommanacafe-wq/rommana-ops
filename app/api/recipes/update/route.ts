import { createClient } from '@/utils/supabase/server'

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()

    const id = String(body.id ?? '').trim()
    const name = String(body.name ?? '').trim()
    const recipeType = String(body.recipe_type ?? '').trim()
    const category = String(body.category ?? '').trim()
    const yieldQuantity = Number(body.yield_quantity ?? 0)
    const yieldUnit = String(body.yield_unit ?? '').trim()
    const shelfLifeDays =
      body.shelf_life_days === '' || body.shelf_life_days === null
        ? null
        : Number(body.shelf_life_days)
    const sellingPrice =
      body.selling_price === '' || body.selling_price === null
        ? null
        : Number(body.selling_price)
    const internalNotes = String(body.internal_notes ?? '').trim()
    const status = String(body.status ?? 'draft').trim()

    const ingredients = Array.isArray(body.ingredients) ? body.ingredients : []
    const steps = Array.isArray(body.steps) ? body.steps : []

    if (!id || !name || !recipeType || !yieldUnit || Number.isNaN(yieldQuantity) || yieldQuantity <= 0) {
      return Response.json(
        { error: 'Recipe ID, name, recipe type, yield quantity, and yield unit are required.' },
        { status: 400 }
      )
    }

    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .update({
        name,
        recipe_type: recipeType,
        category: category || null,
        yield_quantity: yieldQuantity,
        yield_unit: yieldUnit,
        shelf_life_days: shelfLifeDays,
        selling_price: sellingPrice,
        internal_notes: internalNotes,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (recipeError) {
      return Response.json({ error: recipeError.message }, { status: 500 })
    }

    const { error: deleteIngredientsError } = await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('recipe_id', id)

    if (deleteIngredientsError) {
      return Response.json({ error: deleteIngredientsError.message }, { status: 500 })
    }

    const ingredientRows = ingredients
      .filter(
        (item: any) =>
          item.inventory_item_id &&
          item.quantity !== '' &&
          !Number.isNaN(Number(item.quantity)) &&
          String(item.unit ?? '').trim()
      )
      .map((item: any) => ({
        recipe_id: id,
        inventory_item_id: item.inventory_item_id,
        quantity: Number(item.quantity),
        unit: String(item.unit).trim(),
      }))

    if (ingredientRows.length > 0) {
      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientRows)

      if (ingredientsError) {
        return Response.json({ error: ingredientsError.message }, { status: 500 })
      }
    }

    const { error: deleteStepsError } = await supabase
      .from('recipe_steps')
      .delete()
      .eq('recipe_id', id)

    if (deleteStepsError) {
      return Response.json({ error: deleteStepsError.message }, { status: 500 })
    }

    const stepRows = steps
      .filter((step: any) => String(step.instruction ?? '').trim())
      .map((step: any, index: number) => ({
        recipe_id: id,
        step_number: index + 1,
        instruction: String(step.instruction).trim(),
      }))

    if (stepRows.length > 0) {
      const { error: stepsError } = await supabase
        .from('recipe_steps')
        .insert(stepRows)

      if (stepsError) {
        return Response.json({ error: stepsError.message }, { status: 500 })
      }
    }

    return Response.json(
      {
        message: `${name} updated successfully.`,
        data: recipe,
      },
      { status: 200 }
    )
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to update recipe.',
      },
      { status: 500 }
    )
  }
}