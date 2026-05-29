import { prisma } from '@/lib/prisma'
import DailyClient from './DailyClient'

export const dynamic = 'force-dynamic'

export default async function DailyPage() {
  const today = new Date().toISOString().split('T')[0]

  const dailiesRaw = await prisma.daily.findMany({
    orderBy: { date: 'desc' },
    take: 60,
    include: {
      sections: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (dailiesRaw.length === 0) {
    return (
      <DailyClient
        dailies={[]}
        dates={[]}
        defaultDate={today}
      />
    )
  }

  // Collect all item IDs across all dailies
  const allItemIds = [...new Set(dailiesRaw.flatMap((d) => d.itemIds))]

  const items =
    allItemIds.length > 0
      ? await prisma.item.findMany({
          where: {
            id: { in: allItemIds },
          },
          orderBy: { score: 'desc' },
          include: {
            sourceRef: {
              select: { name: true, type: true },
            },
          },
        })
      : []

  const itemMap = new Map(items.map((i) => [i.id, i]))

  const dailies = dailiesRaw.map((daily) => {
    const dailyItems = daily.itemIds
      .map((id) => itemMap.get(id))
      .filter((item): item is NonNullable<typeof item> => item !== undefined)

    const sectionsWithItems = daily.sections.map((section) => ({
      ...section,
      items: section.itemIds
        .map((id) => itemMap.get(id))
        .filter((item): item is NonNullable<typeof item> => item !== undefined),
    }))

    return {
      ...daily,
      items: dailyItems,
      sections: sectionsWithItems,
    }
  })

  const dates = dailies.map((d) => ({
    date: d.date,
    title: d.title,
    summary: d.summary,
  }))

  const defaultDate = dailies.find((d) => d.date === today)?.date ?? dailies[0].date

  return <DailyClient dailies={dailies} dates={dates} defaultDate={defaultDate} />
}
