'use client'

import { useState, useEffect } from 'react'
import { ItemCard } from '@/components/ItemCard'
import { Pagination } from '@/components/Pagination'
import { SearchBar } from '@/components/SearchBar'
import { TimeFilter } from '@/components/TimeFilter'
import { CATEGORY_META } from '@/lib/constants/categories'

interface Item {
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

function groupByDate(items: Item[]): Record<string, Item[]> {
  const groups: Record<string, Item[]> = {}
  for (const item of items) {
    const date = new Date(item.publishedAt).toISOString().split('T')[0]
    if (!groups[date]) groups[date] = []
    groups[date].push(item)
  }
  for (const date in groups) {
    groups[date].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  }
  return groups
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  if (dateStr === today) return '今天'
  if (dateStr === yesterday) return '昨天'

  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('selected')
  const [days, setDays] = useState('')
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchItems()
  }, [mode, days, category, page])

  async function fetchItems() {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('mode', mode)
    params.set('page', page.toString())
    if (days) params.set('days', days)
    if (category) params.set('category', category)
    if (q) params.set('q', q)

    try {
      const res = await fetch(`/api/public/items?${params}`)
      const data = await res.json()
      setItems(data.items || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  function handleSearch() {
    setPage(1)
    fetchItems()
  }

  function handleModeChange(newMode: string) {
    setMode(newMode)
    setPage(1)
  }

  function handleDaysChange(newDays: string) {
    setDays(newDays)
    setPage(1)
  }

  function handleCategoryChange(newCategory: string) {
    setCategory(newCategory)
    setPage(1)
  }

  const groupedItems = groupByDate(items)
  const sortedDates = Object.keys(groupedItems).sort((a, b) => b.localeCompare(a))

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">
              {mode === 'selected' ? '精选资讯' : '全部资讯'}
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
              AI 智能筛选
            </span>
          </div>
          <span className="text-xs text-slate-400">
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })} · 实时更新
          </span>
        </div>
        <SearchBar value={q} onChange={setQ} onSubmit={handleSearch} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 rounded-xl p-1">
            {[
              { key: 'selected', label: '精选' },
              { key: 'all', label: '全部' },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => handleModeChange(m.key)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition ${
                  mode === m.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-200" />

          <TimeFilter value={days} onChange={handleDaysChange} />

          <div className="h-6 w-px bg-slate-200" />

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleCategoryChange('')}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-xl border transition ${
                category === ''
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              全部
            </button>
            {Object.entries(CATEGORY_META).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => handleCategoryChange(key)}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-xl border transition ${
                  category === key
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {meta.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm">暂无数据</p>
          <p className="text-slate-300 text-xs mt-1">尝试切换筛选条件或搜索关键词</p>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedDates.map((date) => (
            <section key={date}>
              {/* 大日期标题 */}
              <div className="flex items-center gap-4 mb-5">
                <div className="px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-bold rounded-full shadow-md shadow-indigo-200/50">
                  {formatDateLabel(date)}
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-indigo-200 to-transparent" />
                <span className="text-xs text-slate-400 font-medium">
                  {groupedItems[date].length} 条资讯
                </span>
              </div>

              {/* 时间轴 */}
              <div className="relative">
                {/* 渐变轴线 */}
                <div className="absolute left-[51px] top-2 bottom-6 w-0.5 bg-gradient-to-b from-indigo-300 via-violet-200 to-transparent rounded-full" />

                <div className="space-y-5">
                  {groupedItems[date].map((item) => (
                    <div key={item.id} className="flex gap-3">
                      {/* 时间 */}
                      <div className="flex-shrink-0 w-11 pt-2 text-right">
                        <span className="text-xs font-mono text-slate-400 tabular-nums">
                          {new Date(item.publishedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* 圆点 */}
                      <div className="flex-shrink-0 w-4 flex justify-center pt-2">
                        <div className="w-3 h-3 rounded-full bg-white border-[2.5px] border-indigo-400 shadow-sm relative z-10" />
                      </div>

                      {/* 卡片 */}
                      <div className="flex-1 min-w-0 -mt-1">
                        <ItemCard item={item} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </div>
  )
}
