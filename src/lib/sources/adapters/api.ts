import { RawItem, SourceAdapter, SourceConfig } from '../types'

/**
 * API 适配器（预留）
 * 用于接入第三方数据API
 * 配置示例：
 * {
 *   "headers": { "Authorization": "Bearer xxx" },
 *   "responsePath": "data.articles"
 * }
 */
export class ApiAdapter implements SourceAdapter {
  async crawl(source: { name: string; url: string; config: string | null }): Promise<RawItem[]> {
    const items: RawItem[] = []
    const cfg: SourceConfig = source.config ? JSON.parse(source.config) : {}

    try {
      const response = await fetch(source.url, {
        headers: {
          Accept: 'application/json',
          ...cfg.headers,
        },
      })

      if (!response.ok) {
        console.warn(`[API] ${source.name} 请求失败: ${response.status}`)
        return items
      }

      const data = await response.json()
      const articles = cfg.responsePath
        ? cfg.responsePath.split('.').reduce((obj: any, key: string) => obj?.[key], data)
        : data

      if (!Array.isArray(articles)) {
        console.warn(`[API] ${source.name} 返回格式不是数组`)
        return items
      }

      for (const article of articles) {
        if (article.title && article.url) {
          items.push({
            title: String(article.title).trim(),
            url: String(article.url).trim(),
            source: source.name,
            content: String(article.content || article.summary || article.description || article.title).trim(),
            publishedAt: article.publishedAt ? new Date(article.publishedAt) : new Date(),
            imageUrl: article.imageUrl || article.image || undefined,
          })
        }
      }

      console.log(`[API] ${source.name}: ${items.length} 条`)
    } catch (error) {
      console.error(`[API] ${source.name} 异常:`, (error as Error).message)
    }

    return items
  }
}
