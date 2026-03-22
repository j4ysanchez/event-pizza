import type { ToppingPlacement } from '../../types/models'

interface HalfWholeToggleProps {
  placement: ToppingPlacement
  onChange: (placement: ToppingPlacement) => void
}

const options: { value: ToppingPlacement; label: string }[] = [
  { value: 'left', label: 'L' },
  { value: 'whole', label: 'W' },
  { value: 'right', label: 'R' },
]

export function HalfWholeToggle({ placement, onChange }: HalfWholeToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-xs">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-2 py-0.5 font-medium transition-colors ${
            placement === opt.value
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          title={opt.value === 'left' ? 'Left half' : opt.value === 'right' ? 'Right half' : 'Whole pizza'}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
