'use client'

import { useState, useEffect } from 'react'
import { Pagination } from '@/components/Pagination'

interface CrawlLog {
  id: string
  startedAt: string
  endedAt: string | null
  status: string
  totalFetched: number
  added: number
  skipped: number
  failed: number
  sources: string[]
  errorMessage: string | null
  dailyGenerated: boolean
}

export default function CrawlLogsPage() {
  const [logs, setLogs] = useState<CrawlLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [status, setStatus] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [page, status])

  async function fetchLogs() {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', page.toString())
    if (status) params.set('status', status)

    try {
      const res = await fetch(`/api/admin/crawl-logs?${params}`)
      const data = await res.json()
      setLogs(data.logs || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatDuration(start: string, end: string | null): string {
    if (!end) return '-'
    const diff = new Date(end).getTime() - new Date(start).getTime()
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    if (minutes > 0) return `${minutes}分${seconds}秒`
    return `${seconds}秒`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">采集历史</h1>
        <p className="text-sm text-slate-500 mt-1">查看每次信息采集的执行记录</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
            className="px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
          >
            <option value="">全部状态</option>
            <option value="success">成功</option>
            <option value="failed">失败</option>
            <option value="running">进行中</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">时间</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">状态</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">采集源</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">获取</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">新增</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">跳过</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">失败</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">耗时</th>
              <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">日报</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-400">暂无采集记录</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition">
                  <td className="px-5 py-4">
                    <div className="text-slate-900 text-sm">{new Date(log.startedAt).toLocaleDateString('zh-CN')}</div>
                    <div className="text-xs text-slate-400">{new Date(log.startedAt).toLocaleTimeString('zh-CN')}</div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {log.sources.slice(0, 3).map((s, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs rounded-lg bg-slate-50 text-slate-600 border border-slate-100">{s}</span>
                      ))}
                      {log.sources.length > 3 && (
                        <span className="text-xs text-slate-400 self-center">+{log.sources.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right font-medium text-slate-700">{log.totalFetched}</td>
                  <td className="px-5 py-4 text-right font-medium text-emerald-600">{log.added}</td>
                  <td className="px-5 py-4 text-right text-slate-400">{log.skipped}</td>
                  <td className="px-5 py-4 text-right font-medium text-rose-500">{log.failed}</td>
                  <td className="px-5 py-4 text-slate-500 text-sm">{formatDuration(log.startedAt, log.endedAt)}</td>
                  <td className="px-5 py-4 text-center">
                    {log.dailyGenerated ? (
                      <svg className="w-5 h-5 text-emerald-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    running: 'bg-blue-50 text-blue-700 border border-blue-100',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    failed: 'bg-rose-50 text-rose-700 border border-rose-100',
  }

  const labels: Record<string, string> = {
    running: '进行中',
    success: '成功',
    failed: '失败',
  }

  return (
    <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${styles[status] || 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
      {labels[status] || status}
    </span>
  )
}
