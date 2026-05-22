'use client'

import { useState, useEffect } from 'react'

interface Source {
  id: string
  name: string
  type: string
  url: string
  config: string | null
  category: string | null
  isActive: boolean
  priority: number
  lastCrawledAt: string | null
  createdAt: string
}

const SOURCE_TYPES = [
  { value: 'WEB', label: '网页', desc: '通过CSS选择器抓取网页内容' },
  { value: 'RSS', label: 'RSS', desc: '解析RSS/XML订阅源' },
  { value: 'WECHAT_RSS', label: '公众号RSS', desc: '通过第三方RSS服务获取公众号内容' },
  { value: 'API', label: 'API', desc: '调用第三方数据接口' },
  { value: 'MANUAL', label: '手动', desc: '手动录入，不参与自动爬取' },
]

const CATEGORY_OPTIONS = [
  { value: '', label: '不指定' },
  { value: 'policy', label: '政策监管' },
  { value: 'market', label: '市场格局' },
  { value: 'capital', label: '资本财务' },
  { value: 'technology', label: '技术材料' },
  { value: 'supply-chain', label: '产业链' },
]

export default function SourcesAdminPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSource, setEditingSource] = useState<Source | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const emptyForm = {
    name: '',
    type: 'RSS',
    url: '',
    config: '',
    category: '',
    priority: 0,
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    fetchSources()
  }, [])

  async function fetchSources() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/sources')
      const data = await res.json()
      setSources(data.sources || [])
    } catch (error) {
      console.error('获取信源失败:', error)
    } finally {
      setLoading(false)
    }
  }

  function startCreate() {
    setForm(emptyForm)
    setIsCreating(true)
    setEditingSource(null)
  }

  function startEdit(source: Source) {
    setForm({
      name: source.name,
      type: source.type,
      url: source.url,
      config: source.config || '',
      category: source.category || '',
      priority: source.priority,
    })
    setEditingSource(source)
    setIsCreating(false)
  }

  function cancelEdit() {
    setEditingSource(null)
    setIsCreating(false)
    setForm(emptyForm)
  }

  async function saveSource() {
    try {
      if (isCreating) {
        const res = await fetch('/api/admin/sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            config: form.config || null,
            category: form.category || null,
          }),
        })
        if (res.ok) {
          cancelEdit()
          fetchSources()
        }
      } else if (editingSource) {
        const res = await fetch('/api/admin/sources', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingSource.id,
            ...form,
            config: form.config || null,
            category: form.category || null,
          }),
        })
        if (res.ok) {
          cancelEdit()
          fetchSources()
        }
      }
    } catch (error) {
      console.error('保存失败:', error)
    }
  }

  async function toggleActive(source: Source) {
    try {
      const res = await fetch('/api/admin/sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: source.id,
          isActive: !source.isActive,
        }),
      })
      if (res.ok) fetchSources()
    } catch (error) {
      console.error('切换状态失败:', error)
    }
  }

  async function deleteSource(id: string) {
    if (!confirm('确定删除这个信源？相关历史资讯不会被删除。')) return
    try {
      const res = await fetch('/api/admin/sources', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      if (res.ok) fetchSources()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const typeLabel = (type: string) => SOURCE_TYPES.find((t) => t.value === type)?.label || type

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">信源管理</h1>
          <p className="text-sm text-slate-500 mt-1">配置和管理信息采集源，支持网页、RSS、公众号等多种类型</p>
        </div>
        <button
          onClick={startCreate}
          className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
        >
          + 添加信源
        </button>
      </div>

      {/* Form */}
      {(isCreating || editingSource) && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-5">
            {isCreating ? '添加信源' : '编辑信源'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">名称</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="如：中指研究院"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">类型</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              >
                {SOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label} - {t.desc}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">采集地址</label>
              <input
                type="text"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder={form.type === 'WECHAT_RSS' ? 'https://wechat2rss.xlab.app/feed/xxx' : 'https://example.com/news'}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">默认分类</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">优先级（数字越大越优先）</label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                配置（JSON）
                <span className="text-slate-400 font-normal ml-1">{form.type === 'WEB' ? '填写CSS选择器配置' : form.type === 'API' ? '填写API响应路径等' : '可选'}</span>
              </label>
              <textarea
                value={form.config}
                onChange={(e) => setForm({ ...form, config: e.target.value })}
                placeholder={form.type === 'WEB' ? '{"listSelector":".news-item","itemSelector":{"title":"h3 a","link":"h3 a"}}' : ''}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition resize-none font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            >
              取消
            </button>
            <button
              onClick={saveSource}
              className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition"
            >
              保存
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">名称</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">类型</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">地址</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">状态</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">最后采集</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </td></tr>
            ) : sources.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">暂无信源</td></tr>
            ) : (
              sources.map((source) => (
                <tr key={source.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition">
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-900">{source.name}</div>
                    {source.category && (
                      <div className="text-xs text-slate-400 mt-0.5">默认分类: {source.category}</div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      source.type === 'WEB' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                      source.type === 'RSS' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      source.type === 'WECHAT_RSS' ? 'bg-green-50 text-green-600 border border-green-100' :
                      source.type === 'API' ? 'bg-violet-50 text-violet-600 border border-violet-100' :
                      'bg-slate-50 text-slate-600 border border-slate-100'
                    }`}>
                      {typeLabel(source.type)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 transition truncate max-w-xs block"
                    >
                      {source.url}
                    </a>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => toggleActive(source)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                        source.isActive ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                          source.isActive ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-5 py-4 text-slate-400 text-xs">
                    {source.lastCrawledAt
                      ? new Date(source.lastCrawledAt).toLocaleString('zh-CN')
                      : '从未'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => startEdit(source)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => deleteSource(source.id)}
                        className="text-sm font-medium text-rose-600 hover:text-rose-800 transition"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
