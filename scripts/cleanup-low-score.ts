import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('【清理】删除 score < 3 的低质量数据...\n')

  const lowScoreItems = await prisma.item.findMany({
    where: { score: { lt: 3 } },
    select: { id: true },
  })

  const ids = lowScoreItems.map((i) => i.id)
  console.log(`找到 ${ids.length} 条 score < 3 的记录`)

  if (ids.length === 0) {
    console.log('没有需要清理的数据')
    return
  }

  // 解除日报引用
  const dailies = await prisma.daily.findMany({
    where: { itemIds: { hasSome: ids } },
  })
  for (const d of dailies) {
    await prisma.daily.update({
      where: { id: d.id },
      data: { itemIds: d.itemIds.filter((id) => !ids.includes(id)) },
    })
  }
  console.log(`  已更新 ${dailies.length} 个日报引用`)

  const sections = await prisma.dailySection.findMany({
    where: { itemIds: { hasSome: ids } },
  })
  for (const s of sections) {
    await prisma.dailySection.update({
      where: { id: s.id },
      data: { itemIds: s.itemIds.filter((id) => !ids.includes(id)) },
    })
  }
  console.log(`  已更新 ${sections.length} 个日报版块引用`)

  const result = await prisma.item.deleteMany({
    where: { id: { in: ids } },
  })
  console.log(`\n✓ 已删除 ${result.count} 条低质量数据`)
}

main()
  .catch((e) => {
    console.error('清理失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
