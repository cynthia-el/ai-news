import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface Params {
  params: Promise<{ id: string }>
}

/** DELETE /api/admin/dingtalk-webhooks/:id - 删除 webhook */
export async function DELETE(request: NextRequest, { params }: Params) {
  const unauthorized = await requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params

    await prisma.dingTalkWebhook.delete({
      where: { id },
    })

    return Response.json({ success: true })
  } catch (error) {
    const message = (error as Error).message
    console.error('[DingTalkWebhooks] DELETE error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}

/** PATCH /api/admin/dingtalk-webhooks/:id - 启用/禁用 webhook */
export async function PATCH(request: NextRequest, { params }: Params) {
  const unauthorized = await requireAuth(request)
  if (unauthorized) return unauthorized

  try {
    const { id } = await params
    const body = await request.json()
    const { isActive } = body

    if (typeof isActive !== 'boolean') {
      return Response.json({ error: 'isActive 必须是布尔值' }, { status: 400 })
    }

    const webhook = await prisma.dingTalkWebhook.update({
      where: { id },
      data: { isActive },
    })

    return Response.json({ webhook })
  } catch (error) {
    const message = (error as Error).message
    console.error('[DingTalkWebhooks] PATCH error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
