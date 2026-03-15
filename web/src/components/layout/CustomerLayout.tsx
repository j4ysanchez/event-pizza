import { Outlet, Link } from 'react-router-dom'
import { ShoppingCart, Pizza } from 'lucide-react'
import { useCartStore } from '../../store/cartStore'
import { useUIStore } from '../../store/uiStore'
import { CartDrawer } from '../cart/CartDrawer'

export function CustomerLayout() {
  const totalItems = useCartStore((s) => s.totalItems())
  const liveUpdatesPaused = useUIStore((s) => s.liveUpdatesPaused)
  const setCartDrawerOpen = useUIStore((s) => s.setCartDrawerOpen)

  return (
    <div className="min-h-screen bg-gray-50">
      {liveUpdatesPaused && (
        <div className="bg-yellow-400 text-yellow-900 text-sm text-center py-1.5 px-4">
          Live updates paused — reconnecting...
        </div>
      )}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/menu" className="flex items-center gap-2 font-bold text-lg text-red-600">
            <Pizza size={22} />
            Pizza Store
          </Link>
          <button
            onClick={() => setCartDrawerOpen(true)}
            className="relative p-2 rounded-full hover:bg-gray-100"
          >
            <ShoppingCart size={22} />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
      <CartDrawer />
    </div>
  )
}
