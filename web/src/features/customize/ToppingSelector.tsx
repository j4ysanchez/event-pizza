import type { ToppingOption, ToppingSelection, ToppingPlacement } from '../../types/models'
import { HalfWholeToggle } from './HalfWholeToggle'

interface ToppingSelectorProps {
  availableToppings: ToppingOption[]
  selected: ToppingSelection[]
  onToggle: (topping: ToppingOption) => void
  onPlacementChange: (toppingId: string, placement: ToppingPlacement) => void
}

const CATEGORY_ORDER = ['meat', 'veggie', 'cheese', 'sauce'] as const
const CATEGORY_LABELS: Record<string, string> = {
  meat: 'Meats',
  veggie: 'Veggies',
  cheese: 'Cheeses',
  sauce: 'Sauces',
}

export function ToppingSelector({
  availableToppings,
  selected,
  onToggle,
  onPlacementChange,
}: ToppingSelectorProps) {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    toppings: availableToppings.filter((t) => t.category === cat),
  })).filter((g) => g.toppings.length > 0)

  const selectedMap = new Map(selected.map((s) => [s.toppingId, s]))

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <div key={group.category}>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {group.label}
          </h4>
          <div className="flex flex-wrap gap-2">
            {group.toppings.map((topping) => {
              const sel = selectedMap.get(topping.id)
              const isSelected = !!sel

              return (
                <div key={topping.id} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onToggle(topping)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      isSelected
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
                    }`}
                  >
                    {topping.name}
                    <span className="ml-1 text-xs opacity-70">
                      +${topping.priceModifier.toFixed(2)}
                    </span>
                  </button>
                  {isSelected && (
                    <HalfWholeToggle
                      placement={sel.placement}
                      onChange={(p) => onPlacementChange(topping.id, p)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
