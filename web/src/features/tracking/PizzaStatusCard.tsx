import type { OrderItemViewModel } from '../../types/models'

interface PizzaStatusCardProps {
  item: OrderItemViewModel
}

const STATION_COLORS: Record<string, string> = {
  prep: 'bg-blue-100 text-blue-700',
  oven: 'bg-orange-100 text-orange-700',
  quality: 'bg-purple-100 text-purple-700',
}

export function PizzaStatusCard({ item }: PizzaStatusCardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">
          {item.quantity}&times; {item.name}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {item.kitchenStation && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              STATION_COLORS[item.kitchenStation] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {item.kitchenStation}
          </span>
        )}
        {item.status && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
            {item.status}
          </span>
        )}
      </div>
    </div>
  )
}
