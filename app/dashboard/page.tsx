import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ProfileMenu from '@/components/ProfileMenu'
import DashboardOpsPanel from '@/components/DashboardOpsPanel'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const { count: inventoryCount } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })

  const { count: recipeCount } = await supabase
    .from('recipes')
    .select('*', { count: 'exact', head: true })

  const { count: draftRecipeCount } = await supabase
    .from('recipes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'draft')

  const now = new Date().toISOString()

  const { count: cateringCount } = await supabase
    .from('catering_orders')
    .select('*', { count: 'exact', head: true })
    .or(`event_date.gte.${now},status.neq.completed`)
    .neq('status', 'cancelled')

  const { data: lowStockItems } = await supabase
    .from('inventory_items')
    .select('id, name, current_quantity, reorder_level, unit')
    .order('current_quantity', { ascending: true })
    .limit(5)

  const filteredLowStockItems =
    lowStockItems?.filter(
      (item) =>
        Number(item.current_quantity) <= Number(item.reorder_level)
    ) || []

  const cardClass =
    'rounded-3xl border border-[#e7ddd1] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md'

  return (
    <main className="min-h-screen bg-[#f7f1e8] p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 rounded-3xl bg-[#620b0b] p-8 text-white shadow-sm">
          <p className="mb-2 text-sm uppercase tracking-[0.2em] text-white/80">
            Rommana Ops
          </p>

          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">
                Salaam, {profile?.first_name || 'team'}
              </h1>
              <p className="mt-2 text-sm text-white/80">
                Signed in as {profile?.role || 'staff'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#620b0b]"
                >
                  Admin
                </Link>
              )}

              <ProfileMenu />
            </div>
          </div>
        </div>

        {/* Announcements + SOPs */}
        <DashboardOpsPanel />

        {/* Main Staff Tools */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-[#2a1a1a]">
            Staff Tools
          </h2>
          <p className="mt-1 text-sm text-[#6b5a52]">
            Daily tools for inventory, production, catering, and waste tracking.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/inventory" className={cardClass}>
            <p className="text-sm uppercase tracking-[0.2em] text-[#620b0b]">
              Inventory
            </p>
            <h3 className="mt-3 text-xl font-semibold text-[#2a1a1a]">
              Inventory
            </h3>
            <p className="mt-2 text-3xl font-semibold text-[#620b0b]">
              {inventoryCount ?? 0}
            </p>
            <p className="mt-1 text-sm text-[#6b5a52]">
              View and manage stock items.
            </p>
          </Link>

          <Link href="/recipes" className={cardClass}>
            <p className="text-sm uppercase tracking-[0.2em] text-[#620b0b]">
              Recipes
            </p>
            <h3 className="mt-3 text-xl font-semibold text-[#2a1a1a]">
              Recipes
            </h3>
            <p className="mt-2 text-3xl font-semibold text-[#620b0b]">
              {recipeCount ?? 0}
            </p>
            <p className="mt-1 text-sm text-[#6b5a52]">
              {draftRecipeCount ?? 0} drafts in progress.
            </p>
          </Link>

          <Link href="/catering-orders" className={cardClass}>
            <p className="text-sm uppercase tracking-[0.2em] text-[#620b0b]">
              Catering
            </p>
            <h3 className="mt-3 text-xl font-semibold text-[#2a1a1a]">
              Catering Orders
            </h3>
            <p className="mt-2 text-3xl font-semibold text-[#620b0b]">
              {cateringCount ?? 0}
            </p>
            <p className="mt-1 text-sm text-[#6b5a52]">
              Upcoming or active catering orders.
            </p>
          </Link>

          <Link href="/production" className={cardClass}>
            <p className="text-sm uppercase tracking-[0.2em] text-[#620b0b]">
              Production
            </p>
            <h3 className="mt-3 text-xl font-semibold text-[#2a1a1a]">
              Production
            </h3>
            <p className="mt-2 text-sm text-[#6b5a52]">
              Produce recipe batches and deduct ingredients.
            </p>
          </Link>

          <Link href="/production-history" className={cardClass}>
            <p className="text-sm uppercase tracking-[0.2em] text-[#620b0b]">
              History
            </p>
            <h3 className="mt-3 text-xl font-semibold text-[#2a1a1a]">
              Production History
            </h3>
            <p className="mt-2 text-sm text-[#6b5a52]">
              Review completed batches and staff activity.
            </p>
          </Link>

          <Link href="/waste-log" className={cardClass}>
            <p className="text-sm uppercase tracking-[0.2em] text-[#620b0b]">
              Waste
            </p>
            <h3 className="mt-3 text-xl font-semibold text-[#2a1a1a]">
              Waste Log
            </h3>
            <p className="mt-2 text-sm text-[#6b5a52]">
              Log wasted items, reasons, and quantities.
            </p>
          </Link>
        </div>

        {/* Low Stock */}
        <div className="mt-8 rounded-3xl border border-[#e7ddd1] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#620b0b]">
                Inventory
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#2a1a1a]">
                Low Stock
              </h2>
            </div>

            <Link
              href="/inventory"
              className="rounded-xl bg-[#620b0b] px-4 py-2 text-sm font-bold text-white"
            >
              View Inventory
            </Link>
          </div>

          {filteredLowStockItems.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-[#faf7f2] p-4 text-sm text-[#6b5a52]">
              No low stock items right now.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {filteredLowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl bg-[#faf7f2] px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-[#2a1a1a]">
                      {item.name}
                    </p>
                    <p className="text-sm text-[#6b5a52]">
                      {item.current_quantity} {item.unit} remaining
                    </p>
                  </div>

                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                    Low Stock
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}