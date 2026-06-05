import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import {
  pushDailyToDingTalk,
  isValidDingTalkWebhookUrl,
  createWebhook,
  getAllWebhooks,
  decryptSecret,
} from '@/lib/dingtalk'

export const dynamic = 'force-dynamic'

/** GET /api/admin/dingtalk-webhooks - 列出所有 webhook（脱敏） */
export async function GET(request: NextRequest) {
  const unauthorized = await requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const webhooks = await getAllWebhooks()
    return Response.json({ webhooks })
  } catch (error) {
    const message = (error as Error).message
    console.error('[DingTalkWebhooks] GET error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}

/** POST /api/admin/dingtalk-webhooks - 添加 webhook 并触发当日推送 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { name, url, secret } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return Response.json({ error: '群名称不能为空' }, { status: 400 })
    }

    if (!url || typeof url !== 'string' || !isValidDingTalkWebhookUrl(url)) {
      return Response.json(
        { error: 'Webhook URL 格式不正确，必须是 https://oapi.dingtalk.com/robot/send?access_token=xxx' },
        { status: 400 }
      )
    }

    // 检查是否已存在相同 URL
    const all = await getAllWebhooks()
    if (all.some((w) => w.url === url.trim())) {
      return Response.json({ error: '该 Webhook 已存在' }, { status: 409 })
    }

    const webhook = await createWebhook({
      name: name.trim(),
      url: url.trim(),
      secret: secret?.trim(),
    })

    // 首次添加时触发当日推送（推送昨天的日报）
    let pushResult = null
    try {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      pushResult = await pushDailyToDingTalk(yesterday, false, [
        { url: webhook.url, secret: decryptSecret(webhook.secret) },
      ])
    } catch (pushErr) {
      console.error('[DingTalkWebhooks] 首次推送失败:', (pushErr as Error).message)
    }

    return Response.json({
      webhook,
      pushResult,
      message: pushResult?.success
        ? `添加成功，已向该群推送 ${pushResult.pushedCount}/${pushResult.totalCount} 条日报`
        : '添加成功，但首次推送失败或暂无日报数据',
    })
  } catch (error) {
    const message = (error as Error).message
    console.error('[DingTalkWebhooks] POST error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
