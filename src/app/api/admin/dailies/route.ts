import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET /api/admin/dailies - 获取日报列表
export async function GET(request: NextRequest) {
  const unauthorized = await requireAuth(request)
  if (unauthorized) return unauthorized
  const { searchParams } = request.nextUrl

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  const skip = (page - 1) * pageSize

  const [dailies, total] = await Promise.all([
    prisma.daily.findMany({
      orderBy: { date: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.daily.count(),
  ])

  // 获取每条日报包含的资讯数量
  const dailiesWithCount = await Promise.all(
    dailies.map(async (daily) => {
      const items = await prisma.item.findMany({
        where: { id: { in: daily.itemIds } },
        select: { id: true, title: true, score: true, category: true },
        orderBy: { score: 'desc' },
      })
      return {
        ...daily,
        itemCount: items.length,
        items,
      }
    })
  )

  return Response.json({
    dailies: dailiesWithCount,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
}

// DELETE /api/admin/dailies - 删除日报
export async function DELETE(request: NextRequest) {
  const unauthorized = await requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: '缺少 ids 参数' }, { status: 400 })
    }

    const result = await prisma.daily.deleteMany({
      where: { id: { in: ids } },
    })

    return Response.json({ success: true, count: result.count })
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
