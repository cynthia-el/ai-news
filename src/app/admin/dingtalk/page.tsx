'use client'

import { useState, useEffect } from 'react'

interface Webhook {
  id: string
  name: string
  url: string
  secret: string | null
  isActive: boolean
  createdAt: string
}

export default function DingTalkAdminPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({ name: '', url: '', secret: '' })

  useEffect(() => {
    fetchWebhooks()
  }, [])

  async function fetchWebhooks() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/dingtalk-webhooks')
      const data = await res.json()
      setWebhooks(data.webhooks || [])
    } catch (error) {
      console.error('获取 Webhook 失败:', error)
      showMessage('error', '获取 Webhook 列表失败')
    } finally {
      setLoading(false)
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  async function addWebhook(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.url.trim()) {
      showMessage('error', '请填写群名称和 Webhook URL')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/dingtalk-webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          url: form.url.trim(),
          secret: form.secret.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        showMessage('error', data.error || '添加失败')
        return
      }

      setForm({ name: '', url: '', secret: '' })
      await fetchWebhooks()
      showMessage('success', data.message || '添加成功')
    } catch (error) {
      showMessage('error', '添加失败，请检查网络')
    } finally {
      setSaving(false)
    }
  }

  async function deleteWebhook(id: string) {
    if (!confirm('确定删除这个钉钉群推送配置？')) return

    try {
      const res = await fetch(`/api/admin/dingtalk-webhooks/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await fetchWebhooks()
        showMessage('success', '删除成功')
      } else {
        const data = await res.json()
        showMessage('error', data.error || '删除失败')
      }
    } catch (error) {
      showMessage('error', '删除失败')
    }
  }

  async function toggleActive(webhook: Webhook) {
    try {
      const res = await fetch(`/api/admin/dingtalk-webhooks/${webhook.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !webhook.isActive }),
      })

      if (res.ok) {
        await fetchWebhooks()
        showMessage(
          'success',
          webhook.isActive ? '已禁用推送' : '已启用推送'
        )
      } else {
        const data = await res.json()
        showMessage('error', data.error || '状态切换失败')
      }
    } catch (error) {
      showMessage('error', '状态切换失败')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">钉钉推送管理</h1>
          <p className="text-sm text-slate-500 mt-1">
            管理多个钉钉群的机器人 Webhook，添加后会自动向该群推送日报
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-xl text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 添加表单 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-5">添加钉钉群</h3>
        <form onSubmit={addWebhook} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                群名称
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="如：领导群、战略部群"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Webhook URL
              </label>
              <input
                type="text"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              加签密钥（可选）
            </label>
            <input
              type="text"
              value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
              placeholder="SEC...（如果机器人启用了加签安全策略则必填）"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              如果钉钉机器人安全设置选择了"自定义关键词"，则不需要填写此项
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? '添加中...' : '+ 添加并推送测试'}
            </button>
          </div>
        </form>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">已配置的群</h3>
          <span className="text-xs text-slate-400">
            共 {webhooks.length} 个，{webhooks.filter((w) => w.isActive).length} 个启用
          </span>
        </div>
        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : webhooks.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">
            还没有配置钉钉群，添加一个即可开始推送
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-900 truncate">{webhook.name}</span>
                    {webhook.isActive ? (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                        启用
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        禁用
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 truncate">
                    {webhook.url}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    添加于 {new Date(webhook.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <button
                    onClick={() => toggleActive(webhook)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                      webhook.isActive ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                    title={webhook.isActive ? '禁用' : '启用'}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                        webhook.isActive ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => deleteWebhook(webhook.id)}
                    className="text-sm font-medium text-rose-600 hover:text-rose-800 transition"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
