'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface SyncStatus {
  status: string
  totalFetched: number
  added: number
  skipped: number
  failed: number
  dailyGenerated: boolean
  errorMessage?: string
}

export default function SyncButton() {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState<SyncStatus | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const statusRef = useRef(status)
  statusRef.current = status

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sync/status', { cache: 'no-store' })
      if (!res.ok) return

      const data = await res.json()
      if (data.error) return

      setProgress(data)

      if (data.status === 'success') {
        setStatus('success')
        setMessage(
          `同步完成！获取 ${data.totalFetched} 条，新增 ${data.added} 条，跳过 ${data.skipped} 条，失败 ${data.failed} 条${data.dailyGenerated ? '，已生成日报' : ''}`
        )
        clearPoll()
      } else if (data.status === 'failed') {
        setStatus('error')
        setMessage(data.errorMessage || '同步失败')
        clearPoll()
      } else if (data.status === 'running') {
        setStatus('running')
        setMessage('同步进行中，请稍候...')
      }
    } catch {
      // ignore poll errors
    }
  }, [clearPoll])

  useEffect(() => {
    return () => clearPoll()
  }, [clearPoll])

  async function handleSync() {
    if (statusRef.current === 'running') return

    clearPoll()
    setStatus('running')
    setMessage('正在启动同步任务...')
    setProgress(null)

    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        cache: 'no-store',
      })

      if (res.status === 404) {
        setStatus('error')
        setMessage('当前环境不支持同步，请前往 Vercel 执行')
        return
      }

      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setMessage(data.error || '启动同步失败')
        return
      }

      // Start polling
      fetchStatus() // immediate first check
      pollRef.current = setInterval(fetchStatus, 4000)

      // Safety timeout: stop polling after 10 minutes
      setTimeout(() => {
        clearPoll()
        if (statusRef.current === 'running') {
          setStatus('error')
          setMessage('同步超时，请刷新页面查看最新状态')
        }
      }, 600000)
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <button
          onClick={handleSync}
          disabled={status === 'running'}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-colors ${statusColors[status]}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          {buttonText[status]}
        </button>
        {message && (
          <span
            className={`text-sm ${status === 'error' ? 'text-rose-600' : status === 'success' ? 'text-emerald-600' : 'text-slate-500'}`}
          >
            {message}
          </span>
        )}
      </div>
      {status === 'running' && progress && progress.totalFetched > 0 && (
        <div className="text-xs text-slate-400">
          已获取 {progress.totalFetched} 条 · 新增 {progress.added} 条 · 跳过 {progress.skipped} 条
        </div>
      )}
    </div>
  )
}
