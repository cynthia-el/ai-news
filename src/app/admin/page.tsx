import { prisma } from '@/lib/prisma'
import { CATEGORY_MAP, CATEGORY_META } from '@/lib/constants/categories'
import SyncButton from './components/SyncButton'

export const dynamic = 'force-dynamic'

async function getStats() {
  const [
    totalItems,
    selectedItems,
    todayItems,
    totalDailies,
    totalSources,
    activeSources,
    categoryStats,
    recentLogs,
  ] = await Promise.all([
    prisma.item.count(),
    prisma.item.count({ where: { isSelected: true } }),
    prisma.item.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.daily.count(),
    prisma.source.count(),
    prisma.source.count({ where: { isActive: true } }),
    prisma.item.groupBy({
      by: ['category'],
      _count: { category: true },
    }),
    prisma.crawlLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 5,
    }),
  ])

  return {
    totalItems,
    selectedItems,
    todayItems,
    totalDailies,
    totalSources,
    activeSources,
    categoryStats,
    recentLogs,
  }
}

export default async function AdminPage() {
  const stats = await getStats()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">数据看板</h1>
          <p className="text-sm text-slate-500 mt-1">实时了解系统运行状态</p>
        </div>
        <SyncButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        <StatCard
          title="总资讯数"
          value={stats.totalItems}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
            </svg>
          }
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="精选资讯"
          value={stats.selectedItems}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          }
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="今日新增"
          value={stats.todayItems}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          }
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="活跃信源"
          value={stats.activeSources}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          }
          accent="bg-rose-50 text-rose-600"
        />
        <StatCard
          title="日报总数"
          value={stats.totalDailies}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          }
          accent="bg-violet-50 text-violet-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-5">资讯分类分布</h2>
          <div className="space-y-4">
            {stats.categoryStats.map((stat) => {
              const percentage =
                stats.totalItems > 0
                  ? Math.round((stat._count.category / stats.totalItems) * 100)
                  : 0
              const meta = CATEGORY_META[stat.category]
              return (
                <div key={stat.category}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600 font-medium">
                      {CATEGORY_MAP[stat.category] || stat.category}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {stat._count.category} 条 ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${meta?.bg?.replace('bg-', 'bg-') || 'bg-slate-400'}`}
                      style={{ width: `${percentage}%`, backgroundColor: meta ? undefined : '#94a3b8' }}
                    />
                  </div>
                </div>
              )
            })}
            {stats.categoryStats.length === 0 && (
              <div className="text-sm text-slate-400 py-8 text-center">暂无数据</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-5">最近采集记录</h2>
          {stats.recentLogs.length === 0 ? (
            <div className="text-sm text-slate-400 py-8 text-center">暂无采集记录</div>
          ) : (
            <div className="space-y-3">
              {stats.recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0"
                >
                  <div>
                    <div className="text-sm text-slate-700">
                      {new Date(log.startedAt).toLocaleString('zh-CN')}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      新增 {log.added} / 跳过 {log.skipped} / 失败 {log.failed}
                    </div>
                  </div>
                  <StatusBadge status={log.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string
  value: number
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4 ${accent}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{title}</div>
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
