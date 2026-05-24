import { createClient } from '@/utils/supabase/server'

type SquareCatalogObject = {
  type: string
  id: string
  item_data?: {
    name?: string
    category_id?: string
    categories?: Array<{
      id?: string
      ordinal?: string
    }>
    variations?: Array<{
      id: string
      type: string
      item_variation_data?: {
        name?: string
        item_id?: string
      }
    }>
  }
  category_data?: {
    name?: string
  }
}

type SquareOrder = {
  id: string
  created_at?: string
  updated_at?: string
  closed_at?: string
  state?: string
  note?: string
  customer_id?: string
  line_items?: Array<{
    name?: string
    quantity?: string
    catalog_object_id?: string
    catalog_version?: number
  }>
  fulfillments?: Array<{
    type?: string
    state?: string
    pickup_details?: {
      recipient?: {
        display_name?: string
        email_address?: string
        phone_number?: string
      }
      pickup_at?: string
      note?: string
    }
    delivery_details?: {
      recipient?: {
        display_name?: string
        email_address?: string
        phone_number?: string
      }
      delivered_at?: string
      deliver_at?: string
      note?: string
    }
  }>
}

function getSquareBaseUrl() {
  return process.env.SQUARE_ENVIRONMENT === 'sandbox'
    ? 'https://connect.squareupsandbox.com'
    : 'https://connect.squareup.com'
}

function getStartDate(daysBack = 30) {
  const date = new Date()
  date.setDate(date.getDate() - daysBack)
  return date.toISOString()
}

function getCustomerFromFulfillment(order: SquareOrder) {
  const fulfillment = order.fulfillments?.[0]

  const recipient =
    fulfillment?.pickup_details?.recipient ||
    fulfillment?.delivery_details?.recipient ||
    null

  return {
    name: recipient?.display_name || null,
    email: recipient?.email_address || null,
    phone: recipient?.phone_number || null,
  }
}

function getEventDate(order: SquareOrder) {
  const fulfillment = order.fulfillments?.[0]

  return (
    fulfillment?.pickup_details?.pickup_at ||
    fulfillment?.delivery_details?.deliver_at ||
    fulfillment?.delivery_details?.delivered_at ||
    order.closed_at ||
    order.created_at ||
    null
  )
}

function getFulfillmentType(order: SquareOrder) {
  const type = order.fulfillments?.[0]?.type?.toLowerCase()

  if (type === 'pickup') return 'pickup'
  if (type === 'delivery') return 'delivery'
  if (type === 'shipment') return 'shipment'

  return 'pickup'
}

function normalizeCategoryName(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase()
}

function getItemCategoryId(item: SquareCatalogObject) {
  return (
    item.item_data?.category_id ||
    item.item_data?.categories?.[0]?.id ||
    null
  )
}

async function squareFetch(path: string, options?: RequestInit) {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error('Missing SQUARE_ACCESS_TOKEN in environment variables.')
  }

  const response = await fetch(`${getSquareBaseUrl()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': '2026-01-22',
      ...(options?.headers || {}),
    },
  })

  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      result?.errors?.[0]?.detail ||
      result?.errors?.[0]?.code ||
      `Square request failed: ${path}`

    throw new Error(message)
  }

  return result
}

async function loadSquareCatalogMaps() {
  const categoryIdToName = new Map<string, string>()
  const variationIdToItemId = new Map<string, string>()
  const itemIdToCategoryName = new Map<string, string>()

  let cursor: string | undefined

  do {
    const query = new URLSearchParams({
      types: 'ITEM,CATEGORY',
    })

    if (cursor) query.set('cursor', cursor)

    const result = await squareFetch(`/v2/catalog/list?${query.toString()}`)
    const objects: SquareCatalogObject[] = result.objects || []

    for (const object of objects) {
      if (object.type === 'CATEGORY') {
        categoryIdToName.set(object.id, object.category_data?.name || '')
      }
    }

    for (const object of objects) {
      if (object.type === 'ITEM') {
        const categoryId = getItemCategoryId(object)
        const categoryName = categoryId ? categoryIdToName.get(categoryId) || '' : ''

        if (categoryName) {
          itemIdToCategoryName.set(object.id, categoryName)
        }

        for (const variation of object.item_data?.variations || []) {
          if (variation.id) {
            variationIdToItemId.set(variation.id, object.id)
          }
        }
      }
    }

    cursor = result.cursor
  } while (cursor)

  return {
    categoryIdToName,
    variationIdToItemId,
    itemIdToCategoryName,
  }
}

function orderHasCateringCategory(
  order: SquareOrder,
  catalogMaps: {
    variationIdToItemId: Map<string, string>
    itemIdToCategoryName: Map<string, string>
  }
) {
  return (order.line_items || []).some((lineItem) => {
    const catalogObjectId = lineItem.catalog_object_id

    if (!catalogObjectId) return false

    const itemId =
      catalogMaps.variationIdToItemId.get(catalogObjectId) || catalogObjectId

    const categoryName = catalogMaps.itemIdToCategoryName.get(itemId)

    return normalizeCategoryName(categoryName) === 'catering'
  })
}

async function loadSquareOrders() {
  const locationId = process.env.SQUARE_LOCATION_ID

  if (!locationId) {
    throw new Error('Missing SQUARE_LOCATION_ID in environment variables.')
  }

  const allOrders: SquareOrder[] = []
  let cursor: string | undefined

  do {
    const result = await squareFetch('/v2/orders/search', {
      method: 'POST',
      body: JSON.stringify({
        location_ids: [locationId],
        query: {
          filter: {
            date_time_filter: {
              created_at: {
                start_at: getStartDate(30),
              },
            },
            state_filter: {
              states: ['OPEN', 'COMPLETED'],
            },
          },
          sort: {
            sort_field: 'CREATED_AT',
            sort_order: 'DESC',
          },
        },
        limit: 100,
        cursor,
        return_entries: false,
      }),
    })

    allOrders.push(...(result.orders || []))
    cursor = result.cursor
  } while (cursor)

  return allOrders
}

export async function POST() {
  try {
    const supabase = await createClient()

    const catalogMaps = await loadSquareCatalogMaps()
    const orders = await loadSquareOrders()

    let importedCount = 0
    let skippedCount = 0

    for (const order of orders) {
      if (!order.id) continue

      const isCatering = orderHasCateringCategory(order, catalogMaps)

      if (!isCatering) {
        skippedCount += 1
        continue
      }

      const { data: existingOrder } = await supabase
        .from('catering_orders')
        .select('id')
        .eq('square_order_id', order.id)
        .maybeSingle()

      if (existingOrder) {
        skippedCount += 1
        continue
      }

      const customer = getCustomerFromFulfillment(order)

      const { data: insertedOrder, error: insertOrderError } = await supabase
        .from('catering_orders')
        .insert([
          {
            square_order_id: order.id,
            customer_name: customer.name,
            customer_phone: customer.phone,
            customer_email: customer.email,
            event_date: getEventDate(order),
            fulfillment_type: getFulfillmentType(order),
            status: order.state?.toLowerCase() || 'pending',
            notes:
              order.fulfillments?.[0]?.pickup_details?.note ||
              order.fulfillments?.[0]?.delivery_details?.note ||
              order.note ||
              null,
          },
        ])
        .select('id')
        .single()

      if (insertOrderError) {
        return Response.json(
          { error: insertOrderError.message },
          { status: 500 }
        )
      }

      const cateringLineItems = (order.line_items || []).filter((lineItem) => {
        const catalogObjectId = lineItem.catalog_object_id
        if (!catalogObjectId) return false

        const itemId =
          catalogMaps.variationIdToItemId.get(catalogObjectId) ||
          catalogObjectId

        const categoryName = catalogMaps.itemIdToCategoryName.get(itemId)

        return normalizeCategoryName(categoryName) === 'catering'
      })

      if (cateringLineItems.length > 0) {
        const itemRows = cateringLineItems.map((item) => ({
          catering_order_id: insertedOrder.id,
          item_name: item.name || 'Unnamed item',
          quantity: Number(item.quantity || 1),
          production_status: 'not_started',
          produced_quantity: 0,
        }))

        const { error: insertItemsError } = await supabase
          .from('catering_order_items')
          .insert(itemRows)

        if (insertItemsError) {
          return Response.json(
            { error: insertItemsError.message },
            { status: 500 }
          )
        }
      }

      importedCount += 1
    }

    return Response.json(
      {
        message: `Imported ${importedCount} Square catering order(s). Skipped ${skippedCount}.`,
        imported: importedCount,
        skipped: skippedCount,
      },
      { status: 200 }
    )
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to import Square catering orders.',
      },
      { status: 500 }
    )
  }
}