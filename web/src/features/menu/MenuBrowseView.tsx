import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCategories, fetchPizzas } from '../../api/menu'
import { useUIStore } from '../../store/uiStore'
import { useCartStore } from '../../store/cartStore'
import type { PizzaSummary } from '../../types/models'
import { v4 as uuidv4 } from 'uuid'
import { ShoppingCart, Star } from 'lucide-react'

export function MenuBrowseView() {
  const [activeCategoryId, setActiveCategoryId] = useState<string | undefined>(undefined)
  const setCustomizeSheet = useUIStore((s) => s.setCustomizeSheet)
  const addItem = useCartStore((s) => s.addItem)

  const { data: categories = [] } = useQuery({
    queryKey: ['menu', 'categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  })

  const { data: pizzas = [], isLoading } = useQuery({
    queryKey: ['menu', 'pizzas', activeCategoryId],
    queryFn: () => fetchPizzas(activeCategoryId),
    staleTime: 5 * 60_000,
  })

  function handleQuickAdd(pizza: PizzaSummary) {
    addItem({
      cartItemId: uuidv4(),
      pizzaId: pizza.id,
      name: pizza.name,
      quantity: 1,
      unitPrice: pizza.basePrice,
      customization: {
        size: 'medium',
        crust: 'classic',
        sauce: 'tomato',
        sauceAmount: 'regular',
        cheese: 'mozzarella',
        cheeseAmount: 'regular',
        toppings: [],
        specialInstructions: '',
      },
    })
  }

  return (
    <div>
      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        <button
          onClick={() => setActiveCategoryId(undefined)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            activeCategoryId === undefined
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategoryId(cat.id)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeCategoryId === cat.id
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Pizza grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pizzas.map((pizza) => (
            <div key={pizza.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-gray-900">{pizza.name}</h3>
                    {pizza.popularityBadge && (
                      <span className="flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                        <Star size={11} fill="currentColor" /> Popular
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{pizza.description}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900 ml-2 shrink-0">
                  ${pizza.basePrice.toFixed(2)}
                </span>
              </div>
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => setCustomizeSheet(true, pizza.id)}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-red-400 transition-colors"
                >
                  Customize
                </button>
                <button
                  onClick={() => handleQuickAdd(pizza)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <ShoppingCart size={14} /> Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
