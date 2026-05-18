'use client'

import { useState, useEffect } from 'react'
import { ItemCard } from '@/components/ItemCard'
import { DailySection } from '@/components/DailySection'

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

export default function DailyPage() {
  const [daily, setDaily] = useState<DailyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dates, setDates] = useState<{ date: string; title: string }[]>([])
  const [selectedDate, setSelectedDate] = useState('')

  useEffect(() => {
    fetchToday()
    fetchDates()
  }, [])

  async function fetchToday() {
    setLoading(true)
    try {
      const res = await fetch('/api/public/daily')
      const data = await res.json()
      setDaily(data)
      setSelectedDate(data.date || '')
    } catch {
      console.error('获取日报失败')
    } finally {
      setLoading(false)
    }
  }

  async function fetchDates() {
    try {
      const res = await fetch('/api/public/dailies?take=30')
      const data = await res.json()
      setDates(data.dailies || [])
    } catch {
      console.error('获取日期列表失败')
    }
  }

  async function fetchDailyByDate(date: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/public/daily/${date}`)
      const data = await res.json()
      setDaily(data)
      setSelectedDate(date)
    } catch {
      console.error('获取日报失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
            每日精选
          </span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
          行业日报
        </h1>
        <p className="text-slate-500">
          AI 每日精选行业资讯汇总，快速把握当日要点
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar dates */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">历史日报</h3>
            </div>
            <div className="max-h-[640px] overflow-y-auto">
              {dates.map((d) => (
                <button
                  key={d.date}
                  onClick={() => fetchDailyByDate(d.date)}
                  className={`w-full text-left px-5 py-3.5 border-b border-slate-50 last:border-0 text-sm transition ${
                    selectedDate === d.date
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-medium">{d.date}</div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">
                    {d.title}
                  </div>
                </button>
              ))}
              {dates.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-slate-400">
                  暂无历史日报
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : daily ? (
            <div className="space-y-5">
              {/* Daily header */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                    日报
                  </span>
                  <span className="text-sm text-slate-400">{daily.date}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">
                  {daily.title}
                </h2>
                <p className="text-slate-500 leading-relaxed mb-4">{daily.summary}</p>
                {daily.editorNote && (
                  <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50/60 rounded-xl border border-amber-100/60">
                    <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                    </svg>
                    <span className="text-sm text-amber-800 leading-relaxed">{daily.editorNote}</span>
                  </div>
                )}
              </div>

              {/* Sections */}
              {daily.sections && daily.sections.length > 0 ? (
                daily.sections.map((section) => (
                  <DailySection key={section.id} section={section} />
                ))
              ) : daily.items?.length > 0 ? (
                <div className="grid gap-3">
                  {daily.items.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
                  今日暂无精选条目
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
              暂无日报数据
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
