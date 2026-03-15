import { useOperationsStream } from '../../api/sse/useOperationsStream'

interface MetricCardProps {
  label: string
  value: string | number
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

export function ManagerDashboardView() {
  const { metrics, isConnected } = useOperationsStream()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Manager Dashboard</h1>
        <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-gray-500'}`}>
          {isConnected ? '● Live' : '○ Connecting...'}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Active Orders" value={metrics.activeOrders} />
        <MetricCard label="Avg Prep Time" value={`${metrics.avgPrepTimeMinutes.toFixed(1)}m`} />
        <MetricCard label="Revenue Today" value={`$${metrics.revenueToday.toFixed(2)}`} />
        <MetricCard label="Queue Depth" value={metrics.queueDepth} />
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
