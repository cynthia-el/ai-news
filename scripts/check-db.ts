import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  const items = await prisma.item.findMany({
    select: { title: true, publishedAt: true, score: true, source: true },
    orderBy: { score: 'desc' }
  })
  console.log('Total items:', items.length)

  const oldItems = items.filter(i => {
    const y = new Date(i.publishedAt).getFullYear()
    return y < 2026
  })
  console.log('Items from before 2026:', oldItems.length)
  oldItems.slice(0, 10).forEach(i => {
    console.log(' ', i.publishedAt.toISOString().slice(0, 10), i.score, i.title.slice(0, 50))
  })

  const selected = await prisma.item.findMany({
    where: { isSelected: true },
    select: { title: true, score: true, summary: true, category: true, publishedAt: true },
    orderBy: { score: 'desc' }
  })
  console.log('\nSelected items:', selected.length)
  selected.forEach(i => {
    console.log(' ', i.score, i.category, i.title.slice(0, 60))
  })

  await prisma.$disconnect()
}

main().catch((e: any) => { console.error(e); process.exit(1) })
