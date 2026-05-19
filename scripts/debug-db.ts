import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('========== 数据库诊断 ==========\n')

  // 1. 检查活跃信源
  const sources = await prisma.source.findMany({
    where: { isActive: true },
    orderBy: { lastCrawledAt: 'desc' },
  })
  console.log(`[信源] 活跃信源共 ${sources.length} 个`)
  for (const s of sources) {
    const lastCrawl = s.lastCrawledAt ? new Date(s.lastCrawledAt).toLocaleString('zh-CN') : '从未'
    console.log(`  [${s.type}] ${s.name} | ${s.url.slice(0, 60)} | 上次采集: ${lastCrawl}`)
  }

  // 2. 检查最新爬取日志
  const latestLog = await prisma.crawlLog.findFirst({ orderBy: { startedAt: 'desc' } })
  if (latestLog) {
    console.log(`\n[最新爬取日志] ${new Date(latestLog.startedAt).toLocaleString('zh-CN')}`)
    console.log(`  状态: ${latestLog.status}`)
    console.log(`  爬取: ${latestLog.totalFetched} 条 | 新增: ${latestLog.added} | 跳过: ${latestLog.skipped} | 失败: ${latestLog.failed}`)
    if (latestLog.errorMessage) console.log(`  错误: ${latestLog.errorMessage}`)
    if (latestLog.sourceStats) {
      try {
        const stats = JSON.parse(latestLog.sourceStats)
        console.log('  各信源统计:')
        for (const [name, s] of Object.entries(stats as Record<string, { fetched: number; added: number; failed: number }>)) {
          console.log(`    ${name}: 爬取${s.fetched} 新增${s.added} 失败${s.failed}`)
        }
      } catch { /* ignore */ }
    }
  }

  // 3. 检查最近入库的资讯（URL 和 内容长度）
  const recentItems = await prisma.item.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15,
    include: { sourceRef: { select: { name: true } } },
  })
  console.log(`\n[最近入库资讯] 共显示 ${recentItems.length} 条`)
  for (const item of recentItems) {
    const urlStatus = item.url && item.url.trim().length > 0
      ? (item.url.startsWith('http') ? '✓ 有效' : `⚠ 异常: ${item.url.slice(0, 40)}`)
      : '✗ 空URL'
    const contentLen = item.content?.length || 0
    const summaryLen = item.summary?.length || 0
    console.log(`\n  [${item.sourceRef?.name || item.source}] ${item.title.slice(0, 40)}`)
    console.log(`    URL: ${urlStatus}`)
    console.log(`    内容长度: ${contentLen} 字 | 摘要长度: ${summaryLen} 字 | 评分: ${item.score}`)
  }

  // 4. 检查今日日报
  const today = new Date().toISOString().split('T')[0]
  const daily = await prisma.daily.findUnique({ where: { date: today } })
  if (daily) {
    console.log(`\n[今日日报] ${daily.date} | ${daily.title} | ${daily.itemIds.length} 条`)
  } else {
    console.log(`\n[今日日报] ${today} 暂无日报`)
  }

  // 5. 统计空URL的资讯数量
  const emptyUrlCount = await prisma.item.count({ where: { url: '' } })
  console.log(`\n[统计] URL为空的资讯: ${emptyUrlCount} 条`)

  // 6. 统计内容少于100字的资讯
  // 用原始查询
  const allItems = await prisma.item.findMany({ select: { id: true, content: true, url: true, title: true, source: true } })
  const shortContent = allItems.filter(i => (i.content?.length || 0) < 100)
  console.log(`[统计] 内容少于100字的资讯: ${shortContent.length} 条`)
  for (const i of shortContent.slice(0, 5)) {
    console.log(`  [${i.source}] ${i.title.slice(0, 30)} | 内容${i.content?.length || 0}字 | URL: ${i.url ? i.url.slice(0, 40) : '空'}`)
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
