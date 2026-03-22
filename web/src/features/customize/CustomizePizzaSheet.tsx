import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useUIStore } from '../../store/uiStore'
import { useCartStore } from '../../store/cartStore'
import { fetchPizza } from '../../api/menu'
import { ToppingSelector } from './ToppingSelector'
import { PizzaVisualizer } from '../../components/pizza/PizzaVisualizer'
import type {
  PizzaSize,
  CrustType,
  SauceType,
  ToppingSelection,
  ToppingPlacement,
  ToppingOption,
  PizzaDetail,
} from '../../types/models'

function calcPrice(detail: PizzaDetail, size: PizzaSize, crust: CrustType, toppings: ToppingSelection[]): number {
  const base = detail.pricingRules.sizePrices[size]
  const crustUp = detail.pricingRules.crustUpcharge[crust]
  const toppingCost = toppings.reduce((sum, t) => {
    const opt = detail.availableToppings.find((o) => o.id === t.toppingId)
    return sum + (opt?.priceModifier ?? detail.pricingRules.toppingPrice)
  }, 0)
  return base + crustUp + toppingCost
}

interface PillGroupProps<T extends string> {
  options: T[]
  value: T
  onChange: (v: T) => void
  labels?: Record<string, string>
}

function PillGroup<T extends string>({ options, value, onChange, labels }: PillGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
            value === opt
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
          }`}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  )
}

export function CustomizePizzaSheet() {
  const isOpen = useUIStore((s) => s.customizeSheetOpen)
  const activePizzaId = useUIStore((s) => s.activePizzaId)
  const setCustomizeSheet = useUIStore((s) => s.setCustomizeSheet)
  const addItem = useCartStore((s) => s.addItem)

  const [size, setSize] = useState<PizzaSize>('medium')
  const [crust, setCrust] = useState<CrustType>('classic')
  const [sauce, setSauce] = useState<SauceType>('tomato')
  const [toppings, setToppings] = useState<ToppingSelection[]>([])

  const { data: detail, isLoading } = useQuery({
    queryKey: ['menu', 'pizza', activePizzaId],
    queryFn: () => fetchPizza(activePizzaId!),
    enabled: !!activePizzaId && isOpen,
    staleTime: 5 * 60_000,
  })

  // Reset local state when pizza changes
  useEffect(() => {
    if (activePizzaId) {
      setSize('medium')
      setCrust('classic')
      setSauce('tomato')
      setToppings([])
    }
  }, [activePizzaId])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCustomizeSheet(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, setCustomizeSheet])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const price = useMemo(
    () => (detail ? calcPrice(detail, size, crust, toppings) : 0),
    [detail, size, crust, toppings]
  )

  function handleToggleTopping(topping: ToppingOption) {
    setToppings((prev) => {
      const exists = prev.find((t) => t.toppingId === topping.id)
      if (exists) return prev.filter((t) => t.toppingId !== topping.id)
      return [...prev, { toppingId: topping.id, name: topping.name, placement: 'whole' as ToppingPlacement }]
    })
  }

  function handlePlacementChange(toppingId: string, placement: ToppingPlacement) {
    setToppings((prev) =>
      prev.map((t) => (t.toppingId === toppingId ? { ...t, placement } : t))
    )
  }

  function handleAddToCart() {
    if (!detail) return
    addItem({
      cartItemId: uuidv4(),
      pizzaId: detail.id,
      name: detail.name,
      quantity: 1,
      unitPrice: price,
      customization: {
        size,
        crust,
        sauce,
        sauceAmount: 'regular',
        cheese: 'mozzarella',
        cheeseAmount: 'regular',
        toppings,
        specialInstructions: '',
      },
    })
    setCustomizeSheet(false)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 animate-[fadeIn_300ms_ease-out]"
        onClick={() => setCustomizeSheet(false)}
      />

      {/* Sheet — slides up from bottom */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col animate-[slideUp_300ms_ease-out]">
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <h2 className="font-semibold text-lg">
            {isLoading ? 'Loading...' : detail?.name ?? 'Customize Pizza'}
          </h2>
          <button
            onClick={() => setCustomizeSheet(false)}
            className="p-1.5 rounded-full hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading || !detail ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {/* Pizza preview */}
              <div className="flex justify-center">
                <PizzaVisualizer toppings={toppings} size={160} />
              </div>

              {/* Size */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Size</h3>
                <PillGroup
                  options={detail.availableSizes}
                  value={size}
                  onChange={setSize}
                  labels={{
                    small: `Small $${detail.pricingRules.sizePrices.small.toFixed(2)}`,
                    medium: `Medium $${detail.pricingRules.sizePrices.medium.toFixed(2)}`,
                    large: `Large $${detail.pricingRules.sizePrices.large.toFixed(2)}`,
                    xlarge: `XL $${detail.pricingRules.sizePrices.xlarge.toFixed(2)}`,
                  }}
                />
              </div>

              {/* Crust */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Crust</h3>
                <PillGroup options={detail.availableCrusts} value={crust} onChange={setCrust} />
              </div>

              {/* Sauce */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Sauce</h3>
                <PillGroup options={detail.availableSauces} value={sauce} onChange={setSauce} />
              </div>

              {/* Toppings */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Toppings</h3>
                <ToppingSelector
                  availableToppings={detail.availableToppings}
                  selected={toppings}
                  onToggle={handleToggleTopping}
                  onPlacementChange={handlePlacementChange}
                />
              </div>
            </div>

            {/* Footer with price and add button */}
            <div className="border-t border-gray-200 px-4 py-4 shrink-0">
              <button
                onClick={handleAddToCart}
                className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                Add to Cart — ${price.toFixed(2)}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
