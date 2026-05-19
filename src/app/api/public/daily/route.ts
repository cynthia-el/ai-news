import { prisma } from '@/lib/prisma'

export async function GET() {
  const today = new Date().toISOString().split('T')[0]

  const daily = await prisma.daily.findUnique({
    where: { date: today },
    include: {
      sections: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!daily) {
    return Response.json({
      date: today,
      title: '今日暂无日报',
      summary: '今日暂未生成日报，请查看实时资讯。',
      editorNote: '',
      items: [],
      sections: [],
    })
  }

  const items = await prisma.item.findMany({
    where: {
      id: { in: daily.itemIds },
    },
    orderBy: { score: 'desc' },
    take: 7,
    include: {
      sourceRef: {
        select: { id: true, name: true, type: true },
      },
    },
  })

  // 为每个版块填充条目
  const sectionsWithItems = daily.sections.map((section) => ({
    ...section,
    items: items.filter((item) => section.itemIds.includes(item.id)),
  }))

  const response = Response.json({
    ...daily,
    items,
    sections: sectionsWithItems,
  })
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  return response
}
