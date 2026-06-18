import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getWeChatConfigById, updateWeChatConfig, uploadThumbMedia } from '@/lib/wechat'

export const dynamic = 'force-dynamic'

/** POST /api/admin/wechat-configs/upload-thumb - 上传封面图到微信素材库 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const formData = await request.formData()
    const id = formData.get('id') as string | null
    const file = formData.get('file') as File | null

    if (!id) {
      return Response.json({ error: '缺少配置 ID' }, { status: 400 })
    }
    if (!file) {
      return Response.json({ error: '请选择图片文件' }, { status: 400 })
    }

    const config = await getWeChatConfigById(id)
    if (!config) {
      return Response.json({ error: '配置不存在' }, { status: 404 })
    }

    if (!config.appSecret) {
      return Response.json({ error: 'AppSecret 未配置' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const thumbMediaId = await uploadThumbMedia(config, buffer, file.name)

    await updateWeChatConfig(id, { thumbMediaId })

    return Response.json({ success: true, thumbMediaId })
  } catch (error) {
    const message = (error as Error).message
    console.error('[WeChatConfigs] uploadThumb error:', message)
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
