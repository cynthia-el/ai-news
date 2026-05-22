import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  const items = await prisma.item.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: { title: true, source: true, score: true, summary: true, category: true },
  })
  for (const item of items) {
    console.log(`\n[${item.score}] [${item.category}] ${item.source}`)
    console.log(`Title: ${item.title}`)
    console.log(`Summary: ${item.summary?.slice(0, 200)}...`)
    console.log(`Summary length: ${item.summary?.length || 0} chars`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
