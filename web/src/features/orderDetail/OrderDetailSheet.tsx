import { X } from 'lucide-react'
import type { KitchenOrder } from '../../types/models'
import { OrderEventLog } from './OrderEventLog'

interface OrderDetailSheetProps {
  order: KitchenOrder | null
  onClose: () => void
}

export function OrderDetailSheet({ order, onClose }: OrderDetailSheetProps) {
  if (!order) return null

  const events = [
    order.placedAt && { type: 'OrderPlaced', placedAt: order.placedAt },
    order.acceptedAt && { type: 'OrderConfirmed', acceptedAt: order.acceptedAt },
    order.prepStartedAt && { type: 'PrepStarted', prepStartedAt: order.prepStartedAt },
  ].filter(Boolean)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-900 h-full overflow-y-auto p-6 shadow-xl" style={{ animation: 'slideInRight 300ms ease-out' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Order #{order.orderNumber}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Status</h3>
            <span className="text-sm capitalize bg-gray-800 px-2 py-1 rounded">{order.status}</span>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Items</h3>
            <ul className="space-y-1">
              {order.items.map((item, i) => (
                <li key={i} className="text-sm text-gray-300">
                  {item.quantity}x {item.name}
                  {item.notes && <span className="text-gray-500 ml-1">- {item.notes}</span>}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Timestamps</h3>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-500">Placed</dt>
                <dd className="text-gray-300">{new Date(order.placedAt).toLocaleTimeString()}</dd>
              </div>
              {order.acceptedAt && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Accepted</dt>
                  <dd className="text-gray-300">{new Date(order.acceptedAt).toLocaleTimeString()}</dd>
                </div>
              )}
              {order.prepStartedAt && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Prep Started</dt>
                  <dd className="text-gray-300">{new Date(order.prepStartedAt).toLocaleTimeString()}</dd>
                </div>
              )}
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Event Log</h3>
            <OrderEventLog events={events} />
          </div>
        </div>
      </div>
    </div>
  )
}
