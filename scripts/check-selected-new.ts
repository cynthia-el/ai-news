import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  const items = await prisma.item.findMany({
    where: { isSelected: true },
    select: { title: true, source: true, score: true, summary: true, category: true },
    orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
  })
  console.log('Selected items:', items.length)
  for (const item of items) {
    console.log(`\n[${item.score}] [${item.source}] ${item.title}`)
    console.log(`Summary: ${item.summary?.slice(0, 150)}...`)
    console.log(`Length: ${item.summary?.length || 0}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
