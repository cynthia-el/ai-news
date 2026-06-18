import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import {
  getAllWeChatConfigs,
  createWeChatConfig,
  updateWeChatConfig,
  deleteWeChatConfig,
  pushDailyToWeChat,
} from '@/lib/wechat'

export const dynamic = 'force-dynamic'

/** GET /api/admin/wechat-configs - 列出所有微信配置（脱敏） */
export async function GET(request: NextRequest) {
  const unauthorized = await requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const configs = await getAllWeChatConfigs()
    return Response.json({ configs })
  } catch (error) {
    const message = (error as Error).message
    console.error('[WeChatConfigs] GET error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}

/** POST /api/admin/wechat-configs - 添加微信配置 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const { name, appId, appSecret, thumbMediaId, proxyUrl, accountType } = body

    if (!appId || typeof appId !== 'string' || appId.trim().length === 0) {
      return Response.json({ error: 'AppID 不能为空' }, { status: 400 })
    }

    if (!appSecret || typeof appSecret !== 'string' || appSecret.trim().length === 0) {
      return Response.json({ error: 'AppSecret 不能为空' }, { status: 400 })
    }

    const config = await createWeChatConfig({
      name: name?.trim() || '微信公众号',
      appId: appId.trim(),
      appSecret: appSecret.trim(),
      thumbMediaId: thumbMediaId?.trim(),
      proxyUrl: proxyUrl?.trim(),
      accountType: accountType || 'SUBSCRIPTION',
    })

    return Response.json({
      config,
      message: '添加成功',
    })
  } catch (error) {
    const message = (error as Error).message
    console.error('[WeChatConfigs] POST error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}

/** PATCH /api/admin/wechat-configs/:id - 更新微信配置 */
export async function PATCH(request: NextRequest) {
  const unauthorized = await requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return Response.json({ error: '缺少配置 ID' }, { status: 400 })
    }

    const body = await request.json()
    const { name, appId, appSecret, thumbMediaId, proxyUrl, accountType, isActive } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (appId !== undefined) updateData.appId = appId.trim()
    if (appSecret !== undefined) updateData.appSecret = appSecret.trim()
    if (thumbMediaId !== undefined) updateData.thumbMediaId = thumbMediaId.trim() || null
    if (proxyUrl !== undefined) updateData.proxyUrl = proxyUrl.trim() || null
    if (accountType !== undefined) updateData.accountType = accountType
    if (isActive !== undefined) updateData.isActive = isActive

    const config = await updateWeChatConfig(id, updateData)
    return Response.json({ config })
  } catch (error) {
    const message = (error as Error).message
    console.error('[WeChatConfigs] PATCH error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}

/** DELETE /api/admin/wechat-configs/:id - 删除微信配置 */
export async function DELETE(request: NextRequest) {
  const unauthorized = await requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return Response.json({ error: '缺少配置 ID' }, { status: 400 })
    }

    await deleteWeChatConfig(id)
    return Response.json({ success: true })
  } catch (error) {
    const message = (error as Error).message
    console.error('[WeChatConfigs] DELETE error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}

/** PUT /api/admin/wechat-configs/test - 测试推送昨日日报 */
export async function PUT(request: NextRequest) {
  const unauthorized = await requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const result = await pushDailyToWeChat(date || undefined)
    return Response.json(result)
  } catch (error) {
    const message = (error as Error).message
    console.error('[WeChatConfigs] PUT error:', message)
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
