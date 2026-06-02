import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import { crawlAllSources, flattenResults, loadActiveSources } from '../src/lib/crawler'
import { dedupItems } from '../src/lib/crawler'
import { batchClassify, generateDeepReasons, generateDailyWithSections } from '../src/lib/ai'
import { RawItem } from '../src/lib/sources/types'

const BATCH_SIZE = 6

/** 硬过滤：消费端低质量内容一票否决 */
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

/** B2B采购/招商类硬过滤 */
function isProcurementOrAd(title: string): boolean {
  const t = title.trim()
  const procurementKws = ['需要采购', '求购', '询价', '诚招代理', '诚招全国', '厂家招商', '品牌招商', '我要代理', '加盟热线', '招商加盟']
  if (procurementKws.some(kw => t.includes(kw))) return true
  if (t.startsWith('咨询') && t.length < 30) return true
  if (t.includes('十大品牌') && (t.includes('排名') || t.includes('评测') || t.includes('综合'))) return true
  return false
}

async function main() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║      修复诊断 + 重新同步                 ║')
  console.log('╚══════════════════════════════════════════╝\n')

  // ========== 1. 诊断：检查 isSelected 异常 ==========
  console.log('【诊断1】检查 isSelected 异常...')
  const lowScoreSelected = await prisma.item.findMany({
    where: { isSelected: true, score: { lt: 6 } },
    select: { id: true, title: true, score: true, source: true },
    take: 20,
  })
  console.log(`  找到 ${lowScoreSelected.length} 条 score < 6 但被标记为精选的记录`)
  if (lowScoreSelected.length > 0) {
    lowScoreSelected.forEach(i => console.log(`    - [${i.score}] ${i.title.slice(0, 50)} (${i.source})`))
  }

  // ========== 2. 诊断：检查日报状态 ==========
  console.log('\n【诊断2】检查日报状态...')
  const today = new Date().toISOString().split('T')[0]
  const todayDaily = await prisma.daily.findUnique({ where: { date: today } })
  if (todayDaily) {
    console.log(`  今日日报已存在: ${todayDaily.title}`)
  } else {
    console.log('  今日日报不存在')
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const selectedItems = await prisma.item.findMany({
    where: { isSelected: true, publishedAt: { gte: yesterday } },
    orderBy: { score: 'desc' },
  })
  console.log(`  近24小时精选资讯: ${selectedItems.length} 条`)
  selectedItems.forEach(i => console.log(`    - [${i.score}] ${i.title.slice(0, 50)}`))

  // ========== 3. 删除新浪家居旧数据 ==========
  console.log('\n【清理】删除新浪家居旧数据...')
  const sinaItems = await prisma.item.findMany({
    where: { source: { contains: '新浪家居' } },
    select: { id: true },
  })
  const sinaIds = sinaItems.map(i => i.id)

  if (sinaIds.length > 0) {
    // 解除日报引用
    const dailies = await prisma.daily.findMany({ where: { itemIds: { hasSome: sinaIds } } })
    for (const d of dailies) {
      await prisma.daily.update({
        where: { id: d.id },
        data: { itemIds: d.itemIds.filter(id => !sinaIds.includes(id)) },
      })
    }
    const sections = await prisma.dailySection.findMany({ where: { itemIds: { hasSome: sinaIds } } })
    for (const s of sections) {
      await prisma.dailySection.update({
        where: { id: s.id },
        data: { itemIds: s.itemIds.filter(id => !sinaIds.includes(id)) },
      })
    }
    const del = await prisma.item.deleteMany({ where: { id: { in: sinaIds } } })
    console.log(`  ✓ 已删除 ${del.count} 条新浪家居旧数据`)
  } else {
    console.log('  无新浪家居旧数据')
  }

  // ========== 4. 执行同步 ==========
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📡 开始重新同步')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const crawlLog = await prisma.crawlLog.create({
    data: { status: 'running', startedAt: new Date() },
  })

  let rawItems: RawItem[] = []
  let added = 0, skipped = 0, failed = 0
  let dailyGenerated = false

  try {
    const crawlResults = await crawlAllSources()
    rawItems = flattenResults(crawlResults)
    console.log(`\n[去重] 原始 ${rawItems.length} 条`)
    const { unique } = dedupItems(rawItems)
    console.log(`[去重] 去重后 ${unique.length} 条`)

    const afterHardFilter = unique.filter(item => {
      if (isLowQualityConsumerContent(item.title, item.content)) return false
      if (isProcurementOrAd(item.title)) return false
      return true
    })
    console.log(`[硬过滤] 保留 ${afterHardFilter.length} 条`)

    const now = new Date()
    const cutoff72h = new Date(now.getTime() - 72 * 60 * 60 * 1000)
    const futureCutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const recentItems = afterHardFilter.filter(item => {
      const d = item.publishedAt ? new Date(item.publishedAt) : null
      if (!d) return false
      return d >= cutoff72h && d <= futureCutoff
    })
    console.log(`[日期过滤] 保留 ${recentItems.length} 条`)

    if (recentItems.length > 0) {
      console.log(`\n[AI处理] 五维评分，每批 ${BATCH_SIZE} 条`)
      const allResults: { raw: RawItem; category: string; summary: string; score: number; tags: string[] }[] = []

      for (let i = 0; i < recentItems.length; i += BATCH_SIZE) {
        const batch = recentItems.slice(i, i + BATCH_SIZE)
        console.log(`  批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(recentItems.length / BATCH_SIZE)} (${batch.length} 条)`)
        try {
          const batchResults = await batchClassify(
            batch.map(item => ({ title: item.title, content: item.content, source: item.source, publishedAt: item.publishedAt }))
          )
          for (let j = 0; j < batch.length; j++) {
            const r = batchResults[j]
            if (r) allResults.push({ raw: batch[j], ...r })
          }
          if (i + BATCH_SIZE < recentItems.length) await new Promise(r => setTimeout(r, 800))
        } catch (err) {
          console.error(`  ✗ 批次失败:`, (err as Error).message)
        }
      }

      console.log(`\n[存储] 共 ${allResults.length} 条待入库`)
      const sources = await loadActiveSources()
      const sourceMap = new Map(sources.map(s => [s.name, s.id]))

      for (const { raw, category, summary, score, tags } of allResults) {
        try {
          const exists = await prisma.item.findUnique({ where: { url: raw.url } })
          if (exists) { skipped++; continue }

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
              reason: score >= 6 ? '行业战略资讯，建议关注' : '行业相关资讯',
              score,
              isSelected: score >= 6,  // 严格：只有 >=6 才精选
              tags,
            },
          })
          added++
        } catch (err) {
          failed++
        }
      }
    }

    // ========== 5. 生成日报 ==========
    console.log('\n📰 生成日报...')
    const dailyItems = await prisma.item.findMany({
      where: { isSelected: true, publishedAt: { gte: yesterday } },
      orderBy: { score: 'desc' },
      take: 10,
    })

    console.log(`  精选内容: ${dailyItems.length} 条`)
    if (dailyItems.length === 0) {
      console.log('  ⚠ 无精选内容，跳过日报')
    } else {
      const dailyResult = await generateDailyWithSections(
        dailyItems.map(item => ({
          title: item.title,
          summary: item.summary || item.title,
          category: item.category,
          tags: item.tags,
        }))
      )

      const categoryGroups: Record<string, typeof dailyItems> = {}
      for (const item of dailyItems) {
        if (!categoryGroups[item.category]) categoryGroups[item.category] = []
        categoryGroups[item.category].push(item)
      }

      const sectionsData = dailyResult.sections
        .filter(s => categoryGroups[s.category] && categoryGroups[s.category].length > 0)
        .map(s => ({
          category: s.category,
          title: s.title,
          description: s.description,
          itemIds: categoryGroups[s.category].map(item => item.id),
          order: Object.keys(categoryGroups).indexOf(s.category),
        }))

      if (sectionsData.length === 0) {
        for (const [cat, group] of Object.entries(categoryGroups)) {
          sectionsData.push({ category: cat, title: group[0]?.source || cat, description: '', itemIds: group.map(i => i.id), order: 0 })
        }
      }

      const exists = await prisma.daily.findUnique({ where: { date: today } })
      if (exists) {
        await prisma.dailySection.deleteMany({ where: { dailyId: exists.id } })
        await prisma.daily.update({
          where: { id: exists.id },
          data: {
            title: dailyResult.title,
            summary: dailyResult.summary,
            editorNote: dailyResult.editorNote,
            itemIds: dailyItems.map(i => i.id),
            sectionCount: sectionsData.length,
          },
        })
        for (const section of sectionsData) {
          await prisma.dailySection.create({ data: { dailyId: exists.id, ...section } })
        }
        console.log(`  ✓ 日报已更新: ${dailyResult.title}`)
      } else {
        const daily = await prisma.daily.create({
          data: {
            date: today,
            title: dailyResult.title,
            summary: dailyResult.summary,
            editorNote: dailyResult.editorNote,
            itemIds: dailyItems.map(i => i.id),
            sectionCount: sectionsData.length,
          },
        })
        for (const section of sectionsData) {
          await prisma.dailySection.create({ data: { dailyId: daily.id, ...section } })
        }
        console.log(`  ✓ 日报已创建: ${dailyResult.title}`)
      }
      dailyGenerated = true
    }

    await prisma.crawlLog.update({
      where: { id: crawlLog.id },
      data: {
        status: 'success',
        endedAt: new Date(),
        totalFetched: rawItems.length,
        added,
        skipped,
        failed,
        dailyGenerated,
      },
    })

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ 同步完成')
    console.log(`  爬取: ${rawItems.length} 条, 新增: ${added}, 跳过: ${skipped}, 失败: ${failed}`)
    console.log(`  日报: ${dailyGenerated ? '✓' : '✗'}`)

  } catch (error) {
    await prisma.crawlLog.update({
      where: { id: crawlLog.id },
      data: { status: 'failed', endedAt: new Date(), errorMessage: (error as Error).message },
    })
    throw error
  }
}

main()
  .catch(e => {
    console.error('\n同步失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
