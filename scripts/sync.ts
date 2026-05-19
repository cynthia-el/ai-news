import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import { crawlAllSources, flattenResults, loadActiveSources } from '../src/lib/crawler'
import { dedupItems } from '../src/lib/crawler'
import { batchClassify, generateDeepReasons, generateDailyWithSections } from '../src/lib/ai'
import { RawItem } from '../src/lib/sources/types'

const BATCH_SIZE = 12

async function processCrawledItems(rawItems: RawItem[]) {
  let added = 0
  let skipped = 0
  let failed = 0

  // 1. 去重
  console.log(`\n[去重] 原始资讯 ${rawItems.length} 条`)
  const { unique } = dedupItems(rawItems)
  console.log(`[去重] 去重后 ${unique.length} 条`)

  // 2. 加载信源映射（name -> id）
  const sources = await loadActiveSources()
  const sourceMap = new Map<string, string>()
  for (const s of sources) {
    sourceMap.set(s.name, s.id)
  }

  // 3. 批量AI处理（分批次）
  console.log(`\n[AI处理] 开始批量分类评分，每批 ${BATCH_SIZE} 条`)

  const allResults: { raw: RawItem; category: string; summary: string; score: number; tags: string[] }[] = []

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE)
    console.log(`  处理批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(unique.length / BATCH_SIZE)} (${batch.length} 条)`)

    try {
      const batchResults = await batchClassify(
        batch.map((item) => ({ title: item.title, content: item.content }))
      )

      for (let j = 0; j < batch.length; j++) {
        const result = batchResults[j]
        if (result) {
          allResults.push({
            raw: batch[j],
            category: result.category,
            summary: result.summary,
            score: result.score,
            tags: result.tags,
          })
        }
      }

      // 避免请求过快
      if (i + BATCH_SIZE < unique.length) {
        await new Promise((resolve) => setTimeout(resolve, 800))
      }
    } catch (error) {
      console.error(`  ✗ 批次处理失败:`, (error as Error).message)
      // 批次失败时，全部按默认值处理
      for (const item of batch) {
        allResults.push({
          raw: item,
          category: 'industry-news',
          summary: item.title.slice(0, 30),
          score: 5,
          tags: [],
        })
      }
    }
  }

  // 4. 对高分条目生成深度推荐理由
  const highScoreItems = allResults.filter((r) => r.score >= 7)
  console.log(`\n[推荐理由] ${highScoreItems.length} 条高分条目需要生成深度推荐理由`)

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
          reasonsMap.set(idx, reasons[j] || '行业相关资讯，值得关注')
        }
        if (i + BATCH_SIZE < highScoreItems.length) {
          await new Promise((resolve) => setTimeout(resolve, 600))
        }
      } catch (error) {
        console.error(`  ✗ 推荐理由生成失败:`, (error as Error).message)
      }
    }
  }

  // 5. 存储到数据库
  console.log(`\n[存储] 开始写入数据库`)

  const sourceStats: Record<string, { fetched: number; added: number; failed: number }> = {}

  for (let i = 0; i < allResults.length; i++) {
    const { raw, category, summary, score, tags } = allResults[i]
    const reason = reasonsMap.get(i) || (score >= 7 ? '行业相关资讯，值得关注' : '行业相关资讯')

    // 初始化统计
    if (!sourceStats[raw.source]) {
      sourceStats[raw.source] = { fetched: 0, added: 0, failed: 0 }
    }
    sourceStats[raw.source].fetched++

    // 检查是否已存在
    try {
      const exists = await prisma.item.findUnique({
        where: { url: raw.url },
      })

      if (exists) {
        skipped++
        continue
      }

      // 存储
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
          isSelected: score >= 7,
          tags,
        },
      })

      added++
      sourceStats[raw.source].added++
      console.log(`  [${category}] ${raw.title.slice(0, 50)} (评分:${score})`)
    } catch (error) {
      failed++
      sourceStats[raw.source].failed++
      console.error(`  ✗ 存储失败: ${raw.title.slice(0, 40)}`, (error as Error).message)
    }
  }

  console.log(`\n处理结果: 新增 ${added} 条, 跳过 ${skipped} 条, 失败 ${failed} 条`)
  return { added, skipped, failed, sourceStats }
}

async function generateDaily() {
  const today = new Date().toISOString().split('T')[0]
  console.log(`\n📰 开始生成日报: ${today}`)

  // 获取最近24小时的精选内容
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const items = await prisma.item.findMany({
    where: {
      isSelected: true,
      publishedAt: { gte: yesterday },
    },
    orderBy: { score: 'desc' },
    take: 7,
  })

  if (items.length === 0) {
    console.log('  ⚠ 今日无精选内容，跳过日报生成')
    return false
  }

  console.log(`  找到 ${items.length} 条精选内容`)

  // 生成日报结构
  const dailyResult = await generateDailyWithSections(
    items.map((item) => ({
      title: item.title,
      summary: item.summary || item.title,
      category: item.category,
    }))
  )

  // 按分类分组
  const categoryGroups: Record<string, typeof items> = {}
  for (const item of items) {
    if (!categoryGroups[item.category]) categoryGroups[item.category] = []
    categoryGroups[item.category].push(item)
  }

  // 构建版块数据
  const sectionsData = dailyResult.sections
    .filter((s) => categoryGroups[s.category] && categoryGroups[s.category].length > 0)
    .map((s) => ({
      category: s.category,
      title: s.title,
      description: s.description,
      itemIds: categoryGroups[s.category].map((item) => item.id),
      order: Object.keys(categoryGroups).indexOf(s.category),
    }))

  // 如果没有AI返回的版块，手动创建
  if (sectionsData.length === 0) {
    for (const [category, group] of Object.entries(categoryGroups)) {
      sectionsData.push({
        category,
        title: group[0]?.source || category,
        description: '',
        itemIds: group.map((item) => item.id),
        order: 0,
      })
    }
  }

  // 检查是否已存在今日日报
  const exists = await prisma.daily.findUnique({
    where: { date: today },
  })

  if (exists) {
    // 删除旧版块
    await prisma.dailySection.deleteMany({
      where: { dailyId: exists.id },
    })

    // 更新日报
    await prisma.daily.update({
      where: { id: exists.id },
      data: {
        title: dailyResult.title,
        summary: dailyResult.summary,
        editorNote: dailyResult.editorNote,
        itemIds: items.map((item) => item.id),
        sectionCount: sectionsData.length,
      },
    })

    // 创建新版块
    for (const section of sectionsData) {
      await prisma.dailySection.create({
        data: {
          dailyId: exists.id,
          category: section.category,
          title: section.title,
          description: section.description,
          itemIds: section.itemIds,
          order: section.order,
        },
      })
    }

    console.log(`  ✓ 日报已更新: ${dailyResult.title} (${sectionsData.length} 个版块)`)
  } else {
    // 创建日报
    const daily = await prisma.daily.create({
      data: {
        date: today,
        title: dailyResult.title,
        summary: dailyResult.summary,
        editorNote: dailyResult.editorNote,
        itemIds: items.map((item) => item.id),
        sectionCount: sectionsData.length,
      },
    })

    // 创建版块
    for (const section of sectionsData) {
      await prisma.dailySection.create({
        data: {
          dailyId: daily.id,
          category: section.category,
          title: section.title,
          description: section.description,
          itemIds: section.itemIds,
          order: section.order,
        },
      })
    }

    console.log(`  ✓ 日报已创建: ${dailyResult.title} (${sectionsData.length} 个版块)`)
  }

  return true
}

async function main() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║      家居建材AI资讯 - 智能同步工具        ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log(`\n开始时间: ${new Date().toLocaleString('zh-CN')}`)

  // 创建采集日志记录
  const crawlLog = await prisma.crawlLog.create({
    data: {
      status: 'running',
      startedAt: new Date(),
    },
  })

  let rawItems: RawItem[] = []
  let result = { added: 0, skipped: 0, failed: 0, sourceStats: {} as Record<string, { fetched: number; added: number; failed: number }> }
  let dailyGenerated = false
  let errorMessage: string | null = null

  try {
    // 第1步：加载信源并爬取
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📡 第1步：加载信源并爬取')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const crawlResults = await crawlAllSources()
    rawItems = flattenResults(crawlResults)

    const sourceNames = [...new Set(rawItems.map((item) => item.source))]

    if (rawItems.length === 0) {
      console.log('\n⚠ 未获取到任何资讯，跳过后续步骤')

      await prisma.crawlLog.update({
        where: { id: crawlLog.id },
        data: {
          status: 'success',
          endedAt: new Date(),
          totalFetched: 0,
          sources: sourceNames,
        },
      })
      return
    }

    // 第2步：AI处理与存储
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🤖 第2步：AI处理与存储')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    result = await processCrawledItems(rawItems)

    // 第3步：生成日报
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    dailyGenerated = await generateDaily()

    // 更新采集日志
    await prisma.crawlLog.update({
      where: { id: crawlLog.id },
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

    // 汇总
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 同步完成')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`  爬取资讯: ${rawItems.length} 条`)
    console.log(`  新增入库: ${result.added} 条`)
    console.log(`  重复跳过: ${result.skipped} 条`)
    console.log(`  处理失败: ${result.failed} 条`)
    console.log(`  日报生成: ${dailyGenerated ? '✓' : '✗'}`)
    console.log(`\n结束时间: ${new Date().toLocaleString('zh-CN')}`)
  } catch (error) {
    errorMessage = (error as Error).message

    await prisma.crawlLog.update({
      where: { id: crawlLog.id },
      data: {
        status: 'failed',
        endedAt: new Date(),
        totalFetched: rawItems.length,
        added: result.added,
        skipped: result.skipped,
        failed: result.failed,
        errorMessage,
        dailyGenerated,
      },
    })

    throw error
  }
}

main()
  .catch((e) => {
    console.error('\n同步任务失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
