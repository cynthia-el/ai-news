/**
 * 轻量 JWT 认证工具
 *
 * 使用 jose 库签发和验证 JWT，存储在 httpOnly cookie 中
 */

import { timingSafeEqual } from 'crypto'
import { SignJWT, jwtVerify, JWTPayload } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const COOKIE_NAME = 'admin_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 天

interface AdminPayload extends JWTPayload {
  role: 'admin'
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY
  if (!secret) {
    throw new Error('JWT_SECRET 或 ENCRYPTION_KEY 环境变量未设置')
  }
  return new TextEncoder().encode(secret)
}

/** 签发 JWT token */
export async function signToken(): Promise<string> {
  const secret = getSecret()
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

/** 验证 JWT token */
export async function verifyToken(token: string): Promise<AdminPayload | null> {
  try {
    const secret = getSecret()
    const { payload } = await jwtVerify(token, secret, {
      clockTolerance: 60,
    })
    if (payload.role !== 'admin') return null
    return payload as AdminPayload
  } catch {
    return null
  }
}

/** 从请求中读取并验证 cookie */
export async function getSessionFromRequest(request: NextRequest): Promise<AdminPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

/** 从 Server Action / Server Component 中读取 session */
export async function getSession(): Promise<AdminPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

/** 设置登录 cookie */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

/** 清除登录 cookie */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}

/** API 路由认证守卫：未登录返回 401 */
export async function requireAuth(request: NextRequest): Promise<Response | null> {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

/** 校验管理员密码 */
export function verifyAdminPassword(password: string): boolean {
  const expected = 'fengyue'
  // 时间安全比较，防止时序攻击
  return safeTimingEqual(password, expected)
}

/** 时间安全字符串比较 */
function safeTimingEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // 为了防止时序攻击，仍然执行比较但不直接返回
    const dummy = 'x'.repeat(Math.max(a.length, b.length))
    timingSafeEqual(Buffer.from(a.padEnd(dummy.length, 'x')), Buffer.from(dummy))
    return false
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}
