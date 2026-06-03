import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  const today = new Date().toISOString().split('T')[0]

  // 最近1小时入库
  const recentItems = await prisma.item.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    orderBy: { score: 'desc' },
    take: 20,
    select: { title: true, score: true, source: true, isSelected: true },
  })
  console.log('最近1小时入库:', recentItems.length, '条')
  recentItems.forEach((i) =>
    console.log(`  [${i.score}] ${i.title.slice(0, 50)} (${i.source})${i.isSelected ? ' ★' : ''}`),
  )

  // 精选数量
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const selected = await prisma.item.count({
    where: { isSelected: true, publishedAt: { gte: yesterday } },
  })
  console.log('\n近24小时精选:', selected, '条')

  // 日报
  const daily = await prisma.daily.findUnique({ where: { date: today } })
  console.log('今日日报:', daily ? daily.title : '无')

  // 信源统计
  const sourceStats = await prisma.item.groupBy({
    by: ['source'],
    _count: { source: true },
    orderBy: { _count: { source: 'desc' } },
    take: 10,
  })
  console.log('\n各信源入库数量:')
  sourceStats.forEach((s) => console.log(`  ${s.source}: ${s._count.source} 条`))
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect())
