const TIME_OPTIONS = [
  { value: '', label: '全部时间' },
  { value: '1', label: '今天' },
  { value: '3', label: '近3天' },
  { value: '7', label: '近7天' },
  { value: '30', label: '近30天' },
]

interface TimeFilterProps {
  value: string
  onChange: (value: string) => void
}

export function TimeFilter({ value, onChange }: TimeFilterProps) {
  return (
    <div className="flex items-center bg-slate-100 rounded-xl p-1">
      {TIME_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition ${
            value === opt.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
