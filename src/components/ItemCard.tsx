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

  // 摘要最多150字
  const summaryText = item.summary
    ? item.summary.slice(0, 150) + (item.summary.length > 150 ? '...' : '')
    : ''

  return (
    <article className="group bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/40 transition-all duration-300">
      <div className="p-5">
        {/* 顶部：来源 + 分类 + 评分 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
              {displaySource}
            </span>
            <CategoryBadge category={item.category} />
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
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
          className="block text-[15px] font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-3 leading-snug"
        >
          {item.title}
        </a>

        {/* 摘要 - 最多150字 */}
        {summaryText && (
          <p className="text-sm text-slate-500 leading-relaxed mb-3">
            {summaryText}
          </p>
        )}

        {/* AI 精选推荐理由 */}
        {item.reason && item.score >= 7 && (
          <div className="flex items-start gap-2 mb-3 p-3 bg-amber-50/60 rounded-xl border border-amber-100/60">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <div>
              <span className="text-xs font-semibold text-amber-700 block mb-0.5">AI 精选推荐</span>
              <span className="text-xs text-amber-600/80 leading-relaxed">{item.reason}</span>
            </div>
          </div>
        )}

        {/* 底部：关键词标签 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.tags && item.tags.length > 0 && item.tags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 text-[11px] text-slate-500 bg-slate-50 rounded-lg border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition cursor-default"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}
