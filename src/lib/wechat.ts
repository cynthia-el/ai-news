import crypto from 'crypto'
import { prisma } from './prisma'
import { encrypt, decrypt } from './crypto'

const WECHAT_API_BASE = 'https://api.weixin.qq.com/cgi-bin'

const PROXY_SECRET = process.env.WECHAT_PROXY_SECRET || ''

/** 构造实际请求的 URL：如果配置了代理，则通过代理转发 */
function buildWeChatUrl(config: WeChatConfigWithSecret, wechatUrl: string): string {
  if (!config.proxyUrl) return wechatUrl
  const proxy = config.proxyUrl.replace(/\/$/, '')
  const url = `${proxy}/proxy?url=${encodeURIComponent(wechatUrl)}`
  return url
}

/** 发起请求，自动处理代理鉴权 */
async function wechatFetch(
  config: WeChatConfigWithSecret,
  wechatUrl: string,
  init: RequestInit = {}
): Promise<Response> {
  const url = buildWeChatUrl(config, wechatUrl)
  const headers = new Headers(init.headers || {})

  if (config.proxyUrl && PROXY_SECRET) {
    headers.set('Authorization', `Bearer ${PROXY_SECRET}`)
  }

  console.log('[wechatFetch] request url:', url)
  console.log('[wechatFetch] request method:', init.method || 'GET')
  console.log('[wechatFetch] request headers:', Object.fromEntries(headers.entries()))

  try {
    const res = await fetch(url, { ...init, headers })
    const cloned = res.clone()
    const text = await cloned.text()
    console.log('[wechatFetch] response status:', res.status)
    console.log('[wechatFetch] response body:', text.slice(0, 1000))
    return res
  } catch (err) {
    console.error('[wechatFetch] fetch error:', (err as Error).message)
    throw err
  }
}

interface WeChatTokenResponse {
  access_token?: string
  expires_in?: number
  errcode?: number
  errmsg?: string
}

interface WeChatDraftResponse {
  media_id?: string
  errcode?: number
  errmsg?: string
}

interface WeChatPublishResponse {
  publish_id?: string
  errcode?: number
  errmsg?: string
}

export interface WeChatConfigWithSecret {
  id: string
  name: string
  appId: string
  appSecret: string
  thumbMediaId: string | null
  proxyUrl: string | null
  accountType: string
  isActive: boolean
}

/** 内存中缓存 access_token，减少重复请求 */
const tokenCache = new Map<
  string,
  { token: string; expiresAt: number }
>()

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

function encryptSecret(secret: string | null | undefined): string | null {
  if (!secret || secret.trim() === '') return null
  return encrypt(secret.trim())
}

function decryptSecret(encrypted: string | null): string | null {
  if (!encrypted) return null
  try {
    return decrypt(encrypted)
  } catch {
    return encrypted
  }
}

/** 获取可用的微信公众号配置 */
export async function getActiveWeChatConfig(): Promise<WeChatConfigWithSecret | null> {
  const row = await prisma.weChatConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!row) return null
  return {
    ...row,
    appSecret: decryptSecret(row.appSecret) || '',
  }
}

/** 根据 ID 获取微信公众号配置 */
export async function getWeChatConfigById(id: string): Promise<WeChatConfigWithSecret | null> {
  const row = await prisma.weChatConfig.findUnique({
    where: { id },
  })
  if (!row) return null
  return {
    ...row,
    appSecret: decryptSecret(row.appSecret) || '',
  }
}

/** 获取 access_token（带缓存） */
async function getAccessToken(config: WeChatConfigWithSecret): Promise<string> {
  const cached = tokenCache.get(config.appId)
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token
  }

  const url = `${WECHAT_API_BASE}/token?grant_type=client_credential&appid=${config.appId}&secret=${config.appSecret}`
  console.log('[getAccessToken] wechat url:', url)
  const res = await wechatFetch(config, url)
  const data = (await res.json()) as WeChatTokenResponse
  console.log('[getAccessToken] parsed data:', data)

  if (!data.access_token) {
    throw new Error(`获取微信 access_token 失败: ${data.errmsg || '未知错误'} (${data.errcode})`)
  }

  tokenCache.set(config.appId, {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 7200) * 1000,
  })

  return data.access_token
}

/** 上传缩略图到微信素材库，返回 thumb_media_id */
export async function uploadThumbMedia(
  config: WeChatConfigWithSecret,
  imageBuffer: Buffer,
  filename: string = 'thumb.jpg'
): Promise<string> {
  const token = await getAccessToken(config)
  const url = `${WECHAT_API_BASE}/media/upload?access_token=${token}&type=thumb`

  const boundary = `----WeChatFormBoundary${crypto.randomBytes(8).toString('hex')}`
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\n`, 'utf8'),
    Buffer.from(`Content-Disposition: form-data; name="media"; filename="${filename}"\r\n`, 'utf8'),
    Buffer.from('Content-Type: image/jpeg\r\n\r\n', 'utf8'),
    imageBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'),
  ])

  const res = await wechatFetch(config, url, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  })

  const data = (await res.json()) as { thumb_media_id?: string; media_id?: string; errcode?: number; errmsg?: string }
  if (!data.thumb_media_id && !data.media_id) {
    throw new Error(`上传微信缩略图失败: ${data.errmsg || '未知错误'} (${data.errcode})`)
  }

  return data.thumb_media_id || data.media_id!
}

/** 把 Markdown 简单转换为微信图文可用的 HTML */
function markdownToHtml(markdown: string): string {
  return (
    markdown
      // 转义 HTML 特殊字符
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // 加粗
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // 无序列表
      .replace(/^\s*[-*]\s+(.+)$/gm, '<p>• $1</p>')
      // 段落
      .split(/\n\n+/)
      .map((p) => (p.trim().startsWith('<p>') ? p : `<p>${p.replace(/\n/g, '<br>')}</p>`))
      .join('')
  )
}

function buildDailyHtml(
  daily: {
    date: string
    title: string
    summary: string
    editorNote: string | null
    sections: {
      category: string
      title: string
      description: string | null
      itemIds: string[]
    }[]
  },
  items: Map<string, { title: string; url: string; score: number; summary: string | null }>
): string {
  const d = new Date(daily.date + 'T00:00:00')
  const month = d.getMonth() + 1
  const day = d.getDate()
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]

  const orderedItems: { title: string; url: string; score: number; summary: string | null }[] = []
  const seenIds = new Set<string>()
  for (const section of daily.sections) {
    for (const id of section.itemIds) {
      if (seenIds.has(id)) continue
      const item = items.get(id)
      if (item) {
        seenIds.add(id)
        orderedItems.push(item)
      }
    }
  }

  let html = `<section style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.8; color: #333;">`
  html += `<h2 style="color: #1a1a1a; margin-bottom: 8px;">${daily.title}</h2>`
  html += `<p style="color: #888; font-size: 14px; margin-bottom: 24px;">${month}月${day}日，星期${week}</p>`

  if (daily.summary) {
    html += `<p style="background: #f5f5f5; padding: 12px 16px; border-radius: 8px; color: #555;"><strong>📌 日报导读</strong><br>${markdownToHtml(daily.summary)}</p>`
  }

  html += `<h3 style="margin-top: 28px;">精选资讯（共 ${orderedItems.length} 条）</h3>`

  for (let i = 0; i < orderedItems.length; i++) {
    const item = orderedItems[i]
    const titleStyle = item.score >= 8 ? 'color: #d32f2f; font-weight: bold;' : 'color: #1a1a1a;'
    html += `<div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #eee;">`
    html += `<p style="margin: 0 0 6px;"><span style="color: #888; margin-right: 8px;">${i + 1}.</span><a href="${item.url}" style="${titleStyle} text-decoration: none;">${item.title}</a></p>`
    if (item.summary) {
      html += `<p style="margin: 6px 0 0; color: #666; font-size: 14px;">${markdownToHtml(item.summary)}</p>`
    }
    html += `</div>`
  }

  if (daily.editorNote) {
    html += `<p style="margin-top: 24px; color: #888; font-size: 14px;"><strong>编者注：</strong>${markdownToHtml(daily.editorNote)}</p>`
  }

  html += `<p style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; color: #999; font-size: 13px;">`
  html += `<a href="${getSiteUrl()}/daily/${daily.date}" style="color: #1976d2; text-decoration: none;">查看完整日报及历史归档 →</a>`
  html += `</p>`
  html += `</section>`

  return html
}

/** 创建微信图文草稿 */
async function createDraft(
  config: WeChatConfigWithSecret,
  daily: {
    date: string
    title: string
    summary: string
    editorNote: string | null
    sections: {
      category: string
      title: string
      description: string | null
      itemIds: string[]
    }[]
  },
  items: Map<string, { title: string; url: string; score: number; summary: string | null }>
): Promise<string> {
  const token = await getAccessToken(config)
  const url = `${WECHAT_API_BASE}/draft/add?access_token=${token}`

  if (!config.thumbMediaId) {
    throw new Error('未配置微信公众号默认封面图素材ID（thumbMediaId），请先上传封面图')
  }

  const d = new Date(daily.date + 'T00:00:00')
  const dateLabel = `${d.getMonth() + 1}月${d.getDate()}日`
  const content = buildDailyHtml(daily, items)
  const digest = daily.summary.slice(0, 120)

  const payload = {
    articles: [
      {
        title: `${daily.title} · ${dateLabel}`,
        author: getSiteUrl(),
        digest,
        content,
        content_source_url: `${getSiteUrl()}/daily/${daily.date}`,
        thumb_media_id: config.thumbMediaId,
        need_open_comment: 0,
        only_fans_can_comment: 0,
      },
    ],
  }

  const res = await wechatFetch(config, url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  })

  const data = (await res.json()) as WeChatDraftResponse
  if (!data.media_id) {
    throw new Error(`创建微信草稿失败: ${data.errmsg || '未知错误'} (${data.errcode})`)
  }

  return data.media_id
}

/** 发布微信图文草稿 */
async function publishDraft(config: WeChatConfigWithSecret, mediaId: string): Promise<string> {
  const token = await getAccessToken(config)
  const url = `${WECHAT_API_BASE}/freepublish/submit?access_token=${token}`

  const res = await wechatFetch(config, url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ media_id: mediaId }),
  })

  const data = (await res.json()) as WeChatPublishResponse
  if (!data.publish_id) {
    throw new Error(`发布微信图文失败: ${data.errmsg || '未知错误'} (${data.errcode})`)
  }

  return data.publish_id
}

/** 推送指定日期日报到微信公众号 */
export async function pushDailyToWeChat(
  dateStr?: string
): Promise<{ success: boolean; date: string; publishId?: string; error?: string }> {
  const targetDate = dateStr || new Date(Date.now() - 86400000).toISOString().split('T')[0]

  console.log(`\n📲 开始推送日报到微信公众号: ${targetDate}`)

  const config = await getActiveWeChatConfig()
  if (!config) {
    console.log('⚠️  未配置微信公众号，跳过推送')
    return { success: false, date: targetDate, error: '未配置微信公众号' }
  }

  const daily = await prisma.daily.findUnique({
    where: { date: targetDate },
    include: { sections: { orderBy: { order: 'asc' } } },
  })

  if (!daily) {
    console.log(`⚠️  ${targetDate} 暂无日报，跳过推送`)
    return { success: false, date: targetDate, error: '暂无日报' }
  }

  const allItemIds = daily.sections.flatMap((s) => s.itemIds)
  const itemsRaw = await prisma.item.findMany({
    where: { id: { in: allItemIds } },
    select: { id: true, title: true, url: true, score: true, summary: true },
  })

  const itemMap = new Map(
    itemsRaw.map((i) => [
      i.id,
      { title: i.title, url: i.url, score: i.score, summary: i.summary },
    ])
  )

  try {
    const mediaId = await createDraft(config, daily, itemMap)
    const publishId = await publishDraft(config, mediaId)

    await prisma.weChatConfig.update({
      where: { id: config.id },
      data: { lastPushedAt: new Date() },
    })

    console.log(`✅ 微信公众号推送成功: publish_id=${publishId}`)
    return { success: true, date: targetDate, publishId }
  } catch (error) {
    const message = (error as Error).message
    await prisma.weChatConfig.update({
      where: { id: config.id },
      data: { lastError: message },
    })
    console.error(`❌ 微信公众号推送失败: ${message}`)
    return { success: false, date: targetDate, error: message }
  }
}

/** 管理后台：列出所有微信配置 */
export async function getAllWeChatConfigs() {
  const rows = await prisma.weChatConfig.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    ...r,
    appSecret: maskSecret(decryptSecret(r.appSecret)),
  }))
}

function maskSecret(secret: string | null): string | null {
  if (!secret) return null
  if (secret.length <= 8) return '****'
  return secret.slice(0, 2) + '****' + secret.slice(-2)
}

/** 管理后台：创建微信配置 */
export async function createWeChatConfig(data: {
  name: string
  appId: string
  appSecret: string
  thumbMediaId?: string
  proxyUrl?: string
  accountType?: string
}) {
  return prisma.weChatConfig.create({
    data: {
      name: data.name,
      appId: data.appId,
      appSecret: encryptSecret(data.appSecret) || '',
      thumbMediaId: data.thumbMediaId || null,
      proxyUrl: data.proxyUrl || null,
      accountType: data.accountType || 'SUBSCRIPTION',
    },
  })
}

/** 管理后台：更新微信配置 */
export async function updateWeChatConfig(
  id: string,
  data: {
    name?: string
    appId?: string
    appSecret?: string
    thumbMediaId?: string
    proxyUrl?: string
    accountType?: string
    isActive?: boolean
  }
) {
  const updateData: Record<string, unknown> = { ...data }
  if (data.appSecret !== undefined) {
    updateData.appSecret = encryptSecret(data.appSecret) || ''
  }
  return prisma.weChatConfig.update({
    where: { id },
    data: updateData,
  })
}

/** 管理后台：删除微信配置 */
export async function deleteWeChatConfig(id: string) {
  return prisma.weChatConfig.delete({ where: { id } })
}
