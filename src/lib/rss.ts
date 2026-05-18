import { prisma } from './prisma'

export async function generateRSS(mode: 'selected' | 'all' = 'selected'): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || '家居建材AI资讯'

  const where = mode === 'selected' ? { isSelected: true } : {}

  const items = await prisma.item.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    take: 50,
  })

  const itemXml = items
    .map(
      (item) => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.url}</link>
      <guid>${item.url}</guid>
      <pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>
      <description><![CDATA[${item.summary || item.title}${item.reason ? `\n推荐理由：${item.reason}` : ''}]]></description>
      <category>${item.category}</category>
    </item>`
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteName}${mode === 'all' ? ' - 全部' : ' - 精选'}</title>
    <link>${siteUrl}</link>
    <description>家居建材行业AI智能资讯聚合</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />${itemXml}
  </channel>
</rss>`
}

export async function generateDailyRSS(): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || '家居建材AI资讯'

  const dailies = await prisma.daily.findMany({
    orderBy: { date: 'desc' },
    take: 30,
  })

  const itemXml = dailies
    .map(
      (daily) => `
    <item>
      <title><![CDATA[${daily.title}]]></title>
      <link>${siteUrl}/daily?date=${daily.date}</link>
      <guid>${siteUrl}/daily?date=${daily.date}</guid>
      <pubDate>${new Date(daily.date).toUTCString()}</pubDate>
      <description><![CDATA[${daily.summary}]]></description>
    </item>`
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteName} - 日报</title>
    <link>${siteUrl}</link>
    <description>家居建材行业AI日报</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed/daily.xml" rel="self" type="application/rss+xml" />${itemXml}
  </channel>
</rss>`
}
