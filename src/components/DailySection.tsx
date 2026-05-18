import { ItemCard } from './ItemCard'
import { CATEGORY_META } from '@/lib/constants/categories'

interface DailySectionProps {
  section: {
    id: string
    category: string
    title: string
    description?: string | null
    items: {
      id: string
      title: string
      url: string
      source: string
      category: string
      summary: string | null
      reason: string | null
      score: number
      publishedAt: string
      tags: string[]
      sourceRef: { name: string; type: string } | null
    }[]
  }
}

export function DailySection({ section }: DailySectionProps) {
  const meta = CATEGORY_META[section.category]

  return (
    <div className="mb-8">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-1.5 h-6 rounded-full ${
            meta?.bg?.replace('bg-', 'bg-') || 'bg-slate-400'
          }`}
          style={{ backgroundColor: meta ? undefined : '#94a3b8' }}
        />
        <div>
          <h3 className="text-lg font-bold text-slate-900">{section.title}</h3>
          {section.description && (
            <p className="text-sm text-slate-500 mt-0.5">{section.description}</p>
          )}
        </div>
        <span className="ml-auto px-2.5 py-1 text-xs font-medium rounded-full bg-slate-50 text-slate-500 border border-slate-100">
          {section.items.length} 条
        </span>
      </div>

      {/* Items */}
      <div className="grid gap-3">
        {section.items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
