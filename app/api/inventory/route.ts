import { createClient } from '@/utils/supabase/server'

function parseNullableNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function parseNullableString(value: unknown): string | null {
  if (value === '' || value === null || value === undefined) return null
  const parsed = String(value).trim()
  return parsed === '' ? null : parsed
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()

    const name = String(body.name ?? '').trim()
    const category = String(body.category ?? '').trim()
    const unit = String(body.unit ?? '').trim()
    const supplierId = parseNullableString(body.supplier_id)
    const quantity = Number(body.quantity ?? 0)
    const reorderLevel = Number(body.reorder_level ?? 0)

    const packageSize = parseNullableNumber(body.package_size)
    const packageSizeUnit = parseNullableString(body.package_size_unit)

    if (!name || !category || !unit || Number.isNaN(quantity)) {
      return Response.json(
        { error: 'Name, category, quantity, and unit are required.' },
        { status: 400 }
      )
    }

    if (packageSize !== null && packageSize < 0) {
      return Response.json(
        { error: 'Package size cannot be negative.' },
        { status: 400 }
      )
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('inventory_items')
      .insert([
        {
          name,
          category,
          current_quantity: quantity,
          unit,
          supplier_id: supplierId,
          reorder_level: reorderLevel,
          package_size: packageSize,
          package_size_unit: packageSizeUnit,
        },
      ])
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    await supabase.from('inventory_logs').insert([
      {
        inventory_item_id: data.id,
        action: 'create',
        previous_quantity: 0,
        change_amount: quantity,
        resulting_quantity: quantity,
        unit,
        note: 'Item created',
        created_by: user?.id ?? null,
      },
    ])

    return Response.json({
      message: `${name} added successfully.`,
      data,
    })
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Something went wrong while adding the item.',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()

    const id = String(body.id ?? '').trim()
    const name = String(body.name ?? '').trim()
    const category = String(body.category ?? '').trim()
    const unit = String(body.unit ?? '').trim()
    const supplierId = parseNullableString(body.supplier_id)
    const reorderLevel = Number(body.reorder_level ?? 0)
    const quantity = Number(body.quantity ?? 0)
    const mode = String(body.mode ?? 'set').trim() as 'set' | 'adjust'

    const packageSize = parseNullableNumber(body.package_size)
    const packageSizeUnit = parseNullableString(body.package_size_unit)

    if (!id || !name || !category || !unit || Number.isNaN(quantity)) {
      return Response.json(
        { error: 'ID, name, category, quantity, and unit are required.' },
        { status: 400 }
      )
    }

    if (packageSize !== null && packageSize < 0) {
      return Response.json(
        { error: 'Package size cannot be negative.' },
        { status: 400 }
      )
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: existing, error: fetchError } = await supabase
      .from('inventory_items')
      .select('id, current_quantity')
      .eq('id', id)
      .single()

    if (fetchError) {
      return Response.json({ error: fetchError.message }, { status: 500 })
    }

    const previousQuantity = Number(existing.current_quantity ?? 0)
    const newQuantity = mode === 'adjust' ? previousQuantity + quantity : quantity

    if (newQuantity < 0) {
      return Response.json(
        { error: 'Resulting quantity cannot be negative.' },
        { status: 400 }
      )
    }

    const changeAmount =
      mode === 'adjust' ? quantity : newQuantity - previousQuantity

    const { data, error } = await supabase
      .from('inventory_items')
      .update({
        name,
        category,
        unit,
        supplier_id: supplierId,
        reorder_level: reorderLevel,
        current_quantity: newQuantity,
        package_size: packageSize,
        package_size_unit: packageSizeUnit,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    await supabase.from('inventory_logs').insert([
      {
        inventory_item_id: id,
        action: mode,
        previous_quantity: previousQuantity,
        change_amount: changeAmount,
        resulting_quantity: newQuantity,
        unit,
        note: mode === 'adjust' ? 'Quantity adjusted' : 'Quantity set',
        created_by: user?.id ?? null,
      },
    ])

    return Response.json({
      message: `${name} updated successfully.`,
      data,
    })
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Something went wrong while updating the item.',
      },
      { status: 500 }
    )
  }
}