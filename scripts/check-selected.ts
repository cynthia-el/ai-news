import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  const items = await prisma.item.findMany({
    where: { isSelected: true },
    select: { title: true, source: true, publishedAt: true, score: true, category: true, summary: true },
    orderBy: { score: 'desc' },
  })
  console.log('Selected items:', items.length)
  for (const item of items) {
    const d = item.publishedAt.toISOString().slice(0, 10)
    console.log(`\n[${item.score}] [${item.category}] ${item.title}`)
    console.log(`  ${d} | ${item.source}`)
    console.log(`  ${item.summary?.slice(0, 80) || ''}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
