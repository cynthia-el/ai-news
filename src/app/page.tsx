import { prisma } from '@/lib/prisma'
import HomeClient from './HomeClient'

// revalidate=0: Vercel上每次请求都刷新数据；静态导出时构建为静态HTML
export const revalidate = 0

export default async function Home() {
  const items = await prisma.item.findMany({
    orderBy: { publishedAt: 'desc' },
    take: 150,
    include: {
      sourceRef: {
        select: { name: true, type: true },
      },
    },
  })

  return <HomeClient initialItems={items} />
}
