import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  // 1. 所有 Source 名称（按 type）
  const sources = await prisma.source.findMany({ orderBy: { type: 'asc' } })
  const sogouSources = sources.filter(s => s.type === 'SOGOU_WECHAT')

  console.log('=== SOGOU_WECHAT 源配置 ===')
  for (const s of sogouSources) {
    const cfg = s.config ? JSON.parse(s.config) : {}
    console.log(`- ${s.name} | priority=${s.priority} active=${s.isActive} lastCrawledAt=${s.lastCrawledAt?.toISOString().slice(0, 16) ?? 'never'} pages=${cfg.pages ?? 'unset'} customKeywords=${cfg.customKeywords ? cfg.customKeywords.length : 0}`)
  }

  // 2. 最近 30 次 CrawlLog 的 sourceStats 原始内容
  const logs = await prisma.crawlLog.findMany({ orderBy: { startedAt: 'desc' }, take: 30 })
  console.log('\n=== 最近 30 次 CrawlLog ===')

  const sourceAppearances: Record<string, { fetched: number; added: number; failed: number; logs: number }> = {}
  let totalDurationMs = 0

  for (const log of logs) {
    const dur = log.endedAt ? (log.endedAt.getTime() - log.startedAt.getTime()) : 0
    totalDurationMs += dur
    const durMin = log.endedAt ? (dur / 60000).toFixed(1) : 'running'

    let stats: Record<string, { fetched?: number; added?: number; failed?: number }> = {}
    try { stats = log.sourceStats ? JSON.parse(log.sourceStats) : {} } catch { stats = {} }

    let sogouFetched = 0
    let sogouAdded = 0
    let sogouFailed = 0
    for (const [name, v] of Object.entries(stats)) {
      if (sogouSources.some(s => s.name === name)) {
        sogouFetched += v.fetched || 0
        sogouAdded += v.added || 0
        sogouFailed += v.failed || 0
        if (!sourceAppearances[name]) sourceAppearances[name] = { fetched: 0, added: 0, failed: 0, logs: 0 }
        sourceAppearances[name].fetched += v.fetched || 0
        sourceAppearances[name].added += v.added || 0
        sourceAppearances[name].failed += v.failed || 0
        sourceAppearances[name].logs++
      }
    }

    console.log(`[${log.startedAt.toISOString().slice(0, 16)}] dur=${durMin}min totalFetched=${log.totalFetched} added=${log.added} | SOGOU fetched=${sogouFetched} added=${sogouAdded} failed=${sogouFailed}`)
  }

  console.log(`\n=== 30 次同步总耗时: ${(totalDurationMs / 60000).toFixed(1)} min ===`)
  console.log('=== SOGOU_WECHAT 各源在最近 30 次同步中的出现情况 ===')
  for (const [name, v] of Object.entries(sourceAppearances)) {
    console.log(`- ${name}: 出现 ${v.logs} 次, fetched=${v.fetched}, added=${v.added}, failed=${v.failed}`)
  }
  for (const s of sogouSources) {
    if (!sourceAppearances[s.name]) {
      console.log(`- ${s.name}: 未出现在任何 sourceStats 中（0 产出）`)
    }
  }

  // 3. 最近 7 天 SOGOU_WECHAT 入库 item
  const targetKeywords = [
    '人造板', '刨花板', '胶合板', '纤维板', 'OSB', '饰面板', '板材',
    'ENF', '甲醛', '无醛', 'MDI胶', '大豆胶', '压贴', '饰面',
    '林业', '木材', '木业', '胶粘剂',
    '全屋定制', '定制家居', '整木定制', '整装', '高定',
    '橱柜', '衣柜', '木门', '定制家具',
    '柔性生产', 'C2M', '柔性制造',
  ]
  const lowerTarget = targetKeywords.map(k => k.toLowerCase())

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const items = await prisma.item.findMany({
    where: { source: { in: sogouSources.map(s => s.name) }, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
  })

  let targetCount = 0
  const categories: Record<string, number> = {}
  for (const item of items) {
    const text = `${item.title} ${item.summary || ''} ${item.content || ''} ${item.tags.join(' ')}`.toLowerCase()
    const isTarget = lowerTarget.some(k => text.includes(k))
    if (isTarget) targetCount++
    categories[item.category] = (categories[item.category] || 0) + 1
  }

  console.log('\n=== 最近 7 天 SOGOU_WECHAT 入库统计 ===')
  console.log(`总入库: ${items.length}`)
  console.log(`人造板/全屋定制相关: ${targetCount} (${items.length ? (targetCount / items.length * 100).toFixed(1) : 0}%)`)
  console.log('分类分布:', categories)

  console.log('\n--- 最近 30 条 SOGOU_WECHAT 标题 ---')
  for (const item of items.slice(0, 30)) {
    const text = `${item.title} ${item.summary || ''} ${item.content || ''} ${item.tags.join(' ')}`.toLowerCase()
    const isTarget = lowerTarget.some(k => text.includes(k))
    console.log(`[${isTarget ? '目标' : '非目标'}][${item.category}] ${item.title}`)
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
