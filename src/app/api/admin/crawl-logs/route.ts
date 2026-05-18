import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/crawl-logs - 获取采集历史
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const status = searchParams.get('status') || ''

  const where: any = {}

  if (status) {
    where.status = status
  }

  const skip = (page - 1) * pageSize

  const [logs, total] = await Promise.all([
    prisma.crawlLog.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.crawlLog.count({ where }),
  ])

  return Response.json({
    logs,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
}
