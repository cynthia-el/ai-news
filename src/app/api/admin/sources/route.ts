import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET /api/admin/sources - 列出所有信源
export async function GET(request: NextRequest) {
  const unauthorized = await requireAuth(request)
  if (unauthorized) return unauthorized

  const { searchParams } = request.nextUrl
  const type = searchParams.get('type')

  const where: any = {}
  if (type) where.type = type

  const sources = await prisma.source.findMany({
    where,
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  })

  return Response.json({ sources })
}

// POST /api/admin/sources - 添加信源
export async function POST(request: NextRequest) {
  const unauthorized = await requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { name, type, url, config, category, priority } = body

    if (!name || !type || !url) {
      return Response.json(
        { error: '缺少必填字段: name, type, url' },
        { status: 400 }
      )
    }

    const source = await prisma.source.create({
      data: {
        name,
        type,
        url,
        config: config || null,
        category: category || null,
        priority: priority ?? 0,
        isActive: true,
      },
    })

    return Response.json({ success: true, source })
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/sources - 更新信源
export async function PATCH(request: NextRequest) {
  const unauthorized = await requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return Response.json({ error: '缺少 id' }, { status: 400 })
    }

    const source = await prisma.source.update({
      where: { id },
      data,
    })

    return Response.json({ success: true, source })
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/sources - 删除信源
export async function DELETE(request: NextRequest) {
  const unauthorized = await requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: '缺少 ids 参数' }, { status: 400 })
    }

    const result = await prisma.source.deleteMany({
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
