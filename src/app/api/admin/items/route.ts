import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET /api/admin/items - 获取资讯列表（带分页和筛选）
export async function GET(request: NextRequest) {
  const unauthorized = await requireAuth(request)
  if (unauthorized) return unauthorized
  const { searchParams } = request.nextUrl

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const category = searchParams.get('category') || ''
  const status = searchParams.get('status') || '' // all | selected | unselected
  const q = searchParams.get('q') || ''

  const where: any = {}

  if (category) {
    where.category = category
  }

  if (status === 'selected') {
    where.isSelected = true
  } else if (status === 'unselected') {
    where.isSelected = false
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { summary: { contains: q, mode: 'insensitive' } },
    ]
  }

  const skip = (page - 1) * pageSize

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.item.count({ where }),
  ])

  return Response.json({
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
}

// PATCH /api/admin/items - 批量更新资讯
export async function PATCH(request: NextRequest) {
  const unauthorized = await requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { ids, action, data } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: '缺少 ids 参数' }, { status: 400 })
    }

    if (action === 'update') {
      const result = await prisma.item.updateMany({
        where: { id: { in: ids } },
        data,
      })
      return Response.json({ success: true, count: result.count })
    }

    if (action === 'delete') {
      const result = await prisma.item.deleteMany({
        where: { id: { in: ids } },
      })
      return Response.json({ success: true, count: result.count })
    }

    return Response.json({ error: '未知的 action' }, { status: 400 })
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
