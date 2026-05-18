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

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800">
              {mode === 'selected' ? '精选资讯' : '全部资讯'}
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
              智能筛选
            </span>
          </div>
          <span className="text-xs text-slate-400">
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })} · 实时更新
          </span>
        </div>
        <SearchBar value={q} onChange={setQ} onSubmit={handleSearch} />
      </div>

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-emerald-100/50 shadow-sm shadow-emerald-100/30 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-emerald-50/60 rounded-xl p-1">
            {[
              { key: 'selected', label: '精选' },
              { key: 'all', label: '全部' },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => handleModeChange(m.key)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition ${
                  mode === m.key
                    ? 'bg-white text-emerald-700 shadow-sm shadow-emerald-100/50'
                    : 'text-slate-500 hover:text-emerald-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-emerald-100" />

          <TimeFilter value={days} onChange={handleDaysChange} />

          <div className="h-6 w-px bg-emerald-100" />

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleCategoryChange('')}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-xl border transition ${
                category === ''
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-emerald-100 hover:border-emerald-300'
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
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-emerald-100 hover:border-emerald-300'
                }`}
              >
                {meta.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content - 卡片式布局 */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm">暂无数据</p>
            <p className="text-slate-300 text-xs mt-1">尝试切换筛选条件或搜索关键词</p>
          </div>
        ) : (
          items.map((item) => <ItemCard key={item.id} item={item} />)
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
