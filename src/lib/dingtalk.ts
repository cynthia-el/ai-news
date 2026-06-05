import crypto from 'crypto'
import { prisma } from './prisma'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-site.com'

interface DingTalkResponse {
  errcode: number
  errmsg: string
}

export interface WebhookConfig {
  url: string
  secret?: string | null
}

/** 钉钉加签算法：HMAC-SHA256(base64) */
function generateSign(secret: string): { timestamp: string; sign: string } {
  const timestamp = String(Date.now())
  const stringToSign = `${timestamp}\n${secret}`
  const sign = crypto
    .createHmac('sha256', secret)
    .update(stringToSign)
    .digest('base64')
  return { timestamp, sign }
}

/** 构建带签名的钉钉 Webhook URL */
function buildSignedUrl(baseUrl: string, secret?: string | null): string {
  if (!secret) return baseUrl
  const { timestamp, sign } = generateSign(secret)
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`
}

/** 发送 markdown 消息到指定的钉钉 webhook */
export async function sendDingTalkMarkdownToWebhook(
  webhook: WebhookConfig,
  title: string,
  markdownText: string,
  atAll: boolean = false
): Promise<boolean> {
  const url = buildSignedUrl(webhook.url, webhook.secret)

  try {
    const payload: {
      msgtype: string
      markdown: { title: string; text: string }
      at?: { isAtAll: boolean }
    } = {
      msgtype: 'markdown',
      markdown: { title, text: markdownText },
    }
    if (atAll) {
      payload.at = { isAtAll: true }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = (await res.json()) as DingTalkResponse
    if (data.errcode !== 0) {
      console.error('❌ 钉钉推送失败:', data.errmsg)
      return false
    }

    console.log('✅ 钉钉推送成功:', webhook.url.slice(0, 50) + '...')
    return true
  } catch (error) {
    console.error('❌ 钉钉推送异常:', (error as Error).message)
    return false
  }
}

function truncate(text: string | null, maxLen: number): string {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

/** 将日报格式化为钉钉 Markdown 消息 */
function formatDailyMarkdown(
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
  items: Map<string, { title: string; url: string; score: number }>
): string {
  const d = new Date(daily.date + 'T00:00:00')
  const month = d.getMonth() + 1
  const day = d.getDate()
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]

  // 按版块顺序收集所有精选条目，去重
  const orderedItems: { title: string; url: string; score: number }[] = []
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

  let md = `### 家居建材战略资讯日报（精选${orderedItems.length}条）\n`
  md += `###### ${month}月${day}日，星期${week}\n\n`

  if (daily.summary) {
    md += `📌 **${daily.summary}**\n\n\n\n`
  }

  for (let i = 0; i < orderedItems.length; i++) {
    const item = orderedItems[i]
    const titleDisplay = item.score >= 8 ? `**${item.title}**` : item.title
    md += `${i + 1}. ${titleDisplay} [查看原文](${item.url})\n`
  }

  md += `\n\n\n[查看完整日报及历史归档](${SITE_URL}/daily)\n`

  return md
}

/** 查询指定日期的日报并推送到指定的 webhooks（默认推送所有激活的 webhooks） */
export async function pushDailyToDingTalk(
  dateStr?: string,
  atAll: boolean = false,
  targetWebhooks?: WebhookConfig[]
): Promise<{ success: boolean; pushedCount: number; totalCount: number; date: string }> {
  const targetDate = dateStr || new Date(Date.now() - 86400000).toISOString().split('T')[0]

  console.log(`\n📲 开始推送日报到钉钉: ${targetDate}`)

  // 如果没有指定 webhooks，从数据库读取所有激活的
  let webhooks = targetWebhooks
  if (!webhooks) {
    webhooks = await prisma.dingTalkWebhook.findMany({
      where: { isActive: true },
      select: { url: true, secret: true },
    })
  }

  if (webhooks.length === 0) {
    console.log('⚠️  没有配置钉钉 Webhook，跳过推送')
    return { success: false, pushedCount: 0, totalCount: 0, date: targetDate }
  }

  const daily = await prisma.daily.findUnique({
    where: { date: targetDate },
    include: { sections: { orderBy: { order: 'asc' } } },
  })

  if (!daily) {
    console.log(`⚠️  ${targetDate} 暂无日报，跳过推送`)
    return { success: false, pushedCount: 0, totalCount: webhooks.length, date: targetDate }
  }

  // 获取日报关联的所有条目
  const allItemIds = daily.sections.flatMap((s) => s.itemIds)
  const itemsRaw = await prisma.item.findMany({
    where: { id: { in: allItemIds } },
    select: {
      id: true,
      title: true,
      url: true,
      score: true,
    },
  })

  const itemMap = new Map(
    itemsRaw.map((i) => [
      i.id,
      {
        title: i.title,
        url: i.url,
        score: i.score,
      },
    ])
  )

  const d = new Date(daily.date + 'T00:00:00')
  const dateLabel = `${d.getMonth() + 1}月${d.getDate()}日`
  const markdown = formatDailyMarkdown(daily, itemMap)

  let pushedCount = 0
  for (const webhook of webhooks) {
    const success = await sendDingTalkMarkdownToWebhook(
      webhook,
      `家居战略资讯日报 · ${dateLabel}`,
      markdown,
      atAll
    )
    if (success) pushedCount++
  }

  console.log(`\n📊 推送完成: ${pushedCount}/${webhooks.length} 个群成功`)
  return {
    success: pushedCount > 0,
    pushedCount,
    totalCount: webhooks.length,
    date: targetDate,
  }
}

/** 验证 webhook URL 是否可访问（仅验证格式） */
export function isValidDingTalkWebhookUrl(url: string): boolean {
  return url.startsWith('https://oapi.dingtalk.com/robot/send?access_token=')
}

/** Webhook CRUD 辅助函数 */
export async function getActiveWebhooks(): Promise<WebhookConfig[]> {
  return prisma.dingTalkWebhook.findMany({
    where: { isActive: true },
    select: { url: true, secret: true },
  })
}

export async function getAllWebhooks() {
  return prisma.dingTalkWebhook.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export async function createWebhook(data: { name: string; url: string; secret?: string }) {
  return prisma.dingTalkWebhook.create({
    data: {
      name: data.name,
      url: data.url,
      secret: data.secret || null,
    },
  })
}

export async function deleteWebhook(id: string) {
  return prisma.dingTalkWebhook.delete({ where: { id } })
}

export async function toggleWebhook(id: string, isActive: boolean) {
  return prisma.dingTalkWebhook.update({
    where: { id },
    data: { isActive },
  })
}
