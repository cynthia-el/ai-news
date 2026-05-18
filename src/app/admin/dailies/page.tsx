'use client'

import { useState, useEffect } from 'react'
import { Pagination } from '@/components/Pagination'
import { CATEGORY_MAP } from '@/lib/constants/categories'

interface Daily {
  id: string
  date: string
  title: string
  summary: string
  itemIds: string[]
  itemCount: number
  items: { id: string; title: string; score: number; category: string }[]
  createdAt: string
}

export default function DailiesAdminPage() {
  const [dailies, setDailies] = useState<Daily[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchDailies()
  }, [page])

  async function fetchDailies() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/dailies?page=${page}`)
      const data = await res.json()
      setDailies(data.dailies || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  async function deleteDaily(id: string) {
    if (!confirm('确定删除这条日报？')) return
    try {
      const res = await fetch('/api/admin/dailies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      if (res.ok) fetchDailies()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">日报管理</h1>
        <p className="text-sm text-slate-500 mt-1">查看和管理历史日报</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">日期</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">标题</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">条目数</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">创建时间</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </td></tr>
            ) : dailies.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">暂无日报</td></tr>
            ) : (
              dailies.map((daily) => (
                <>
                  <tr key={daily.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4 font-medium text-slate-900">{daily.date}</td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-900">{daily.title}</div>
                      <div className="text-xs text-slate-400 truncate max-w-md mt-0.5">{daily.summary}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                        {daily.itemCount} 条
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs">
                      {new Date(daily.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setExpandedId(expandedId === daily.id ? null : daily.id)}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
                        >
                          {expandedId === daily.id ? '收起' : '详情'}
                        </button>
                        <button
                          onClick={() => deleteDaily(daily.id)}
                          className="text-sm font-medium text-rose-600 hover:text-rose-800 transition"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === daily.id && (
                    <tr>
                      <td colSpan={5} className="px-5 py-5 bg-slate-50/60">
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-slate-700 mb-3">包含资讯</div>
                          {daily.items?.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 text-sm py-1.5">
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white text-slate-600 border border-slate-100">
                                {CATEGORY_MAP[item.category] || item.category}
                              </span>
                              <span className="flex-1 truncate text-slate-700">{item.title}</span>
                              <span className={`text-xs font-semibold ${item.score >= 7 ? 'text-amber-500' : 'text-slate-400'}`}>
                                <span className="inline-block mr-0.5">★</span>{item.score.toFixed(1)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
