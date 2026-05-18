import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const mode = searchParams.get('mode') || 'selected'
  const since = searchParams.get('since')
  const until = searchParams.get('until')
  const days = searchParams.get('days')
  const category = searchParams.get('category')
  const source = searchParams.get('source')
  const q = searchParams.get('q')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 50)

  const where: any = {}

  if (mode === 'selected') {
    where.isSelected = true
  }

  // 时间筛选
  if (days) {
    const d = parseInt(days)
    if (!isNaN(d) && d > 0) {
      where.publishedAt = {
        gte: new Date(Date.now() - d * 24 * 60 * 60 * 1000),
      }
    }
  } else if (since || until) {
    where.publishedAt = {}
    if (since) {
      where.publishedAt.gte = new Date(since)
    }
    if (until) {
      where.publishedAt.lte = new Date(until)
    }
  }

  if (category) {
    where.category = category
  }

  if (source) {
    where.OR = [
      { source: { contains: source, mode: 'insensitive' } },
      { sourceId: source },
    ]
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { summary: { contains: q, mode: 'insensitive' } },
      { content: { contains: q, mode: 'insensitive' } },
      { reason: { contains: q, mode: 'insensitive' } },
      { tags: { has: q } },
    ]
  }

  const skip = (page - 1) * pageSize

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        sourceRef: {
          select: { id: true, name: true, type: true },
        },
      },
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
