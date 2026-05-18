import * as cheerio from 'cheerio'
import { RawItem, SourceAdapter, SourceConfig } from '../types'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 15000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/rss+xml,application/xml,text/xml,*/*',
        ...options.headers,
      },
    })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    throw error
  }
}

export class RssAdapter implements SourceAdapter {
  async crawl(source: { name: string; url: string; config: string | null }): Promise<RawItem[]> {
    const items: RawItem[] = []

    try {
      const response = await fetchWithTimeout(source.url)
      if (!response.ok) {
        console.warn(`[RSS] ${source.name} 请求失败: ${response.status}`)
        return items
      }

      const xml = await response.text()
      const $ = cheerio.load(xml, { xmlMode: true })

      $('item').each((_, element) => {
        const el = $(element)
        const title = el.find('title').text().trim()
        const link = el.find('link').text().trim() || el.find('guid').text().trim()
        const description = el.find('description').text().trim()
        const pubDate = el.find('pubDate').text().trim()
        const contentEncoded = el.find('content\\:encoded').text().trim()

        const summaryHtml = contentEncoded || description
        const summaryText = summaryHtml
          ? cheerio.load(summaryHtml).text().trim().slice(0, 300)
          : ''

        if (title && link) {
          items.push({
            title,
            url: link,
            source: source.name,
            content: summaryText || title,
            publishedAt: pubDate ? new Date(pubDate) : new Date(),
          })
        }
      })

      console.log(`[RSS] ${source.name}: ${items.length} 条`)
    } catch (error) {
      console.error(`[RSS] ${source.name} 异常:`, (error as Error).message)
    }

    return items
  }
}
