import { useRef, useEffect } from 'react'
import { useOperationsStream } from '../../api/sse/useOperationsStream'
import { LiveWidget } from './LiveWidget'

export function ManagerDashboardView() {
  const { metrics, isConnected } = useOperationsStream()

  const queueHistory = useRef<number[]>([])
  const activeHistory = useRef<number[]>([])

  useEffect(() => {
    queueHistory.current = [...queueHistory.current, metrics.queueDepth].slice(-60)
    activeHistory.current = [...activeHistory.current, metrics.activeOrders].slice(-60)
  }, [metrics.queueDepth, metrics.activeOrders])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Manager Dashboard</h1>
        <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-gray-500'}`}>
          {isConnected ? '● Live' : '○ Connecting...'}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <LiveWidget
          label="Active Orders"
          value={metrics.activeOrders}
          sparklineData={[...activeHistory.current]}
          sparklineColor="#34d399"
        />
        <LiveWidget
          label="Avg Prep Time"
          value={`${metrics.avgPrepTimeMinutes.toFixed(1)}m`}
        />
        <LiveWidget
          label="Revenue Today"
          value={`$${metrics.revenueToday.toFixed(2)}`}
        />
        <LiveWidget
          label="Queue Depth"
          value={metrics.queueDepth}
          sparklineData={[...queueHistory.current]}
          sparklineColor="#60a5fa"
        />
      </div>

      {metrics.outOfStockItems.length > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-red-400 mb-2">Out of Stock</h2>
          <ul className="text-sm text-red-300 space-y-1">
            {metrics.outOfStockItems.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
