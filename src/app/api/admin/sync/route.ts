import { NextRequest } from 'next/server'
import { startBackgroundSync } from '@/lib/sync'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const crawlLog = await prisma.crawlLog.create({
      data: { status: 'running', startedAt: new Date() },
    })

    // Fire and forget — start sync in background, return immediately
    startBackgroundSync(crawlLog.id)

    return Response.json({
      accepted: true,
      logId: crawlLog.id,
      message: '同步任务已启动，正在后台执行',
    })
  } catch (error) {
    const message = (error as Error).message
    return Response.json({ error: message }, { status: 500 })
  }
}
