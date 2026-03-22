import { SparklineChart } from './SparklineChart'

interface LiveWidgetProps {
  label: string
  value: string | number
  sparklineData?: number[]
  sparklineColor?: string
}

export function LiveWidget({ label, value, sparklineData, sparklineColor }: LiveWidgetProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-bold text-white">{value}</p>
        {sparklineData && sparklineData.length >= 2 && (
          <SparklineChart data={sparklineData} color={sparklineColor} />
        )}
      </div>
    </div>
  )
}
