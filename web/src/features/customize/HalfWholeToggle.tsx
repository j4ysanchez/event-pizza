import type { ToppingPlacement } from '../../types/models'

interface HalfWholeToggleProps {
  value: ToppingPlacement | null  // null = not selected
  onChange: (value: ToppingPlacement | null) => void
  label: string
}

const OPTIONS: { value: ToppingPlacement | null; label: string; title: string }[] = [
  { value: null, label: '—', title: 'None' },
  { value: 'left', label: '◐', title: 'Left half' },
  { value: 'whole', label: '●', title: 'Whole' },
  { value: 'right', label: '◑', title: 'Right half' },
]

export function HalfWholeToggle({ value, onChange, label }: HalfWholeToggleProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
        {OPTIONS.map((opt) => {
          const isActive = value === opt.value
          return (
            <button
              key={String(opt.value)}
              title={opt.title}
              onClick={() => onChange(opt.value)}
              className={`w-9 h-8 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-red-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
