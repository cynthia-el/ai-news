import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  const items = await prisma.item.findMany({
    where: {
      title: { contains: '国家统计局公布' },
    },
    select: { title: true, url: true, score: true, source: true },
  })
  for (const item of items) {
    console.log(`[${item.score}] ${item.source}`)
    console.log(`  URL: ${item.url}`)
    console.log(`  Title: ${item.title}`)
    console.log()
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
