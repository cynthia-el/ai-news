'use client'

import { useState, useEffect } from 'react'
import { CategoryBadge } from '@/components/CategoryBadge'
import { Pagination } from '@/components/Pagination'
import { CATEGORY_MAP } from '@/lib/constants/categories'

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
  isSelected: boolean
  createdAt: string
}

const CATEGORY_OPTIONS = [
  { value: '', label: '全部分类' },
  { value: 'policy', label: '政策监管' },
  { value: 'market', label: '市场格局' },
  { value: 'capital', label: '资本财务' },
  { value: 'technology', label: '技术材料' },
  { value: 'supply-chain', label: '产业链' },
]

export default function ItemsAdminPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<Item | null>(null)

  useEffect(() => {
    fetchItems()
  }, [page, category, status])

  async function fetchItems() {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', page.toString())
    if (category) params.set('category', category)
    if (status) params.set('status', status)
    if (q) params.set('q', q)

    try {
      const res = await fetch(`/api/admin/items?${params}`)
      const data = await res.json()
      setItems(data.items || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchItems()
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)))
    }
  }

  async function batchUpdate(data: Partial<Item>) {
    if (selectedIds.size === 0) return
    try {
      const res = await fetch('/api/admin/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: 'update',
          data,
        }),
      })
      if (res.ok) {
        setSelectedIds(new Set())
        fetchItems()
      }
    } catch (error) {
      console.error('批量更新失败:', error)
    }
  }

  async function batchDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`确定删除选中的 ${selectedIds.size} 条资讯？`)) return

    try {
      const res = await fetch('/api/admin/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: 'delete',
        }),
      })
      if (res.ok) {
        setSelectedIds(new Set())
        fetchItems()
      }
    } catch (error) {
      console.error('批量删除失败:', error)
    }
  }

  async function saveEdit() {
    if (!editingItem) return
    try {
      const res = await fetch('/api/admin/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [editingItem.id],
          action: 'update',
          data: {
            title: editingItem.title,
            summary: editingItem.summary,
            category: editingItem.category,
            score: editingItem.score,
            isSelected: editingItem.isSelected,
          },
        }),
      })
      if (res.ok) {
        setEditingItem(null)
        fetchItems()
      }
    } catch (error) {
      console.error('保存失败:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">资讯管理</h1>
        <p className="text-sm text-slate-500 mt-1">管理、编辑和审核资讯内容</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1) }}
            className="px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
            className="px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
          >
            <option value="">全部状态</option>
            <option value="selected">已精选</option>
            <option value="unselected">未精选</option>
          </select>

          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="搜索标题/摘要..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 w-48 transition"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition"
            >
              搜索
            </button>
          </form>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-4 flex items-center gap-3">
          <span className="text-sm font-medium text-indigo-700">已选择 {selectedIds.size} 条</span>
          <div className="flex-1" />
          <button onClick={() => batchUpdate({ isSelected: true })} className="px-3.5 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">标记精选</button>
          <button onClick={() => batchUpdate({ isSelected: false })} className="px-3.5 py-1.5 text-sm font-medium bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition">取消精选</button>
          <button onClick={batchDelete} className="px-3.5 py-1.5 text-sm font-medium bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition">删除</button>
          <button onClick={() => setSelectedIds(new Set())} className="px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition">取消选择</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="px-5 py-3.5 text-left w-10">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                />
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">标题</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">分类</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">评分</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">状态</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">时间</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">暂无数据</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition">
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-900 truncate max-w-md">{item.title}</div>
                    {item.summary && (
                      <div className="text-xs text-slate-400 truncate max-w-md mt-0.5">{item.summary}</div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <CategoryBadge category={item.category} />
                  </td>
                  <td className="px-5 py-4">
                    <span className={`font-semibold text-sm ${item.score >= 7 ? 'text-amber-500' : 'text-slate-500'}`}>
                      {item.score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {item.isSelected ? (
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">精选</span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-50 text-slate-500 border border-slate-100">普通</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-400 text-xs">
                    {new Date(item.publishedAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
                    >
                      编辑
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {editingItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto shadow-xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-5">编辑资讯</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">标题</label>
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">摘要</label>
                <textarea
                  value={editingItem.summary || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, summary: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">分类</label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                  >
                    {CATEGORY_OPTIONS.filter((o) => o.value).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">评分 (1-10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.1}
                    value={editingItem.score}
                    onChange={(e) => setEditingItem({ ...editingItem, score: parseFloat(e.target.value) })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="isSelected"
                  checked={editingItem.isSelected}
                  onChange={(e) => setEditingItem({ ...editingItem, isSelected: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                />
                <label htmlFor="isSelected" className="text-sm text-slate-700">标记为精选</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
              >
                取消
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
