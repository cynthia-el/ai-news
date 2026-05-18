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
}

export function ItemCard({ item }: ItemCardProps) {
  const displaySource = item.sourceRef?.name || item.source
  const dateObj = new Date(item.publishedAt)
  const timeStr = dateObj.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const dateStr = dateObj.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })

  // 摘要最多150字
  const summaryText = item.summary
    ? item.summary.slice(0, 150) + (item.summary.length > 150 ? '...' : '')
    : ''

  return (
    <article className="group relative bg-white/70 backdrop-blur-xl rounded-2xl border border-emerald-100/50 shadow-sm shadow-emerald-100/20 hover:shadow-lg hover:shadow-emerald-200/30 hover:border-emerald-200/70 transition-all duration-300 overflow-hidden">
      {/* 左侧装饰条 */}
      <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-gradient-to-b from-emerald-300 to-teal-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="p-5">
        {/* 顶部行：时间 + 来源 + 评分 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-emerald-500/60 tabular-nums">
              {timeStr}
            </span>
            <span className="text-xs text-emerald-100">|</span>
            <span className="text-xs font-medium text-slate-500 bg-emerald-50/70 px-2.5 py-1 rounded-lg border border-emerald-100/50">
              {displaySource}
            </span>
            <CategoryBadge category={item.category} />
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
            item.score >= 8 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
            item.score >= 7 ? 'bg-teal-50 text-teal-600 border border-teal-100' :
            'bg-slate-50 text-slate-400 border border-slate-100'
          }`}>
            {item.score.toFixed(1)}
          </span>
        </div>

        {/* 标题 - 可点击跳转原文 */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[15px] font-bold text-slate-800 group-hover:text-emerald-700 transition-colors mb-3 leading-snug"
        >
          {item.title}
        </a>

        {/* 摘要 - 150字左右 */}
        {summaryText && (
          <p className="text-sm text-slate-500 leading-relaxed mb-3">
            {summaryText}
          </p>
        )}

        {/* AI 精选解读 */}
        {item.reason && item.score >= 7 && (
          <div className="flex items-start gap-2 mb-3 p-3 bg-emerald-50/40 backdrop-blur-sm rounded-xl border border-emerald-100/40">
            <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <div>
              <span className="text-xs font-semibold text-emerald-700 block mb-0.5">AI 精选解读</span>
              <span className="text-xs text-emerald-600/80 leading-relaxed">{item.reason}</span>
            </div>
          </div>
        )}

        {/* 底部：日期 + 关键词 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {item.tags && item.tags.length > 0 && item.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 text-[11px] text-slate-500 bg-emerald-50/50 rounded-lg border border-emerald-100/40 hover:bg-emerald-100/60 hover:text-emerald-700 transition cursor-default"
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
