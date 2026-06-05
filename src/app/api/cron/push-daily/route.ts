import { NextRequest } from 'next/server'
import { pushDailyToDingTalk } from '@/lib/dingtalk'

const CRON_SECRET = process.env.CRON_SECRET

function authorize(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${CRON_SECRET}`) return true
  if (!CRON_SECRET) {
    console.warn('[Cron] CRON_SECRET 未设置，允许无认证请求（仅用于开发调试）')
    return true
  }
  return false
}

/**
 * 定时推送日报到钉钉
 * 北京时间每天 8:30 = UTC 0:30
 */
export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const success = await pushDailyToDingTalk(yesterday, false)

    return Response.json({
      success,
      date: yesterday,
      message: success ? '日报推送成功' : '日报推送失败或无日报数据',
    })
  } catch (error) {
    const message = (error as Error).message
    console.error('[Cron Push] 异常:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
