import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Trash2, ShoppingCart } from 'lucide-react'
import { useCartStore } from '../../store/cartStore'
import { useUIStore } from '../../store/uiStore'
import { UndoSnackbar } from './UndoSnackbar'

export function CartDrawer() {
  const navigate = useNavigate()
  const isOpen = useUIStore((s) => s.cartDrawerOpen)
  const setCartDrawerOpen = useUIStore((s) => s.setCartDrawerOpen)
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const totalPrice = useCartStore((s) => s.totalPrice())
  const lastRemovedItem = useCartStore((s) => s.lastRemovedItem)
  const undoRemove = useCartStore((s) => s.undoRemove)

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCartDrawerOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, setCartDrawerOpen])

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleRemove(cartItemId: string) {
    removeItem(cartItemId)
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    undoTimerRef.current = setTimeout(() => {
      useCartStore.setState({ lastRemovedItem: null, lastRemovedIndex: null })
    }, 3000)
  }

  function handleUndo() {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    undoRemove()
  }

  function handleCheckout() {
    setCartDrawerOpen(false)
    navigate('/checkout')
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={() => setCartDrawerOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-lg">Your Cart</h2>
          <button
            onClick={() => setCartDrawerOpen(false)}
            className="p-1.5 rounded-full hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
            <ShoppingCart size={40} strokeWidth={1.2} />
            <p className="text-sm">Your cart is empty</p>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {items.map((item) => (
                <li key={item.cartItemId} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 capitalize mt-0.5">
                      {item.customization.size} · {item.customization.crust} crust
                    </p>
                    {item.customization.toppings.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        + {item.customization.toppings.map((t) => t.name).join(', ')}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-gray-800 mt-1">
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(item.cartItemId)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>

            <div className="border-t border-gray-200 px-4 py-4 space-y-3">
              <div className="flex justify-between font-semibold text-gray-900">
                <span>Total</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
              >
                Checkout
              </button>
            </div>
          </>
        )}
      </div>

      {/* Undo snackbar */}
      {lastRemovedItem && (
        <UndoSnackbar itemName={lastRemovedItem.name} onUndo={handleUndo} />
      )}
    </>
  )
}
