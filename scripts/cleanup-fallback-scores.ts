import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

/**
 * 清理 AI 评分 fallback 产生的垃圾数据
 * 特征：score=5, reason='行业相关资讯', summary 是标题截断
 */
async function main() {
  console.log('开始清理 fallback 评分数据...\n')

  // 找出问题数据：score=5 且 reason 是 fallback 默认值的记录
  const fallbackItems = await prisma.item.findMany({
    where: {
      score: 5,
      reason: '行业相关资讯',
    },
    select: {
      id: true,
      title: true,
      summary: true,
      score: true,
      reason: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  console.log(`找到 ${fallbackItems.length} 条疑似 fallback 记录`)

  // 进一步过滤：summary 等于 title.slice(0,50) 或 title.slice(0,30) 的
  const toDelete = fallbackItems.filter((item) => {
    const titlePrefix50 = item.title.slice(0, 50)
    const titlePrefix30 = item.title.slice(0, 30)
    return item.summary === titlePrefix50 || item.summary === titlePrefix30
  })

  console.log(`其中 ${toDelete.length} 条确认是 fallback 数据（summary=title截断）`)

  if (toDelete.length === 0) {
    console.log('没有需要删除的数据')
    return
  }

  // 打印前 10 条供确认
  console.log('\n前 10 条待删除记录：')
  toDelete.slice(0, 10).forEach((item) => {
    console.log(`  - ${item.title.slice(0, 60)}... (score=${item.score}, ${item.createdAt.toLocaleString('zh-CN')})`)
  })

  const ids = toDelete.map((i) => i.id)

  // 先解除 Daily 对这些 item 的引用
  const dailies = await prisma.daily.findMany({
    where: {
      itemIds: { hasSome: ids },
    },
  })

  for (const daily of dailies) {
    const newItemIds = daily.itemIds.filter((id) => !ids.includes(id))
    await prisma.daily.update({
      where: { id: daily.id },
      data: { itemIds: newItemIds },
    })
  }
  console.log(`\n已更新 ${dailies.length} 个日报的 itemIds 引用`)

  // 删除 DailySection 中引用这些 item 的关联
  const sections = await prisma.dailySection.findMany({
    where: {
      itemIds: { hasSome: ids },
    },
  })

  for (const section of sections) {
    const newItemIds = section.itemIds.filter((id) => !ids.includes(id))
    await prisma.dailySection.update({
      where: { id: section.id },
      data: { itemIds: newItemIds },
    })
  }
  console.log(`已更新 ${sections.length} 个日报版块的 itemIds 引用`)

  // 删除问题 item
  const deleteResult = await prisma.item.deleteMany({
    where: { id: { in: ids } },
  })

  console.log(`\n✓ 已删除 ${deleteResult.count} 条 fallback 评分数据`)
  console.log('请重新同步以获取正确的 AI 评分。')
}

main()
  .catch((e) => {
    console.error('清理失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
