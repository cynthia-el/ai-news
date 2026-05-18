export type SourceType = 'WEB' | 'RSS' | 'API' | 'WECHAT_RSS' | 'MANUAL'

export interface RawItem {
  title: string
  url: string
  source: string
  content: string
  publishedAt: Date
  imageUrl?: string
}

export interface SourceConfig {
  // For WEB sources
  listSelector?: string
  itemSelector?: {
    title: string
    link: string
    date?: string
    summary?: string
    image?: string
  }
  detailSelector?: {
    content: string
    filter?: string
  }
  // For API sources
  headers?: Record<string, string>
  responsePath?: string
  // For all sources
  dateFormat?: string
}

export interface CrawlResult {
  sourceName: string
  sourceType: SourceType
  items: RawItem[]
  error?: string
}

export interface SourceAdapter {
  crawl(source: { name: string; url: string; config: string | null }): Promise<RawItem[]>
}
