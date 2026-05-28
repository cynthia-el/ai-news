'use client'

import { useState, useMemo } from 'react'

interface DailyItem {
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
}

interface DailySectionData {
  id: string
  category: string
  title: string
  description: string | null
  items: DailyItem[]
}

interface DailyData {
  id: string
  date: string
  title: string
  summary: string
  editorNote: string | null
  items: DailyItem[]
  sections: DailySectionData[]
}

interface DateEntry {
  date: string
  title: string
  summary: string
}

const CATEGORY_LABELS: Record<string, string> = {
  policy: '政策监管',
  market: '市场格局',
  capital: '资本财务',
  technology: '技术材料',
  'supply-chain': '产业链',
}

const CATEGORY_COLORS: Record<string, string> = {
  policy: 'text-rose-600 bg-rose-50 border-rose-200',
  market: 'text-blue-600 bg-blue-50 border-blue-200',
  capital: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  technology: 'text-violet-600 bg-violet-50 border-violet-200',
  'supply-chain': 'text-amber-600 bg-amber-50 border-amber-200',
}

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return { y, m, day, week, label: `${y}年${m}月${day}日`, short: `${m}月${day}日` }
}

function groupDatesByMonth(dates: DateEntry[]) {
  const groups: Record<string, DateEntry[]> = {}
  for (const d of dates) {
    const key = d.date.slice(0, 7)
    if (!groups[key]) groups[key] = []
    groups[key].push(d)
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

interface DailyClientProps {
  dailies: DailyData[]
  dates: DateEntry[]
  defaultDate: string
}

export default function DailyClient({ dailies, dates, defaultDate }: DailyClientProps) {
  const [selectedDate, setSelectedDate] = useState(defaultDate)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const daily = useMemo(() => {
    return dailies.find((d) => d.date === selectedDate) || null
  }, [dailies, selectedDate])

  const groupedDates = useMemo(() => groupDatesByMonth(dates), [dates])
  const dateInfo = selectedDate ? formatDateFull(selectedDate) : null
  const sectionNumbers = ['01', '02', '03', '04', '05', '06', '07']

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="flex flex-col md:flex-row">
        {/* ===== 桌面端：左侧日报列表 ===== */}
        <aside className="hidden md:flex w-52 lg:w-60 flex-shrink-0 border-r border-stone-200 bg-white sticky top-0 h-screen overflow-hidden flex-col">
          <div className="p-4 border-b border-stone-100">
            <button
              onClick={() => setSelectedDate(defaultDate)}
              className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition ${
                selectedDate === defaultDate
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              最新一期
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {groupedDates.length === 0 ? (
              <div className="p-4 text-xs text-stone-400 text-center">暂无历史日报</div>
            ) : (
              groupedDates.map(([monthKey, monthDates]) => {
                const [y, m] = monthKey.split('-')
                return (
                  <div key={monthKey} className="border-b border-stone-50 last:border-0">
                    <div className="px-4 py-2 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                      {y}年{m}月
                    </div>
                    {monthDates.map((d) => {
                      const info = formatDateFull(d.date)
                      const isActive = selectedDate === d.date
                      return (
                        <button
                          key={d.date}
                          onClick={() => setSelectedDate(d.date)}
                          className={`w-full text-left px-4 py-2.5 transition border-l-2 ${
                            isActive
                              ? 'border-l-stone-900 bg-stone-50'
                              : 'border-l-transparent hover:bg-stone-50'
                          }`}
                        >
                          <div className={`text-sm font-medium ${isActive ? 'text-stone-900' : 'text-stone-600'}`}>
                            {info.short}
                          </div>
                          <div className="text-[10px] text-stone-400 truncate mt-0.5 leading-tight">
                            {d.title}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        </aside>

        {/* ===== 移动端：顶部日期选择器 ===== */}
        <div className="md:hidden bg-white border-b border-stone-200">
          <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedDate(defaultDate)}
              className={`flex-shrink-0 py-2 px-3 rounded-lg text-sm font-medium transition ${
                selectedDate === defaultDate
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-700'
              }`}
            >
              最新
            </button>
            {dates.slice(0, 30).map((d) => {
              const isActive = selectedDate === d.date
              const info = formatDateFull(d.date)
              return (
                <button
                  key={d.date}
                  onClick={() => setSelectedDate(d.date)}
                  className={`flex-shrink-0 py-2 px-3 rounded-lg text-sm font-medium transition min-w-[3.5rem] text-center ${
                    isActive
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  <div className="text-sm">{info.short}</div>
                  <div className="text-[10px] opacity-70">周{info.week}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ===== 主内容区 ===== */}
        <main className="flex-1 min-w-0">
          <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-10">
            {daily ? (
              <div>
                {/* 报头 */}
                <header className="mb-8 md:mb-10 pb-6 md:pb-8 border-b-2 border-stone-900">
                  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                      <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-stone-900 tracking-tight leading-none mb-3">
                        家居战略资讯日报
                      </h1>
                      {dateInfo && (
                        <p className="text-sm md:text-base text-stone-500 font-medium">
                          {dateInfo.label} · 星期{dateInfo.week}
                        </p>
                      )}
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-stone-400 uppercase tracking-widest mb-1">Daily Briefing</p>
                      <p className="text-sm text-stone-500 font-medium">{daily.items.length} 条战略精选</p>
                    </div>
                  </div>

                  {/* 主编导语 */}
                  {(daily.summary || daily.editorNote) && (
                    <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-stone-200">
                      <p className="text-stone-600 leading-relaxed text-sm md:text-[15px]">
                        {daily.summary}
                      </p>
                      {daily.editorNote && (
                        <p className="mt-2 text-stone-500 text-sm italic">
                          主编点评：{daily.editorNote}
                        </p>
                      )}
                    </div>
                  )}
                </header>

                {/* 内容区 */}
                {daily.sections && daily.sections.length > 0 ? (
                  <div className="space-y-8 md:space-y-12">
                    {daily.sections.map((section, idx) => (
                      <section key={section.id}>
                        <div className="flex items-baseline gap-3 md:gap-4 mb-4 md:mb-5 pb-3 border-b border-stone-200">
                          <span className="text-2xl md:text-3xl font-black text-stone-300 tabular-nums">
                            {sectionNumbers[idx] || String(idx + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <h2 className="text-lg md:text-xl font-bold text-stone-900">{section.title}</h2>
                            {section.description && (
                              <p className="text-sm text-stone-500 mt-0.5">{section.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-5">
                          {section.items.map((item) => (
                            <DailyItemCard key={item.id} item={item} />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : daily.items?.length > 0 ? (
                  <div className="space-y-5">
                    {daily.items.map((item) => (
                      <DailyItemCard key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-stone-400">
                    今日暂无精选条目
                  </div>
                )}

                {/* 报尾 */}
                <footer className="mt-12 md:mt-16 pt-6 md:pt-8 border-t border-stone-200 text-center">
                  <p className="text-xs text-stone-400 uppercase tracking-widest">
                    家居战略资讯日报 · 每日精选行业要闻
                  </p>
                </footer>
              </div>
            ) : (
              <div className="text-center py-32 text-stone-400">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-stone-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <p className="text-stone-400 text-sm">暂无日报数据</p>
                <p className="text-stone-300 text-xs mt-1">日报将在每日同步任务后自动生成</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function DailyItemCard({ item }: { item: DailyItem }) {
  const displaySource = item.sourceRef?.name || item.source
  const categoryClass = CATEGORY_COLORS[item.category] || 'text-stone-600 bg-stone-50 border-stone-200'

  return (
    <article className="group">
      {item.url && item.url.trim().length > 0 ? (
        <a
          href={item.url.trim()}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-base md:text-[17px] font-semibold text-stone-900 hover:text-stone-600 hover:underline mb-2 leading-snug"
        >
          {item.title}
        </a>
      ) : (
        <h3 className="text-base md:text-[17px] font-semibold text-stone-900 mb-2 leading-snug">
          {item.title}
        </h3>
      )}

      {item.summary && (
        <p className="text-[13px] md:text-[14px] text-stone-500 leading-relaxed mb-2">
          {item.summary}
        </p>
      )}

      {item.reason && item.score >= 6 && (
        <p className="text-[13px] text-stone-400 leading-relaxed mb-2 italic">
          <span className="text-stone-500 not-italic font-medium">战略解读：</span>
          {item.reason}
        </p>
      )}

      <div className="flex items-center gap-2 text-[11px] text-stone-400 flex-wrap">
        <span>{displaySource}</span>
        <span>·</span>
        <span className={`px-1.5 py-0.5 rounded border ${categoryClass}`}>
          {CATEGORY_LABELS[item.category] || item.category}
        </span>
        {item.tags.length > 0 && (
          <>
            <span>·</span>
            <span>{item.tags.slice(0, 3).join(' · ')}</span>
          </>
        )}
      </div>
    </article>
  )
}
