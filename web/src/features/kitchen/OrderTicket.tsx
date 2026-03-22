import { useState } from 'react'
import type { KitchenOrder, OrderStatus } from '../../types/models'
import { TimerBadge } from './TimerBadge'

const ADVANCE_LABELS: Partial<Record<OrderStatus, string>> = {
  pending: 'Confirm',
  confirmed: 'Start Prep',
  preparing: 'Oven In',
  baking: 'Ready',
  ready: 'Dispatch',
}

interface OrderTicketProps {
  order: KitchenOrder
  onSelect?: (order: KitchenOrder) => void
}

export function OrderTicket({ order, onSelect }: OrderTicketProps) {
  const [advancing, setAdvancing] = useState(false)
  const label = ADVANCE_LABELS[order.status]

  async function handleAdvance(e: React.MouseEvent) {
    e.stopPropagation()
    if (advancing) return
    setAdvancing(true)
    try {
      await fetch(`/api/orders/${order.orderId}/advance`, { method: 'POST' })
    } catch {
      // SSE will reconcile state; no toast needed for staff app
    } finally {
      setAdvancing(false)
    }
  }

  return (
    <div
      className="bg-gray-800 rounded-lg p-3 space-y-2 cursor-pointer hover:bg-gray-750 transition-colors"
      onClick={() => onSelect?.(order)}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">#{order.orderNumber}</span>
        <TimerBadge placedAt={order.placedAt} />
      </div>
      <ul className="text-sm text-gray-300 space-y-0.5">
        {order.items.map((item, i) => (
          <li key={i}>
            {item.quantity}x {item.name}
            {item.notes && <span className="text-gray-500 text-xs ml-1">({item.notes})</span>}
          </li>
        ))}
      </ul>
      {label && (
        <button
          onClick={handleAdvance}
          disabled={advancing}
          className="w-full mt-1 py-1.5 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {advancing ? 'Updating...' : label}
        </button>
      )}
    </div>
  )
}
