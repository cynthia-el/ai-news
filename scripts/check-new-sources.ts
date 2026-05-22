import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  for (const source of ['人造板行业', '定制家居动态', '陶瓷卫浴门窗', '智能家居']) {
    const items = await prisma.item.findMany({
      where: { source },
      select: { title: true, publishedAt: true, score: true, isSelected: true },
      orderBy: { publishedAt: 'desc' },
    })
    console.log(`\n=== ${source} (${items.length}条) ===`)
    for (const item of items) {
      const s = item.isSelected ? '*' : ' '
      console.log(`${s} ${item.publishedAt.toISOString().slice(0,10)} | ${item.score} | ${item.title.slice(0, 60)}`)
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
