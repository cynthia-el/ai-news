import { NextRequest } from 'next/server'
import { runSync } from '@/lib/sync'

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

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runSync()
    return Response.json(result)
  } catch (error) {
    const message = (error as Error).message
    return Response.json({ error: message }, { status: 500 })
  }
}
