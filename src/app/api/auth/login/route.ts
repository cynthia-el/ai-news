import { NextRequest } from 'next/server'
import { signToken, verifyAdminPassword, setSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password || typeof password !== 'string') {
      return Response.json({ error: '密码不能为空' }, { status: 400 })
    }

    if (!verifyAdminPassword(password)) {
      return Response.json({ error: '密码错误' }, { status: 401 })
    }

    const token = await signToken()
    await setSessionCookie(token)

    return Response.json({ success: true })
  } catch (error) {
    const message = (error as Error).message
    console.error('[Auth] Login error:', message)
    return Response.json({ error: '登录失败' }, { status: 500 })
  }
}
