import { prisma } from '@/lib/prisma'
import HomeClient from './HomeClient'

export const dynamic = 'force-static'

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
