import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  // 找出最近7天内标题重复的文章（保留第一个，删除后面的）
  const recentItems = await prisma.item.findMany({
    where: {
      publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, title: true, publishedAt: true, score: true },
  })

  const seenTitles = new Map<string, { id: string; score: number }>()
  const toDelete: string[] = []

  for (const item of recentItems) {
    const normalized = item.title.toLowerCase().replace(/[\s\p{P}]/gu, '').trim()
    if (seenTitles.has(normalized)) {
      const existing = seenTitles.get(normalized)!
      // 保留分数更高的
      if (item.score > existing.score) {
        toDelete.push(existing.id)
        seenTitles.set(normalized, { id: item.id, score: item.score })
      } else {
        toDelete.push(item.id)
      }
    } else {
      seenTitles.set(normalized, { id: item.id, score: item.score })
    }
  }

  console.log(`Found ${toDelete.length} duplicates to delete`)

  if (toDelete.length > 0) {
    // 先删除关联的日报版块引用
    await prisma.dailySection.deleteMany({
      where: {
        itemIds: { hasSome: toDelete },
      },
    })

    await prisma.item.deleteMany({
      where: { id: { in: toDelete } },
    })
    console.log(`Deleted ${toDelete.length} duplicate items`)
  }

  await prisma.$disconnect()
}

main().catch(console.error)
