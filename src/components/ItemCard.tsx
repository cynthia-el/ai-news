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
  const dateObj = new Date(item.publishedAt)
  const timeStr = dateObj.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const dateStr = dateObj.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })

  return (
    <article className="group bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition">
      <div className={`${compact ? 'p-4' : 'p-5'}`}>
        {/* 顶部行：时间 + 来源 + 评分 */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 时间 */}
            <span className="text-xs font-mono text-slate-400 tabular-nums">{timeStr}</span>
            <span className="text-xs text-slate-200">|</span>
            {/* 来源 */}
            <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
              {displaySource}
            </span>
            <span className="text-xs text-slate-200">|</span>
            {/* 分类 */}
            <CategoryBadge category={item.category} />
          </div>
          {/* 评分 */}
          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
            item.score >= 8 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
            item.score >= 7 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
            'bg-slate-50 text-slate-400 border border-slate-100'
          }`}>
            {item.score.toFixed(1)}
          </span>
        </div>

        {/* 标题 - 可点击跳转 */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[15px] font-semibold text-slate-900 group-hover:text-indigo-600 transition mb-2 leading-snug"
        >
          {item.title}
        </a>

        {/* AI 推荐理由 */}
        {showReason && item.reason && item.score >= 7 && (
          <div className="flex items-start gap-1.5 mb-2 text-xs text-slate-500">
            <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="leading-relaxed">{item.reason}</span>
          </div>
        )}

        {/* 摘要 */}
        {item.summary && !compact && (
          <p className="text-sm text-slate-500 leading-relaxed mb-2.5 line-clamp-2">
            {item.summary}
          </p>
        )}

        {/* 底部：日期 + 关键词 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {item.tags && item.tags.length > 0 && item.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[11px] text-slate-400 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition cursor-default"
              >
                {tag}
              </span>
            ))}
          </div>
          <span className="text-[11px] text-slate-300 flex-shrink-0">{dateStr}</span>
        </div>
      </div>
    </article>
  )
}
