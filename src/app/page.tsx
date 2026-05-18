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
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
            AI 智能筛选
          </span>
          <span className="text-xs text-slate-400">{new Date().toLocaleDateString('zh-CN')} · 实时更新</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
          家居建材行业热点
        </h1>
        <p className="text-slate-500 max-w-xl mb-6">
          聚合行业媒体、政策发布、新品动态等资讯，AI 自动分类、评分与精选，助你快速把握市场脉搏
        </p>
        <SearchBar value={q} onChange={setQ} onSubmit={handleSearch} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode toggle */}
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

          {/* Time filter */}
          <TimeFilter value={days} onChange={handleDaysChange} />

          <div className="h-6 w-px bg-slate-200" />

          {/* Categories */}
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

      {/* Content */}
      <div className="grid gap-4">
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
          items.map((item) => <ItemCard key={item.id} item={item} />)
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
