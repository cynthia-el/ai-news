import * as cheerio from 'cheerio'
import { RawItem, SourceAdapter, SourceConfig } from '../types'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 15000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
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

function parseDate(dateText: string): Date {
  if (!dateText) return new Date()
  const cleaned = dateText.trim().replace(/\s+/g, ' ')
  const d = new Date(cleaned)
  return isNaN(d.getTime()) ? new Date() : d
}

export class WebAdapter implements SourceAdapter {
  async crawl(source: { name: string; url: string; config: string | null }): Promise<RawItem[]> {
    const items: RawItem[] = []
    const cfg: SourceConfig = source.config ? JSON.parse(source.config) : {}

    if (!cfg.listSelector || !cfg.itemSelector) {
      console.warn(`[WebAdapter] ${source.name} 缺少选择器配置，跳过`)
      return items
    }

    try {
      const response = await fetchWithTimeout(source.url)
      if (!response.ok) {
        console.warn(`[WebAdapter] ${source.name} 请求失败: ${response.status}`)
        return items
      }

      const html = await response.text()
      const $ = cheerio.load(html)
      const baseUrl = new URL(source.url).origin

      $(cfg.listSelector).each((_, element) => {
        const el = $(element)
        const titleEl = el.find(cfg.itemSelector!.title).first()
        const title = titleEl.text().trim()
        const link = titleEl.attr('href') || el.find(cfg.itemSelector!.link).first().attr('href') || ''
        const summary = cfg.itemSelector!.summary
          ? el.find(cfg.itemSelector!.summary).first().text().trim()
          : ''
        const imageUrl = cfg.itemSelector!.image
          ? el.find(cfg.itemSelector!.image).first().attr('src') || ''
          : ''
        const dateText = cfg.itemSelector!.date
          ? el.find(cfg.itemSelector!.date).first().text().trim()
          : ''

        if (title && link) {
          const url = link.startsWith('http') ? link : new URL(link, baseUrl).href
          items.push({
            title,
            url,
            source: source.name,
            content: summary || title,
            publishedAt: parseDate(dateText),
            imageUrl: imageUrl || undefined,
          })
        }
      })

      console.log(`[WebAdapter] ${source.name}: ${items.length} 条`)
    } catch (error) {
      console.error(`[WebAdapter] ${source.name} 异常:`, (error as Error).message)
    }

    return items
  }
}

export async function crawlDetail(url: string, configStr: string | null): Promise<string> {
  if (!configStr) return ''
  const cfg: SourceConfig = JSON.parse(configStr)
  if (!cfg.detailSelector) return ''

  try {
    const response = await fetchWithTimeout(url)
    if (!response.ok) return ''

    const html = await response.text()
    const $ = cheerio.load(html)

    if (cfg.detailSelector.filter) {
      $(cfg.detailSelector.filter).remove()
    }

    const content = $(cfg.detailSelector.content).text().trim()
    return content.slice(0, 5000)
  } catch {
    return ''
  }
}
