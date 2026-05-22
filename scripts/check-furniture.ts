import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  const items = await prisma.item.findMany({
    where: { source: '家具行业资讯' },
    select: { title: true, publishedAt: true, score: true },
    orderBy: { publishedAt: 'desc' },
  })
  console.log('家具行业资讯 items:', items.length)
  for (const item of items) {
    console.log(item.publishedAt.toISOString().slice(0,10), '|', item.score, '|', item.title.slice(0, 50))
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
