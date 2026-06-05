import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const unauthorized = await requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const log = await prisma.crawlLog.findFirst({
      orderBy: { startedAt: 'desc' },
    })

    if (!log) {
      return Response.json({ status: 'idle' })
    }

    return Response.json({
      status: log.status,
      startedAt: log.startedAt,
      endedAt: log.endedAt,
      totalFetched: log.totalFetched,
      added: log.added,
      skipped: log.skipped,
      failed: log.failed,
      dailyGenerated: log.dailyGenerated,
      errorMessage: log.errorMessage,
    })
  } catch (error) {
    const message = (error as Error).message
    return Response.json({ error: message }, { status: 500 })
  }
}
