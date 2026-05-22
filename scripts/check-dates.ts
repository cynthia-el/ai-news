import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  const items = await prisma.item.findMany({
    select: { title: true, url: true, publishedAt: true, score: true, isSelected: true, source: true },
    orderBy: { publishedAt: 'asc' }
  })

  console.log('All items by date:')
  items.forEach(i => {
    const isFallback = i.publishedAt.toISOString().startsWith('2026-05-20T08:5')
    const flag = isFallback ? '[FALLBACK]' : ''
    console.log(`  ${i.publishedAt.toISOString().slice(0,10)} ${i.score} ${flag} ${i.title.slice(0,50)}`)
  })

  console.log('\nSelected items:')
  items.filter(i => i.isSelected).forEach(i => {
    console.log(`  ${i.publishedAt.toISOString().slice(0,10)} ${i.score} ${i.source} ${i.title.slice(0,50)}`)
    console.log(`    URL: ${i.url}`)
  })

  await prisma.$disconnect()
}

main().catch((e: any) => { console.error(e); process.exit(1) })
