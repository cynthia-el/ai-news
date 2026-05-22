import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  const items = await prisma.item.findMany({
    select: { title: true, url: true, publishedAt: true, score: true, summary: true, source: true },
    orderBy: { score: 'desc' }
  })
  console.log('All items:', items.length)
  items.forEach(i => {
    console.log(' ', i.publishedAt.toISOString().slice(0,10), i.score, i.source, i.title)
    console.log('    URL:', i.url)
  })
  await prisma.$disconnect()
}

main().catch((e: any) => { console.error(e); process.exit(1) })
