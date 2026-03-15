import type { ToppingSelection, SauceType, CheeseType } from '../../types/models'

interface PizzaVisualizerProps {
  toppings: ToppingSelection[]
  sauce: SauceType
  cheese: CheeseType
  size?: number
}

const SAUCE_COLORS: Record<SauceType, string> = {
  tomato: '#c0392b',
  white: '#f5f0e8',
  bbq: '#6b3a2a',
  pesto: '#4a7c59',
  none: '#e8d5b0',
}

const CHEESE_COLORS: Record<CheeseType, string> = {
  mozzarella: '#f9e4b7',
  cheddar: '#e8a020',
  provolone: '#f0d080',
  vegan: '#d4e8b0',
  none: 'transparent',
}

// Seeded pseudo-random number generator (mulberry32)
function seededRng(seed: number) {
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface ToppingDot {
  cx: number
  cy: number
  r: number
  color: string
  placement: 'whole' | 'left' | 'right'
}

const TOPPING_COLORS: Record<string, string> = {
  pepperoni: '#b03020',
  sausage: '#8b5e3c',
  mushroom: '#7a6040',
  'bell-pepper': '#2e8b2e',
  'red-onion': '#9b3090',
  olive: '#3a3a3a',
  jalapeno: '#2e8b2e',
  'extra-cheese': '#f0c840',
}

function generateDots(toppingId: string, placement: 'whole' | 'left' | 'right', count = 8): ToppingDot[] {
  const rng = seededRng(toppingId.split('').reduce((a, c) => a + c.charCodeAt(0), 0))
  const color = TOPPING_COLORS[toppingId] ?? '#888'
  const dots: ToppingDot[] = []

  for (let i = 0; i < count; i++) {
    let cx: number, cy: number
    // Rejection sample within pizza circle (radius ~80 from center 100,100)
    let attempts = 0
    do {
      const angle = rng() * Math.PI * 2
      const r = Math.sqrt(rng()) * 78
      cx = 100 + r * Math.cos(angle)
      cy = 100 + r * Math.sin(angle)
      attempts++
    } while (attempts < 20 && (Math.hypot(cx - 100, cy - 100) > 78))

    // Filter by placement half
    if (placement === 'left' && cx > 100) continue
    if (placement === 'right' && cx < 100) continue

    dots.push({ cx, cy, r: 5 + rng() * 3, color, placement })
  }
  return dots
}

export function PizzaVisualizer({ toppings, sauce, cheese, size = 200 }: PizzaVisualizerProps) {
  const sauceColor = SAUCE_COLORS[sauce] ?? SAUCE_COLORS.tomato
  const cheeseColor = CHEESE_COLORS[cheese] ?? 'transparent'

  const allDots = toppings.flatMap((t) =>
    generateDots(t.toppingId, t.placement, t.placement === 'whole' ? 8 : 5)
  )

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      aria-label="Pizza preview"
      className="select-none"
    >
      <defs>
        {/* Half-topping clip paths */}
        <clipPath id="clip-left">
          <rect x="0" y="0" width="100" height="200" />
        </clipPath>
        <clipPath id="clip-right">
          <rect x="100" y="0" width="100" height="200" />
        </clipPath>
        <clipPath id="clip-pizza">
          <circle cx="100" cy="100" r="90" />
        </clipPath>
      </defs>

      {/* Crust */}
      <circle cx="100" cy="100" r="90" fill="#d4a860" />

      {/* Sauce */}
      <circle cx="100" cy="100" r="80" fill={sauceColor} />

      {/* Cheese */}
      {cheese !== 'none' && (
        <circle cx="100" cy="100" r="78" fill={cheeseColor} opacity="0.7" />
      )}

      {/* Toppings */}
      <g clipPath="url(#clip-pizza)">
        {allDots.map((dot, i) => (
          <circle
            key={i}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r}
            fill={dot.color}
            clipPath={
              dot.placement === 'left'
                ? 'url(#clip-left)'
                : dot.placement === 'right'
                ? 'url(#clip-right)'
                : undefined
            }
          />
        ))}
      </g>

      {/* Half-divider line (shown when any topping is half) */}
      {toppings.some((t) => t.placement !== 'whole') && (
        <line
          x1="100" y1="10" x2="100" y2="190"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
      )}

      {/* Crust ring highlight */}
      <circle cx="100" cy="100" r="90" fill="none" stroke="#b88040" strokeWidth="2" />
    </svg>
  )
}
