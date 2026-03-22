import type { ToppingSelection } from '../../types/models'

interface PizzaVisualizerProps {
  toppings: ToppingSelection[]
  size?: number
}

const TOPPING_COLORS: Record<string, string> = {
  pepperoni: '#c0392b',
  sausage: '#8B4513',
  mushroom: '#bdc3c7',
  'bell-pepper': '#27ae60',
  'red-onion': '#8e44ad',
  olive: '#2c3e50',
  jalapeno: '#2ecc71',
  'extra-cheese': '#f1c40f',
}

const DEFAULT_COLOR = '#e67e22'

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = Math.sin(s) * 10000
    return s - Math.floor(s)
  }
}

function hashToppings(toppings: ToppingSelection[]): number {
  const str = toppings
    .map((t) => `${t.toppingId}:${t.placement}`)
    .sort()
    .join(',')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) + 1
}

export function PizzaVisualizer({ toppings, size = 200 }: PizzaVisualizerProps) {
  const seed = hashToppings(toppings)
  const rng = seededRandom(seed)

  const cx = 100
  const cy = 100
  const pizzaR = 85

  const dots: { x: number; y: number; color: string; clipId: string | null }[] = []

  for (const topping of toppings) {
    const color = TOPPING_COLORS[topping.toppingId] ?? DEFAULT_COLOR
    const count = 8
    const clipId =
      topping.placement === 'left'
        ? 'clip-left'
        : topping.placement === 'right'
          ? 'clip-right'
          : null

    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2
      const dist = rng() * (pizzaR - 12)
      dots.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        color,
        clipId,
      })
    }
  }

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label="Pizza preview"
    >
      <defs>
        <clipPath id="clip-left">
          <rect x="0" y="0" width="100" height="200" />
        </clipPath>
        <clipPath id="clip-right">
          <rect x="100" y="0" width="100" height="200" />
        </clipPath>
        <clipPath id="clip-pizza">
          <circle cx={cx} cy={cy} r={pizzaR} />
        </clipPath>
      </defs>

      {/* Pizza base */}
      <circle cx={cx} cy={cy} r={pizzaR} fill="#f5d6a8" stroke="#d4a762" strokeWidth="2" />
      {/* Sauce */}
      <circle cx={cx} cy={cy} r={pizzaR - 6} fill="#e74c3c" opacity="0.3" />
      {/* Cheese */}
      <circle cx={cx} cy={cy} r={pizzaR - 8} fill="#ffeaa7" opacity="0.5" />

      {/* Toppings */}
      {dots.map((dot, i) => (
        <circle
          key={i}
          cx={dot.x}
          cy={dot.y}
          r={4}
          fill={dot.color}
          clipPath={dot.clipId ? `url(#${dot.clipId})` : 'url(#clip-pizza)'}
          opacity={0.85}
        />
      ))}
    </svg>
  )
}
