import { useParams } from 'react-router-dom'
import { useOrderEventStream } from '../../api/sse/useOrderEventStream'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { StatusTimeline } from './StatusTimeline'
import { ETAWindow } from './ETAWindow'
import { PizzaStatusCard } from './PizzaStatusCard'
import { DriverTrackerMap } from './DriverTrackerMap'

export function OrderTrackingView() {
  const { orderId } = useParams<{ orderId: string }>()
  const { orderViewModel, isConnected, isStale, reconnectAttempt } = useOrderEventStream(
    orderId ?? ''
  )

  return (
    <div className="max-w-lg mx-auto">
      {/* Connection indicator */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">
          Order #{orderViewModel.orderId.slice(-6).toUpperCase()}
        </h1>
        <div className="flex items-center gap-1.5 text-xs">
          {isStale ? (
            <>
              <WifiOff size={14} className="text-yellow-500" />
              <span className="text-yellow-600">
                Reconnecting... (attempt {reconnectAttempt})
              </span>
            </>
          ) : isConnected ? (
            <>
              <Wifi size={14} className="text-green-500" />
              <span className="text-green-600">Live</span>
            </>
          ) : (
            <>
              <Loader2 size={14} className="text-gray-400 animate-spin" />
              <span className="text-gray-500">Connecting...</span>
            </>
          )}
        </div>
      </div>

      {orderViewModel.estimatedReadyAt && (
        <ETAWindow estimatedReadyAt={orderViewModel.estimatedReadyAt} />
      )}

      <StatusTimeline currentStatus={orderViewModel.status} />

      {orderViewModel.fulfillmentType === 'delivery' && orderId && (
        <DriverTrackerMap orderId={orderId} />
      )}

      {orderViewModel.items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold mb-3">Items</h2>
          <div className="space-y-2">
            {orderViewModel.items.map((item) => (
              <PizzaStatusCard key={item.itemId} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
