import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

/**
 * 清理最近同步产生的 fallback 评分数据
 */
async function main() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

  const recentItems = await prisma.item.findMany({
    where: {
      score: 5,
      reason: '行业相关资讯',
      createdAt: { gte: fiveMinutesAgo },
    },
    select: { id: true, title: true },
  })

  console.log(`找到 ${recentItems.length} 条最近产生的 fallback 记录`)

  if (recentItems.length === 0) {
    console.log('没有需要清理的数据')
    return
  }

  const ids = recentItems.map((i) => i.id)

  // 解除日报引用
  const dailies = await prisma.daily.findMany({
    where: { itemIds: { hasSome: ids } },
  })
  for (const daily of dailies) {
    await prisma.daily.update({
      where: { id: daily.id },
      data: { itemIds: daily.itemIds.filter((id) => !ids.includes(id)) },
    })
  }

  const sections = await prisma.dailySection.findMany({
    where: { itemIds: { hasSome: ids } },
  })
  for (const section of sections) {
    await prisma.dailySection.update({
      where: { id: section.id },
      data: { itemIds: section.itemIds.filter((id) => !ids.includes(id)) },
    })
  }

  const result = await prisma.item.deleteMany({
    where: { id: { in: ids } },
  })

  console.log(`✓ 已删除 ${result.count} 条 fallback 数据`)
}

main()
  .catch((e) => {
    console.error('清理失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
