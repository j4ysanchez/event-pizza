interface SparklineChartProps {
  data: number[]
  width?: number
  height?: number
  color?: string
}

export function SparklineChart({ data, width = 120, height = 32, color = '#60a5fa' }: SparklineChartProps) {
  if (data.length < 2) return null

  const points = data.slice(-60)
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1

  const coords = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * width
      const y = height - ((v - min) / range) * (height * 0.8) - height * 0.1
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={coords}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
