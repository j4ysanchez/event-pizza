import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import { fetchPizza } from '../../api/menu'
import { useUIStore } from '../../store/uiStore'
import { useCartStore } from '../../store/cartStore'
import { PizzaVisualizer } from '../../components/pizza/PizzaVisualizer'
import { HalfWholeToggle } from './HalfWholeToggle'
import type {
  CustomizationState,
  PizzaSize,
  CrustType,
  SauceType,
  CheeseType,
  ToppingPlacement,
  AmountLevel,
} from '../../types/models'

const SIZE_LABELS: Record<PizzaSize, string> = {
  small: 'Small (10")',
  medium: 'Medium (12")',
  large: 'Large (14")',
  xlarge: 'XL (16")',
}

const CRUST_LABELS: Record<CrustType, string> = {
  thin: 'Thin',
  classic: 'Classic',
  thick: 'Thick',
  stuffed: 'Stuffed (+$2.50)',
}

const SAUCE_LABELS: Record<SauceType, string> = {
  tomato: 'Tomato',
  white: 'White',
  bbq: 'BBQ',
  pesto: 'Pesto',
  none: 'No Sauce',
}

const CHEESE_LABELS: Record<CheeseType, string> = {
  mozzarella: 'Mozzarella',
  cheddar: 'Cheddar',
  provolone: 'Provolone',
  vegan: 'Vegan',
  none: 'No Cheese',
}

const AMOUNT_LABELS: Record<AmountLevel, string> = {
  light: 'Light',
  regular: 'Regular',
  extra: 'Extra',
}

const DEFAULT_CUSTOMIZATION: CustomizationState = {
  size: 'medium',
  crust: 'classic',
  sauce: 'tomato',
  sauceAmount: 'regular',
  cheese: 'mozzarella',
  cheeseAmount: 'regular',
  toppings: [],
  specialInstructions: '',
}

function OptionPills<T extends string>({
  options,
  value,
  labels,
  onChange,
}: {
  options: T[]
  value: T
  labels: Record<T, string>
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            value === opt
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
          }`}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  )
}

function Section({
  title,
  children,
  collapsible = false,
}: {
  title: string
  children: React.ReactNode
  collapsible?: boolean
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-b border-gray-100 py-4">
      <button
        className="flex items-center justify-between w-full mb-3"
        onClick={() => collapsible && setOpen((o) => !o)}
        disabled={!collapsible}
      >
        <h3 className="font-semibold text-sm text-gray-800 uppercase tracking-wide">{title}</h3>
        {collapsible && (open ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
      </button>
      {open && children}
    </div>
  )
}

function calcPrice(customization: CustomizationState, basePrice: number): number {
  const crustUpcharge: Record<CrustType, number> = {
    thin: 0, classic: 0, thick: 1.0, stuffed: 2.5,
  }
  const toppingPrice = customization.toppings.length * 1.25
  return basePrice + crustUpcharge[customization.crust] + toppingPrice
}

export function CustomizePizzaSheet() {
  const customizeSheetOpen = useUIStore((s) => s.customizeSheetOpen)
  const activePizzaId = useUIStore((s) => s.activePizzaId)
  const setCustomizeSheet = useUIStore((s) => s.setCustomizeSheet)
  const addItem = useCartStore((s) => s.addItem)

  const [customization, setCustomization] = useState<CustomizationState>(DEFAULT_CUSTOMIZATION)
  const [quantity, setQuantity] = useState(1)

  const { data: pizza, isLoading } = useQuery({
    queryKey: ['menu', 'pizzas', activePizzaId],
    queryFn: () => fetchPizza(activePizzaId!),
    enabled: !!activePizzaId,
  })

  // Reset state when a new pizza is opened
  useEffect(() => {
    if (customizeSheetOpen) {
      setCustomization(DEFAULT_CUSTOMIZATION)
      setQuantity(1)
    }
  }, [activePizzaId, customizeSheetOpen])

  // Close on Escape
  useEffect(() => {
    if (!customizeSheetOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCustomizeSheet(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [customizeSheetOpen, setCustomizeSheet])

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = customizeSheetOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [customizeSheetOpen])

  function set<K extends keyof CustomizationState>(key: K, value: CustomizationState[K]) {
    setCustomization((prev) => ({ ...prev, [key]: value }))
  }

  function handleToppingChange(toppingId: string, name: string, placement: ToppingPlacement | null) {
    setCustomization((prev) => {
      const without = prev.toppings.filter((t) => t.toppingId !== toppingId)
      if (placement === null) return { ...prev, toppings: without }
      return { ...prev, toppings: [...without, { toppingId, name, placement }] }
    })
  }

  function getToppingPlacement(toppingId: string): ToppingPlacement | null {
    return customization.toppings.find((t) => t.toppingId === toppingId)?.placement ?? null
  }

  function handleAddToCart() {
    if (!pizza) return
    const unitPrice = calcPrice(customization, pizza.pricingRules.sizePrices[customization.size])
    addItem({
      cartItemId: uuidv4(),
      pizzaId: pizza.id,
      name: pizza.name,
      quantity,
      unitPrice,
      customization,
    })
    setCustomizeSheet(false)
  }

  if (!customizeSheetOpen) return null

  const unitPrice = pizza
    ? calcPrice(customization, pizza.pricingRules.sizePrices[customization.size])
    : 0

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={() => setCustomizeSheet(false)}
      />

      {/* Sheet */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white z-50 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="font-bold text-lg">{isLoading ? 'Loading...' : pizza?.name}</h2>
            {pizza && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{pizza.description}</p>
            )}
          </div>
          <button
            onClick={() => setCustomizeSheet(false)}
            className="p-1.5 rounded-full hover:bg-gray-100 ml-2 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Loading...</div>
        ) : pizza ? (
          <>
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              {/* Pizza visualizer */}
              <div className="flex justify-center py-5 bg-orange-50">
                <PizzaVisualizer
                  toppings={customization.toppings}
                  sauce={customization.sauce}
                  cheese={customization.cheese}
                  size={160}
                />
              </div>

              <div className="px-5">
                {/* Size */}
                <Section title="Size">
                  <OptionPills
                    options={pizza.availableSizes}
                    value={customization.size}
                    labels={SIZE_LABELS}
                    onChange={(v) => set('size', v)}
                  />
                </Section>

                {/* Crust */}
                <Section title="Crust">
                  <OptionPills
                    options={pizza.availableCrusts}
                    value={customization.crust}
                    labels={CRUST_LABELS}
                    onChange={(v) => set('crust', v)}
                  />
                </Section>

                {/* Sauce */}
                <Section title="Sauce">
                  <OptionPills
                    options={pizza.availableSauces}
                    value={customization.sauce}
                    labels={SAUCE_LABELS}
                    onChange={(v) => set('sauce', v)}
                  />
                  {customization.sauce !== 'none' && (
                    <div className="mt-3">
                      <OptionPills
                        options={['light', 'regular', 'extra'] as AmountLevel[]}
                        value={customization.sauceAmount}
                        labels={AMOUNT_LABELS}
                        onChange={(v) => set('sauceAmount', v)}
                      />
                    </div>
                  )}
                </Section>

                {/* Cheese */}
                <Section title="Cheese">
                  <OptionPills
                    options={pizza.availableCheeses}
                    value={customization.cheese}
                    labels={CHEESE_LABELS}
                    onChange={(v) => set('cheese', v)}
                  />
                  {customization.cheese !== 'none' && (
                    <div className="mt-3">
                      <OptionPills
                        options={['light', 'regular', 'extra'] as AmountLevel[]}
                        value={customization.cheeseAmount}
                        labels={AMOUNT_LABELS}
                        onChange={(v) => set('cheeseAmount', v)}
                      />
                    </div>
                  )}
                </Section>

                {/* Toppings */}
                <Section title="Toppings" collapsible>
                  <div className="space-y-0.5">
                    {pizza.availableToppings.map((topping) => (
                      <HalfWholeToggle
                        key={topping.id}
                        label={`${topping.name} (+$${topping.priceModifier.toFixed(2)})`}
                        value={getToppingPlacement(topping.id)}
                        onChange={(placement) =>
                          handleToppingChange(topping.id, topping.name, placement)
                        }
                      />
                    ))}
                  </div>
                </Section>

                {/* Special instructions */}
                <Section title="Special Instructions" collapsible>
                  <textarea
                    placeholder="Allergies, extra crispy, light on the sauce..."
                    value={customization.specialInstructions}
                    onChange={(e) => set('specialInstructions', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                  />
                </Section>
              </div>
            </div>

            {/* Footer — quantity + add to cart */}
            <div className="border-t border-gray-200 px-5 py-4 shrink-0">
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-lg font-medium hover:bg-gray-100"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-lg font-medium hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-gray-500">
                  ${unitPrice.toFixed(2)} each
                </span>
              </div>
              <button
                onClick={handleAddToCart}
                className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
              >
                Add to Cart — ${(unitPrice * quantity).toFixed(2)}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </>
  )
}
