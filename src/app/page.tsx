import { prisma } from '@/lib/prisma'
import HomeClient from './HomeClient'

export default async function Home() {
  // Vercel SSR 时禁用缓存以获取最新数据；静态导出时允许静态生成
  if (!process.env.EXPORT_STATIC) {
    const { unstable_noStore: noStore } = await import('next/cache')
    noStore()
  }
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
