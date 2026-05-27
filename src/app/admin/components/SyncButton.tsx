'use client'

import { useState } from 'react'

export default function SyncButton() {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSync() {
    if (status === 'running') return

    setStatus('running')
    setMessage('同步中，请稍候...')

    try {
      const res = await fetch('/api/admin/sync', { method: 'POST' })

      if (res.status === 404) {
        setStatus('error')
        setMessage('当前环境不支持同步，请前往 Vercel 执行')
        return
      }

      const data = await res.json()

      if (res.ok && data.success) {
        setStatus('success')
        setMessage(`同步完成！获取 ${data.fetched} 条，新增 ${data.added} 条，跳过 ${data.skipped} 条，失败 ${data.failed} 条${data.dailyGenerated ? '，已生成日报' : ''}`)
      } else {
        setStatus('error')
        setMessage(data.error || '同步失败')
      }
    } catch (err) {
      setStatus('error')
      setMessage((err as Error).message || '网络错误')
    }
  }

  const statusColors = {
    idle: 'bg-emerald-600 hover:bg-emerald-700',
    running: 'bg-amber-500 cursor-wait',
    success: 'bg-emerald-600 hover:bg-emerald-700',
    error: 'bg-rose-600 hover:bg-rose-700',
  }

  const buttonText = {
    idle: '立即同步',
    running: '同步中...',
    success: '再次同步',
    error: '重试同步',
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleSync}
        disabled={status === 'running'}
        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-colors ${statusColors[status]}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        {buttonText[status]}
      </button>
      {message && (
        <span className={`text-sm ${status === 'error' ? 'text-rose-600' : status === 'success' ? 'text-emerald-600' : 'text-slate-500'}`}>
          {message}
        </span>
      )}
    </div>
  )
}
