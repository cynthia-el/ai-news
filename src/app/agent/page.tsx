import { CATEGORY_MAP } from '@/lib/constants/categories'

export const metadata = {
  title: 'Agent 接入 - 家居建材AI资讯',
  description: '通过 Skill、RSS 或 API 接入家居建材AI资讯',
}

export default function AgentPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const apiEndpoints = [
    {
      method: 'GET',
      path: '/api/public/items',
      desc: '获取资讯条目列表',
      params: 'mode (selected|all), since (ISO日期), category (分类), q (关键词), page, pageSize',
      example: `curl "${siteUrl}/api/public/items?mode=selected&page=1"`,
    },
    {
      method: 'GET',
      path: '/api/public/daily',
      desc: '获取今日日报',
      params: null,
      example: `curl "${siteUrl}/api/public/daily"`,
    },
    {
      method: 'GET',
      path: '/api/public/daily/YYYY-MM-DD',
      desc: '获取指定日期日报',
      params: null,
      example: `curl "${siteUrl}/api/public/daily/2026-05-15"`,
    },
    {
      method: 'GET',
      path: '/api/public/dailies',
      desc: '获取有日报的日期列表',
      params: 'take (数量，默认30)',
      example: `curl "${siteUrl}/api/public/dailies?take=30"`,
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-violet-50 text-violet-600 border border-violet-100">
            开发者
          </span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
          Agent 接入
        </h1>
        <p className="text-slate-500 max-w-xl">
          通过 Skill、RSS 或 REST API 将家居建材资讯接入你的 Agent 工作流
        </p>
      </div>

      <div className="space-y-6">
        {/* Skill 接入 */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Skill 接入</h2>
              <p className="text-sm text-slate-500">推荐 — 支持 Claude Code、Cursor、Cline 等 Agent 工具</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2.5">安装方式</h3>
              <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                <code className="text-sm text-emerald-400 font-mono">
                  帮我安装这个 skill：{siteUrl}/skill/
                </code>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2.5">自然语言触发示例</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {[
                  '今天家居行业有什么新动态',
                  '看一下今天的行业日报',
                  '最近有什么新品发布',
                  '最近一周的设计趋势',
                  '最近有什么政策法规',
                  '看下精选条目',
                ].map((example) => (
                  <div
                    key={example}
                    className="px-4 py-2.5 bg-slate-50 rounded-xl text-sm text-slate-600 border border-slate-100"
                  >
                    {example}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RSS 接入 */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 19.5v-.75a7.5 7.5 0 00-7.5-7.5H4.5m0-6.75h.75c7.87 0 14.25 6.38 14.25 14.25v.75M6 18.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">RSS 订阅</h2>
              <p className="text-sm text-slate-500">适用于 Feedly、Inoreader 等 RSS 阅读器</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: '精选内容', url: `${siteUrl}/feed.xml` },
              { label: '全部内容', url: `${siteUrl}/feed/all.xml` },
            ].map((feed) => (
              <div
                key={feed.url}
                className="flex items-center justify-between bg-slate-50 rounded-xl p-3.5 border border-slate-100"
              >
                <span className="text-sm font-medium text-slate-700">{feed.label}</span>
                <code className="text-xs text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-100 font-mono">
                  {feed.url}
                </code>
              </div>
            ))}
          </div>
        </section>

        {/* REST API */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-11 h-11 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">REST API</h2>
              <p className="text-sm text-slate-500">公开 API，无需认证，直接调用</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Base URL:</span>
                <code className="text-slate-900 font-mono">{siteUrl}/api/public</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">认证:</span>
                <span className="text-emerald-600 font-medium">无需 API Key</span>
              </div>
            </div>

            <div className="space-y-4">
              {apiEndpoints.map((ep) => (
                <div key={ep.path} className="border border-slate-100 rounded-xl overflow-hidden">
                  <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                    <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                      {ep.method}
                    </span>
                    <code className="text-sm text-indigo-600 font-mono">{ep.path}</code>
                  </div>
                  <div className="p-5 text-sm space-y-2">
                    <p className="text-slate-600">{ep.desc}</p>
                    {ep.params && (
                      <div className="text-xs text-slate-400">参数: {ep.params}</div>
                    )}
                    <pre className="bg-slate-900 rounded-xl p-3.5 text-emerald-400 text-xs overflow-x-auto font-mono mt-2">
                      {ep.example}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 分类说明 */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">资讯分类</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(CATEGORY_MAP).map(([key, label]) => (
              <div key={key} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="text-sm font-semibold text-slate-900">{label}</div>
                <code className="text-xs text-slate-400 mt-1.5 block font-mono">{key}</code>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
