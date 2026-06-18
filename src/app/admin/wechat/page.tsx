'use client'

import { useState, useEffect } from 'react'

interface WeChatConfig {
  id: string
  name: string
  appId: string
  appSecret: string
  thumbMediaId: string | null
  proxyUrl: string | null
  accountType: string
  isActive: boolean
  lastPushedAt: string | null
  lastError: string | null
  createdAt: string
}

export default function WeChatAdminPage() {
  const [configs, setConfigs] = useState<WeChatConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState({
    name: '',
    appId: '',
    appSecret: '',
    thumbMediaId: '',
    proxyUrl: '',
    accountType: 'SUBSCRIPTION',
  })

  useEffect(() => {
    fetchConfigs()
  }, [])

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 6000)
  }

  async function fetchConfigs() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/wechat-configs')
      const data = await res.json()
      setConfigs(data.configs || [])
    } catch (error) {
      console.error('获取微信配置失败:', error)
      showMessage('error', '获取微信配置失败')
    } finally {
      setLoading(false)
    }
  }

  async function addConfig(e: React.FormEvent) {
    e.preventDefault()
    if (!form.appId.trim() || !form.appSecret.trim()) {
      showMessage('error', '请填写 AppID 和 AppSecret')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/wechat-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim() || '微信公众号',
          appId: form.appId.trim(),
          appSecret: form.appSecret.trim(),
          thumbMediaId: form.thumbMediaId.trim() || undefined,
          proxyUrl: form.proxyUrl.trim() || undefined,
          accountType: form.accountType,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        showMessage('error', data.error || '添加失败')
        return
      }

      setForm({ name: '', appId: '', appSecret: '', thumbMediaId: '', proxyUrl: '', accountType: 'SUBSCRIPTION' })
      await fetchConfigs()
      showMessage('success', '添加成功')
    } catch (error) {
      showMessage('error', '添加失败')
    } finally {
      setSaving(false)
    }
  }

  async function updateConfig(id: string, updates: Partial<WeChatConfig>) {
    try {
      const res = await fetch(`/api/admin/wechat-configs?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (res.ok) {
        await fetchConfigs()
        showMessage('success', '更新成功')
      } else {
        const data = await res.json()
        showMessage('error', data.error || '更新失败')
      }
    } catch (error) {
      showMessage('error', '更新失败')
    }
  }

  async function deleteConfig(id: string) {
    if (!confirm('确定删除这个微信公众号配置？')) return

    try {
      const res = await fetch(`/api/admin/wechat-configs?id=${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await fetchConfigs()
        showMessage('success', '删除成功')
      } else {
        const data = await res.json()
        showMessage('error', data.error || '删除失败')
      }
    } catch (error) {
      showMessage('error', '删除失败')
    }
  }

  async function testPush() {
    setTesting(true)
    try {
      const res = await fetch('/api/admin/wechat-configs/test', {
        method: 'PUT',
      })
      const data = await res.json()

      if (data.success) {
        showMessage('success', `测试推送成功：publish_id=${data.publishId}`)
      } else {
        showMessage('error', `测试推送失败：${data.error}`)
      }
    } catch (error) {
      showMessage('error', '测试推送请求失败')
    } finally {
      setTesting(false)
    }
  }

  async function uploadThumb(configId: string, file: File) {
    const formData = new FormData()
    formData.append('id', configId)
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/wechat-configs/upload-thumb', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (data.success) {
        await fetchConfigs()
        showMessage('success', `封面图上传成功：${data.thumbMediaId}`)
      } else {
        showMessage('error', `封面图上传失败：${data.error}`)
      }
    } catch (error) {
      showMessage('error', '封面图上传请求失败')
    }
  }

  function handleFileChange(configId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showMessage('error', '请选择图片文件')
      return
    }
    uploadThumb(configId, file)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">微信公众号推送管理</h1>
          <p className="text-sm text-slate-500 mt-1">配置公众号 AppID / AppSecret 和封面素材ID，每日自动生成图文并发布</p>
        </div>
        {configs.some((c) => c.isActive) && (
          <button
            onClick={testPush}
            disabled={testing}
            className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-60"
          >
            {testing ? '推送中...' : '测试推送昨日日报'}
          </button>
        )}
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
        <h3 className="text-lg font-bold text-slate-900 mb-5">添加微信公众号</h3>
        <form onSubmit={addConfig} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">配置名称</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="微信公众号"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">账号类型</label>
              <select
                value={form.accountType}
                onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              >
                <option value="SUBSCRIPTION">订阅号（每天 1 次群发）</option>
                <option value="SERVICE">服务号（每月 4 次群发）</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">AppID</label>
              <input
                type="text"
                value={form.appId}
                onChange={(e) => setForm({ ...form, appId: e.target.value })}
                placeholder="wx..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">AppSecret</label>
              <input
                type="password"
                value={form.appSecret}
                onChange={(e) => setForm({ ...form, appSecret: e.target.value })}
                placeholder="微信公众平台获取"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Cloudflare Worker 代理地址（proxyUrl）
            </label>
            <input
              type="text"
              value={form.proxyUrl}
              onChange={(e) => setForm({ ...form, proxyUrl: e.target.value })}
              placeholder="https://wechat-mp-proxy.xxx.workers.dev/proxy"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              如果 Vercel/Cloudflare Pages 的出口 IP 不固定，可部署 Cloudflare Worker 代理转发微信 API，把 Worker IP 加入微信白名单
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">默认封面图素材ID（thumb_media_id）</label>
            <input
              type="text"
              value={form.thumbMediaId}
              onChange={(e) => setForm({ ...form, thumbMediaId: e.target.value })}
              placeholder="可先留空，到微信公众平台素材库上传封面图后填写"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              进入微信公众平台 → 素材库 → 上传 2M 以内的 jpg/png 封面图 → 获取 media_id 填入此处
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? '添加中...' : '+ 添加配置'}
            </button>
          </div>
        </form>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">已配置的公众号</h3>
          <span className="text-xs text-slate-400">共 {configs.length} 个</span>
        </div>
        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : configs.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">还没有配置微信公众号</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {configs.map((config) => (
              <div
                key={config.id}
                className="px-5 py-4 flex items-start justify-between hover:bg-slate-50/50 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-900 truncate">{config.name}</span>
                    {config.isActive ? (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                        启用
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        禁用
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">AppID: {config.appId}</div>
                  <div className="text-xs text-slate-400 mt-0.5">类型: {config.accountType === 'SUBSCRIPTION' ? '订阅号' : '服务号'}</div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate">
                    代理地址: {config.proxyUrl || '直连微信 API'}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate">封面素材: {config.thumbMediaId || '未配置'}</div>
                  {config.lastPushedAt && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      上次推送: {new Date(config.lastPushedAt).toLocaleString('zh-CN')}
                    </div>
                  )}
                  {config.lastError && (
                    <div className="text-xs text-rose-500 mt-1.5 max-w-xl break-all">最近错误: {config.lastError}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 ml-4 mt-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateConfig(config.id, { isActive: !config.isActive })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                        config.isActive ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                      title={config.isActive ? '禁用' : '启用'}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                          config.isActive ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => deleteConfig(config.id)}
                      className="text-sm font-medium text-rose-600 hover:text-rose-800 transition"
                    >
                      删除
                    </button>
                  </div>
                  <label className="cursor-pointer text-xs font-medium text-indigo-600 hover:text-indigo-800 transition">
                    {config.thumbMediaId ? '更换封面图' : '上传封面图'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={(e) => handleFileChange(config.id, e)}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
