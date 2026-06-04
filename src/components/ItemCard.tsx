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
  const dateStr = dateObj.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })

  // 完整显示摘要，不做截断
  const summaryText = item.summary || ''

  return (
    <article className="group bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="p-4">
        {/* 顶部行：时间 + 来源 + 评分 */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {dateStr}
            </span>
            <span className="text-[11px] text-slate-200">|</span>
            <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded">
              {displaySource}
            </span>
            <CategoryBadge category={item.category} />
          </div>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
            item.score >= 8 ? 'bg-slate-900 text-white' :
            item.score >= 7 ? 'bg-slate-700 text-white' :
            'bg-slate-100 text-slate-400'
          }`}>
            {item.score.toFixed(1)}
          </span>
        </div>

        {/* 标题 - 可点击跳转原文 */}
        {item.url && item.url.trim().length > 0 ? (
          <a
            href={item.url.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[15px] font-semibold text-slate-900 hover:underline mb-2.5 leading-snug"
          >
            {item.title}
          </a>
        ) : (
          <span className="block text-[15px] font-semibold text-slate-900 mb-2.5 leading-snug">
            {item.title}
          </span>
        )}

        {/* 摘要 - 200字左右 */}
        {summaryText && (
          <p className="text-[13px] text-slate-500 leading-relaxed mb-3">
            {summaryText}
          </p>
        )}

        {/* AI 精选解读 */}
        {item.reason && item.score >= 6 && (
          <div className="flex items-start gap-2 mb-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
            <svg className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <div>
              <span className="text-[11px] font-semibold text-slate-700 block mb-0.5">AI 精选解读</span>
              <span className="text-[11px] text-slate-500 leading-relaxed">{item.reason}</span>
            </div>
          </div>
        )}

        {/* 底部：关键词 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.tags && item.tags.length > 0 && item.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-[10px] text-slate-400 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition cursor-default"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}
