import { prisma } from '@/lib/prisma'
import { crawlAllSources, flattenResults, loadActiveSources } from '@/lib/crawler'
import { dedupItems } from '@/lib/crawler'
import { batchClassify, generateDeepReasons, generateDailyWithSections } from '@/lib/ai'
import { RawItem } from '@/lib/sources/types'

const BATCH_SIZE = 1

/** 消费端低质量内容硬过滤 */
function isLowQualityConsumerContent(title: string, content: string): boolean {
  const consumerKeywords = [
    '避坑', '翻车', '技巧', '攻略', '教程', '怎么选', '多少钱',
    '如何选', '手把手', '新手', '小白', '踩雷', '智商税',
    '后悔', '被坑', '血泪', '教训', '维权', '投诉',
  ]
  for (const kw of consumerKeywords) {
    if (title.includes(kw)) return true
  }
  const consumerStartPatterns = [
    /^如何/, /^怎么/, /^教你/, /^新手/, /^小白/,
    /^签合同/, /^验收/, /^选.*板材/, /^选.*地板/,
    /^装修.*注意/, /^装修.*细节/,
  ]
  for (const pattern of consumerStartPatterns) {
    if (pattern.test(title)) return true
  }
  const adKeywords = [
    '需要采购', '求购', '询价', '诚招代理', '诚招全国',
    '厂家招商', '品牌招商', '我要代理', '加盟热线', '招商加盟',
  ]
  for (const kw of adKeywords) {
    if (title.includes(kw)) return true
  }
  if (title.startsWith('咨询') && title.length < 30) return true
  if (title.includes('十大品牌') && (title.includes('排名') || title.includes('评测'))) return true
  return false
}

async function processCrawledItems(rawItems: RawItem[]) {
  let added = 0
  let skipped = 0
  let failed = 0
  let consumerFiltered = 0

  console.log(`[Cron] 去重: 原始 ${rawItems.length} 条`)
  const { unique } = dedupItems(rawItems)
  console.log(`[Cron] 去重后: ${unique.length} 条`)

  const afterHardFilter = unique.filter((item) => {
    if (isLowQualityConsumerContent(item.title, item.content)) {
      consumerFiltered++
      return false
    }
    return true
  })
  console.log(`[Cron] 硬过滤后: ${afterHardFilter.length} 条 (排除 ${consumerFiltered} 条低质量)`)

  const sources = await loadActiveSources()
  const sourceMap = new Map<string, string>()
  for (const s of sources) sourceMap.set(s.name, s.id)

  console.log(`[Cron] AI五维评分开始, 每批 ${BATCH_SIZE} 条`)
  const allResults: {
    raw: RawItem
    category: string
    summary: string
    score: number
    tags: string[]
  }[] = []

  for (let i = 0; i < afterHardFilter.length; i += BATCH_SIZE) {
    const batch = afterHardFilter.slice(i, i + BATCH_SIZE)
    try {
      const batchResults = await batchClassify(
        batch.map((item) => ({ title: item.title, content: item.content, source: item.source, publishedAt: item.publishedAt }))
      )
      for (let j = 0; j < batch.length; j++) {
        const result = batchResults[j]
        if (result) {
          allResults.push({ raw: batch[j], ...result })
        }
      }
      if (i + BATCH_SIZE < afterHardFilter.length) await new Promise((r) => setTimeout(r, 3000))
    } catch (error) {
      console.error(`[Cron] 批次失败:`, (error as Error).message)
      for (const item of batch) {
        allResults.push({
          raw: item,
          category: 'market',
          summary: item.title.slice(0, 30),
          score: 5,
          tags: ['全屋定制', '中性'],
        })
      }
    }
  }

  const highScoreItems = allResults.filter((r) => r.score >= 6)
  const reasonsMap = new Map<number, string>()
  if (highScoreItems.length > 0) {
    for (let i = 0; i < highScoreItems.length; i += BATCH_SIZE) {
      const batch = highScoreItems.slice(i, i + BATCH_SIZE)
      try {
        const reasons = await generateDeepReasons(
          batch.map((r) => ({ title: r.raw.title, summary: r.summary, category: r.category }))
        )
        for (let j = 0; j < batch.length; j++) {
          const idx = allResults.indexOf(batch[j])
          reasonsMap.set(idx, reasons[j] || '行业战略资讯，建议关注')
        }
        if (i + BATCH_SIZE < highScoreItems.length) await new Promise((r) => setTimeout(r, 3000))
      } catch (error) {
        console.error(`[Cron] 战略解读失败:`, (error as Error).message)
      }
    }
  }

  const sourceStats: Record<string, { fetched: number; added: number; failed: number }> = {}
  for (let i = 0; i < allResults.length; i++) {
    const { raw, category, summary, score, tags } = allResults[i]

    // 3 分以下直接丢弃
    if (score < 3) {
      skipped++
      continue
    }

    const reason = reasonsMap.get(i) || (score >= 6 ? '行业战略资讯，建议关注' : '行业相关资讯')

    if (!sourceStats[raw.source]) sourceStats[raw.source] = { fetched: 0, added: 0, failed: 0 }
    sourceStats[raw.source].fetched++

    try {
      const exists = await prisma.item.findUnique({ where: { url: raw.url } })
      if (exists) {
        skipped++
        continue
      }

      await prisma.item.create({
        data: {
          title: raw.title,
          url: raw.url,
          source: raw.source,
          sourceId: sourceMap.get(raw.source) || null,
          content: raw.content,
          imageUrl: raw.imageUrl,
          publishedAt: raw.publishedAt,
          category,
          summary,
          reason,
          score,
          isSelected: score >= 6,
          tags,
        },
      })
      added++
      sourceStats[raw.source].added++
    } catch (error) {
      failed++
      sourceStats[raw.source].failed++
    }
  }

  return { added, skipped, failed, consumerFiltered, sourceStats }
}

async function generateDaily() {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const items = await prisma.item.findMany({
    where: { isSelected: true, publishedAt: { gte: yesterday } },
    orderBy: { score: 'desc' },
    take: 10,
  })

  if (items.length === 0) {
    console.log('[Cron] 今日无精选内容，跳过日报')
    return false
  }

  const dailyResult = await generateDailyWithSections(
    items.map((item) => ({ title: item.title, summary: item.summary || item.title, category: item.category, tags: item.tags }))
  )

  const categoryGroups: Record<string, typeof items> = {}
  for (const item of items) {
    if (!categoryGroups[item.category]) categoryGroups[item.category] = []
    categoryGroups[item.category].push(item)
  }

  const sectionsData = dailyResult.sections
    .filter((s) => categoryGroups[s.category] && categoryGroups[s.category].length > 0)
    .map((s) => ({
      category: s.category,
      title: s.title,
      description: s.description,
      itemIds: categoryGroups[s.category].map((item) => item.id),
      order: Object.keys(categoryGroups).indexOf(s.category),
    }))

  if (sectionsData.length === 0) {
    for (const [category, group] of Object.entries(categoryGroups)) {
      sectionsData.push({ category, title: group[0]?.source || category, description: '', itemIds: group.map((item) => item.id), order: 0 })
    }
  }

  const exists = await prisma.daily.findUnique({ where: { date: today } })
  if (exists) {
    await prisma.dailySection.deleteMany({ where: { dailyId: exists.id } })
    await prisma.daily.update({
      where: { id: exists.id },
      data: { title: dailyResult.title, summary: dailyResult.summary, editorNote: dailyResult.editorNote, itemIds: items.map((i) => i.id), sectionCount: sectionsData.length },
    })
    for (const section of sectionsData) {
      await prisma.dailySection.create({ data: { dailyId: exists.id, ...section } })
    }
  } else {
    const daily = await prisma.daily.create({
      data: { date: today, title: dailyResult.title, summary: dailyResult.summary, editorNote: dailyResult.editorNote, itemIds: items.map((i) => i.id), sectionCount: sectionsData.length },
    })
    for (const section of sectionsData) {
      await prisma.dailySection.create({ data: { dailyId: daily.id, ...section } })
    }
  }

  return true
}

async function doSync(logId: string) {
  console.log(`[Cron] 同步任务开始: ${new Date().toLocaleString('zh-CN')}`)

  let rawItems: RawItem[] = []
  let result = { added: 0, skipped: 0, failed: 0, consumerFiltered: 0, sourceStats: {} as Record<string, { fetched: number; added: number; failed: number }> }
  let dailyGenerated = false
  let errorMessage: string | null = null

  try {
    const crawlResults = await crawlAllSources()
    rawItems = flattenResults(crawlResults)
    const sourceNames = [...new Set(rawItems.map((item) => item.source))]

    if (rawItems.length === 0) {
      await prisma.crawlLog.update({
        where: { id: logId },
        data: { status: 'success', endedAt: new Date(), totalFetched: 0, sources: sourceNames },
      })
      return
    }

    result = await processCrawledItems(rawItems)
    dailyGenerated = await generateDaily()

    await prisma.crawlLog.update({
      where: { id: logId },
      data: {
        status: 'success',
        endedAt: new Date(),
        totalFetched: rawItems.length,
        added: result.added,
        skipped: result.skipped,
        failed: result.failed,
        sources: sourceNames,
        sourceStats: JSON.stringify(result.sourceStats),
        dailyGenerated,
      },
    })

    console.log(`[Cron] 同步任务完成: fetched=${rawItems.length}, added=${result.added}`)
  } catch (error) {
    errorMessage = (error as Error).message
    console.error(`[Cron] 同步任务失败: ${errorMessage}`)
    await prisma.crawlLog.update({
      where: { id: logId },
      data: { status: 'failed', endedAt: new Date(), errorMessage, totalFetched: rawItems.length },
    })
  }
}

export async function runSync() {
  const crawlLog = await prisma.crawlLog.create({
    data: { status: 'running', startedAt: new Date() },
  })
  await doSync(crawlLog.id)

  const finalLog = await prisma.crawlLog.findUnique({ where: { id: crawlLog.id } })
  if (!finalLog) {
    return { success: true, message: '同步完成', fetched: 0, added: 0, skipped: 0, failed: 0, dailyGenerated: false }
  }

  return {
    success: finalLog.status === 'success',
    message: finalLog.errorMessage || '同步完成',
    fetched: finalLog.totalFetched,
    added: finalLog.added,
    skipped: finalLog.skipped,
    failed: finalLog.failed,
    dailyGenerated: finalLog.dailyGenerated,
  }
}

export async function startBackgroundSync(logId: string) {
  // Intentionally not awaited — runs in background
  doSync(logId).catch((err) => {
    console.error('[Cron] Background sync uncaught error:', err)
  })
}
