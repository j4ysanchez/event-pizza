import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { CustomerLayout } from '../components/layout/CustomerLayout'
import { StaffLayout } from '../components/layout/StaffLayout'

// Customer views (lazy-loaded)
const MenuBrowseView = lazy(() =>
  import('../features/menu/MenuBrowseView').then((m) => ({ default: m.MenuBrowseView }))
)
const CheckoutView = lazy(() =>
  import('../features/checkout/CheckoutView').then((m) => ({ default: m.CheckoutView }))
)
const OrderTrackingView = lazy(() =>
  import('../features/tracking/OrderTrackingView').then((m) => ({ default: m.OrderTrackingView }))
)

// Staff views (lazy-loaded)
const KitchenQueueView = lazy(() =>
  import('../features/kitchen/KitchenQueueView').then((m) => ({ default: m.KitchenQueueView }))
)
const ManagerDashboardView = lazy(() =>
  import('../features/manager/ManagerDashboardView').then((m) => ({ default: m.ManagerDashboardView }))
)

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      Loading...
    </div>
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/menu" replace />} />

        {/* Customer routes */}
        <Route element={<CustomerLayout />}>
          <Route path="/menu" element={<MenuBrowseView />} />
          <Route path="/checkout" element={<CheckoutView />} />
          <Route path="/order/:orderId/track" element={<OrderTrackingView />} />
        </Route>

        {/* Staff routes */}
        <Route path="/staff" element={<StaffLayout />}>
          <Route index element={<Navigate to="/staff/kitchen" replace />} />
          <Route path="kitchen" element={<KitchenQueueView />} />
          <Route path="manager" element={<ManagerDashboardView />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
