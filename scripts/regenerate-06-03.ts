import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import { batchClassify, generateDeepReasons, generateDailyWithSections } from '../src/lib/ai'

const BATCH_SIZE = 3

async function main() {
  const start = new Date('2026-06-03')
  const end = new Date('2026-06-04')
  const dateStr = '2026-06-03'

  console.log('📋 查找 06/03 的资讯...\n')
  const items = await prisma.item.findMany({
    where: { publishedAt: { gte: start, lt: end } },
    orderBy: { score: 'desc' },
  })

  console.log(`找到 ${items.length} 条 06/03 资讯\n`)

  if (items.length === 0) {
    console.log('无数据，退出')
    return
  }

  // 1. 重新生成摘要和分类
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🤖 重新生成摘要和分类（新逻辑，不截断）')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const updatedItems: typeof items = []

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    console.log(`\n批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)} (${batch.length} 条)`)

    try {
      const results = await batchClassify(
        batch.map((item) => ({
          title: item.title,
          content: item.content || item.title,
          source: item.source,
          publishedAt: item.publishedAt,
        }))
      )

      for (let j = 0; j < batch.length; j++) {
        const item = batch[j]
        const result = results[j]
        if (!result) {
          console.log(`  ⚠ [${item.id.slice(0, 8)}] 无结果`)
          continue
        }

        const newSummary = result.summary || item.summary || ''
        const newCategory = result.category || item.category
        const newScore = result.score ?? item.score
        const newTags = result.tags?.length ? result.tags : item.tags
        const isSelected = newScore >= 6

        await prisma.item.update({
          where: { id: item.id },
          data: {
            summary: newSummary,
            category: newCategory,
            score: newScore,
            tags: newTags,
            isSelected,
          },
        })

        updatedItems.push({ ...item, summary: newSummary, category: newCategory, score: newScore, tags: newTags, isSelected })

        const oldLen = item.summary?.length || 0
        const newLen = newSummary.length
        console.log(`  ✓ [${item.id.slice(0, 8)}] ${item.title.slice(0, 40)}...`)
        console.log(`    摘要: ${oldLen}字 → ${newLen}字`)
      }

      if (i + BATCH_SIZE < items.length) {
        await new Promise((r) => setTimeout(r, 3000))
      }
    } catch (err) {
      console.error(`  ✗ 批次失败:`, (err as Error).message)
    }
  }

  // 2. 重新生成解读（只给高分条目）
  const highScoreItems = updatedItems.filter((i) => i.score >= 6)
  if (highScoreItems.length > 0) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`💡 重新生成战略解读 (${highScoreItems.length} 条)`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    for (let i = 0; i < highScoreItems.length; i += BATCH_SIZE) {
      const batch = highScoreItems.slice(i, i + BATCH_SIZE)
      try {
        const reasons = await generateDeepReasons(
          batch.map((item) => ({
            title: item.title,
            summary: item.summary || item.title,
            category: item.category,
          }))
        )

        for (let j = 0; j < batch.length; j++) {
          const item = batch[j]
          const newReason = reasons[j]
          if (newReason && newReason !== '行业战略资讯，建议关注') {
            await prisma.item.update({
              where: { id: item.id },
              data: { reason: newReason },
            })
            const oldLen = item.reason?.length || 0
            console.log(`  ✓ [${item.id.slice(0, 8)}] ${item.title.slice(0, 40)}...`)
            console.log(`    解读: ${oldLen}字 → ${newReason.length}字`)
          }
        }

        if (i + BATCH_SIZE < highScoreItems.length) {
          await new Promise((r) => setTimeout(r, 3000))
        }
      } catch (err) {
        console.error(`  ✗ 解读批次失败:`, (err as Error).message)
      }
    }
  }

  // 3. 删除旧日报
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🗑️ 删除旧日报')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const existingDaily = await prisma.daily.findUnique({ where: { date: dateStr } })
  if (existingDaily) {
    await prisma.dailySection.deleteMany({ where: { dailyId: existingDaily.id } })
    await prisma.daily.delete({ where: { id: existingDaily.id } })
    console.log('已删除旧日报')
  } else {
    console.log('无旧日报')
  }

  // 4. 重新生成日报
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📰 重新生成日报')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const selectedItems = await prisma.item.findMany({
    where: { isSelected: true, publishedAt: { gte: start, lt: end } },
    orderBy: { score: 'desc' },
    take: 10,
  })

  if (selectedItems.length === 0) {
    console.log('无精选内容，跳过日报生成')
    return
  }

  const dailyResult = await generateDailyWithSections(
    selectedItems.map((item) => ({
      title: item.title,
      summary: item.summary || item.title,
      category: item.category,
      tags: item.tags,
    }))
  )

  const categoryGroups: Record<string, typeof selectedItems> = {}
  for (const item of selectedItems) {
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
      sectionsData.push({
        category,
        title: group[0]?.source || category,
        description: '',
        itemIds: group.map((item) => item.id),
        order: 0,
      })
    }
  }

  const daily = await prisma.daily.create({
    data: {
      date: dateStr,
      title: dailyResult.title,
      summary: dailyResult.summary,
      editorNote: dailyResult.editorNote,
      itemIds: selectedItems.map((i) => i.id),
      sectionCount: sectionsData.length,
    },
  })

  for (const section of sectionsData) {
    await prisma.dailySection.create({ data: { dailyId: daily.id, ...section } })
  }

  console.log(`✅ 日报生成完成: ${daily.title}`)
  console.log(`  精选条目: ${selectedItems.length}`)
  console.log(`  版块数: ${sectionsData.length}`)
  console.log(`  日期: ${dateStr}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
