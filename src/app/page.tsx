import { prisma } from '@/lib/prisma'
import HomeClient from './HomeClient'

// 静态导出时强制静态生成，Vercel SSR 时动态渲染以获取最新数据
export const dynamic = process.env.EXPORT_STATIC === '1' ? 'force-static' : 'force-dynamic'

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
