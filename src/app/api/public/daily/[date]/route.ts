import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params

  const daily = await prisma.daily.findUnique({
    where: { date },
    include: {
      sections: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!daily) {
    return Response.json(
      { error: '日报不存在' },
      { status: 404 }
    )
  }

  const items = await prisma.item.findMany({
    where: {
      id: { in: daily.itemIds },
    },
    orderBy: { score: 'desc' },
    include: {
      sourceRef: {
        select: { id: true, name: true, type: true },
      },
    },
  })

  const sectionsWithItems = daily.sections.map((section) => ({
    ...section,
    items: items.filter((item) => section.itemIds.includes(item.id)),
  }))

  return Response.json({
    ...daily,
    items,
    sections: sectionsWithItems,
  })
}
