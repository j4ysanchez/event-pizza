import { create } from 'zustand'

interface UIStore {
  cartDrawerOpen: boolean
  customizeSheetOpen: boolean
  activePizzaId: string | null
  liveUpdatesPaused: boolean
  causalityToken: string | null

  setCartDrawerOpen: (open: boolean) => void
  setCustomizeSheet: (open: boolean, pizzaId?: string) => void
  setCausalityToken: (token: string) => void
  setLiveUpdatesPaused: (paused: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  cartDrawerOpen: false,
  customizeSheetOpen: false,
  activePizzaId: null,
  liveUpdatesPaused: false,
  causalityToken: null,

  setCartDrawerOpen: (open) => set({ cartDrawerOpen: open }),
  setCustomizeSheet: (open, pizzaId) =>
    set({ customizeSheetOpen: open, activePizzaId: pizzaId ?? null }),
  setCausalityToken: (token) => set({ causalityToken: token }),
  setLiveUpdatesPaused: (paused) => set({ liveUpdatesPaused: paused }),
}))
