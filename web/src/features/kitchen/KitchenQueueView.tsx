import { useOperationsStream } from '../../api/sse/useOperationsStream'
import type { KitchenOrder, OrderStatus } from '../../types/models'
import { Clock } from 'lucide-react'

const COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: 'pending', label: 'New' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'preparing', label: 'Prep' },
  { status: 'baking', label: 'Baking' },
  { status: 'ready', label: 'Ready' },
  { status: 'dispatched', label: 'Dispatched' },
]

function ElapsedBadge({ placedAt }: { placedAt: string }) {
  const minutesElapsed = Math.floor((Date.now() - new Date(placedAt).getTime()) / 60_000)
  const color =
    minutesElapsed >= 25 ? 'text-red-400' : minutesElapsed >= 15 ? 'text-amber-400' : 'text-gray-400'

  return (
    <span className={`flex items-center gap-1 text-xs ${color}`}>
      <Clock size={12} />
      {minutesElapsed}m
    </span>
  )
}

function OrderTicket({ order }: { order: KitchenOrder }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">#{order.orderNumber}</span>
        <ElapsedBadge placedAt={order.placedAt} />
      </div>
      <ul className="text-sm text-gray-300 space-y-0.5">
        {order.items.map((item, i) => (
          <li key={i}>{item.quantity}× {item.name}</li>
        ))}
      </ul>
    </div>
  )
}

export function KitchenQueueView() {
  const { kanban, isConnected } = useOperationsStream()

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Kitchen Queue</h1>
        <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-gray-500'}`}>
          {isConnected ? '● Live' : '○ Connecting...'}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map(({ status, label }) => {
          const orders = kanban[status] ?? []
          return (
            <div key={status} className="shrink-0 w-52">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-300">{label}</h2>
                <span className="text-xs bg-gray-700 text-gray-300 rounded-full px-2 py-0.5">
                  {orders.length}
                </span>
              </div>
              <div className="space-y-2">
                {orders.map((order) => (
                  <OrderTicket key={order.orderId} order={order} />
                ))}
                {orders.length === 0 && (
                  <div className="text-xs text-gray-600 text-center py-4">Empty</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
