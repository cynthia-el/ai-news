import { CategoryBadge } from './CategoryBadge'

interface ItemCardProps {
  item: {
    id: string
    title: string
    url: string
    source: string
    category: string
    summary?: string | null
    reason?: string | null
    score: number
    publishedAt: string
    tags?: string[]
    sourceRef?: { name: string; type: string } | null
  }
  showReason?: boolean
  compact?: boolean
}

export function ItemCard({ item, showReason = true, compact = false }: ItemCardProps) {
  const displaySource = item.sourceRef?.name || item.source
  const timeText = new Date(item.publishedAt).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <article
      className={`group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition ${compact ? 'p-5' : 'p-6'}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* Meta row */}
          <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
            <CategoryBadge category={item.category} />
            <span className="text-xs text-slate-400">{displaySource}</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-slate-400">{timeText}</span>
            {item.score >= 7 && (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-500">
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {item.score.toFixed(1)}
              </span>
            )}
          </div>

          {/* Title */}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition mb-2 leading-snug"
          >
            {item.title}
          </a>

          {/* AI Recommendation Reason - 突出展示 */}
          {showReason && item.reason && (
            <div className="inline-flex items-start gap-2 px-3.5 py-2.5 text-sm text-indigo-700 bg-indigo-50/70 rounded-xl border border-indigo-100/60 mb-2.5 max-w-full">
              <svg className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <span className="leading-relaxed">{item.reason}</span>
            </div>
          )}

          {/* Summary */}
          {item.summary && !compact && (
            <p className="text-sm text-slate-500 leading-relaxed mb-2 line-clamp-2">
              {item.summary}
            </p>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-100"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* External link icon */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      </div>
    </article>
  )
}
