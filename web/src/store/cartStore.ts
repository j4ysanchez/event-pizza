import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '../types/models'

interface CartStore {
  items: CartItem[]
  lastRemovedItem: CartItem | null
  lastRemovedIndex: number | null

  addItem: (item: CartItem) => void
  removeItem: (cartItemId: string) => void
  updateQuantity: (cartItemId: string, qty: number) => void
  undoRemove: () => void
  clearCart: () => void
  totalPrice: () => number
  totalItems: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      lastRemovedItem: null,
      lastRemovedIndex: null,

      addItem: (item) =>
        set((state) => ({ items: [...state.items, item] })),

      removeItem: (cartItemId) =>
        set((state) => {
          const index = state.items.findIndex((i) => i.cartItemId === cartItemId)
          if (index === -1) return state
          const removed = state.items[index]
          return {
            items: state.items.filter((i) => i.cartItemId !== cartItemId),
            lastRemovedItem: removed,
            lastRemovedIndex: index,
          }
        }),

      updateQuantity: (cartItemId, qty) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.cartItemId === cartItemId ? { ...i, quantity: qty } : i
          ),
        })),

      undoRemove: () =>
        set((state) => {
          if (!state.lastRemovedItem || state.lastRemovedIndex === null) return state
          const newItems = [...state.items]
          newItems.splice(state.lastRemovedIndex, 0, state.lastRemovedItem)
          return { items: newItems, lastRemovedItem: null, lastRemovedIndex: null }
        }),

      clearCart: () => set({ items: [], lastRemovedItem: null, lastRemovedIndex: null }),

      totalPrice: () => {
        const { items } = get()
        return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
      },

      totalItems: () => {
        const { items } = get()
        return items.reduce((sum, item) => sum + item.quantity, 0)
      },
    }),
    {
      name: 'pizza-cart-v1',
      version: 1,
    }
  )
)
