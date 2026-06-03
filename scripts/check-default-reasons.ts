import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  // 找出所有默认解读的精选内容
  const defaultItems = await prisma.item.findMany({
    where: {
      isSelected: true,
      OR: [
        { reason: '行业战略资讯，建议关注' },
        { reason: '行业相关资讯' },
      ],
    },
    select: {
      id: true,
      title: true,
      summary: true,
      category: true,
      score: true,
      reason: true,
      publishedAt: true,
    },
    orderBy: { publishedAt: 'desc' },
  })

  console.log(`找到 ${defaultItems.length} 条默认解读的精选内容\n`)

  if (defaultItems.length === 0) {
    console.log('没有需要处理的内容')
    return
  }

  // 按日期分组统计
  const byDate: Record<string, number> = {}
  for (const item of defaultItems) {
    const date = item.publishedAt?.toISOString().split('T')[0] || 'unknown'
    byDate[date] = (byDate[date] || 0) + 1
  }

  console.log('按日期分布:')
  for (const [date, count] of Object.entries(byDate).sort()) {
    console.log(`  ${date}: ${count} 条`)
  }

  console.log('\n前 10 条示例:')
  defaultItems.slice(0, 10).forEach((item) => {
    console.log(`  [${item.score}] ${item.title.slice(0, 50)}... (${item.reason})`)
  })
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect())
