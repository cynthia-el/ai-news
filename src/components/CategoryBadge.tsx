import { CATEGORY_META } from '@/lib/constants/categories'

export function CategoryBadge({ category }: { category: string }) {
  const meta = CATEGORY_META[category]
  if (!meta) return (
    <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600">
      {category}
    </span>
  )
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${meta.bg} ${meta.color}`}>
      {meta.label}
    </span>
  )
}
