import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  const today = new Date().toISOString().split('T')[0]
  const daily = await prisma.daily.findUnique({
    where: { date: today },
    include: { sections: true },
  })
  if (!daily) {
    console.log('No daily report for', today)
    return
  }

  const items = await prisma.item.findMany({
    where: { id: { in: daily.itemIds } },
    orderBy: { score: 'desc' },
  })

  console.log(`Daily: ${daily.title} (${items.length} items)\n`)
  for (const item of items) {
    const d = item.publishedAt.toISOString().slice(0, 10)
    console.log(`[${item.score}] ${item.title}`)
    console.log(`  ${d} | ${item.source} | ${item.category}`)
    console.log(`  ${item.summary?.slice(0, 80) || ''}`)
    console.log()
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
