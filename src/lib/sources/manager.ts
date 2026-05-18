import { prisma } from '../prisma'
import { CrawlResult, RawItem, SourceAdapter, SourceType } from './types'
import { WebAdapter } from './adapters/web'
import { RssAdapter } from './adapters/rss'
import { WechatRssAdapter } from './adapters/wechat-rss'
import { ApiAdapter } from './adapters/api'

const adapters: Record<SourceType, SourceAdapter> = {
  WEB: new WebAdapter(),
  RSS: new RssAdapter(),
  WECHAT_RSS: new WechatRssAdapter(),
  API: new ApiAdapter(),
  MANUAL: new RssAdapter(), // MANUAL 不通过爬虫获取
}

const CONCURRENCY = 10
const DELAY_BETWEEN_SOURCES = 500 // ms

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 从数据库加载所有活跃信源
 */
export async function loadActiveSources() {
  return prisma.source.findMany({
    where: { isActive: true },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  })
}

/**
 * 并发爬取所有信源（控制并发数）
 */
export async function crawlAllSources(): Promise<CrawlResult[]> {
  const sources = await loadActiveSources()
  console.log(`[Manager] 加载 ${sources.length} 个活跃信源`)

  if (sources.length === 0) {
    console.warn('[Manager] 没有配置任何活跃信源')
    return []
  }

  const results: CrawlResult[] = []

  // 使用并发池
  const pool: Promise<void>[] = []
  let index = 0

  async function processOne() {
    const source = sources[index++]
    if (!source) return

    const adapter = adapters[source.type as SourceType]
    if (!adapter) {
      console.warn(`[Manager] ${source.name} 类型 ${source.type} 无对应适配器`)
      results.push({ sourceName: source.name, sourceType: source.type as SourceType, items: [], error: '无适配器' })
      return
    }

    if (source.type === 'MANUAL') {
      // 手动信源不参与自动爬取
      return
    }

    try {
      const items = await adapter.crawl({
        name: source.name,
        url: source.url,
        config: source.config,
      })

      results.push({
        sourceName: source.name,
        sourceType: source.type as SourceType,
        items,
      })

      // 更新最后采集时间
      await prisma.source.update({
        where: { id: source.id },
        data: { lastCrawledAt: new Date() },
      })
    } catch (error) {
      results.push({
        sourceName: source.name,
        sourceType: source.type as SourceType,
        items: [],
        error: (error as Error).message,
      })
    }

    await delay(DELAY_BETWEEN_SOURCES)
  }

  // 填充并发池
  for (let i = 0; i < Math.min(CONCURRENCY, sources.length); i++) {
    pool.push(
      (async () => {
        while (index < sources.length) {
          await processOne()
        }
      })()
    )
  }

  await Promise.all(pool)

  console.log(`[Manager] 采集完成: ${results.reduce((sum, r) => sum + r.items.length, 0)} 条原始资讯`)
  return results
}

/**
 * 采集指定信源
 */
export async function crawlSourceById(sourceId: string): Promise<CrawlResult> {
  const source = await prisma.source.findUnique({ where: { id: sourceId } })
  if (!source) {
    return { sourceName: '', sourceType: 'WEB', items: [], error: '信源不存在' }
  }

  const adapter = adapters[source.type as SourceType]
  if (!adapter) {
    return { sourceName: source.name, sourceType: source.type as SourceType, items: [], error: '无适配器' }
  }

  const items = await adapter.crawl({
    name: source.name,
    url: source.url,
    config: source.config,
  })

  await prisma.source.update({
    where: { id: source.id },
    data: { lastCrawledAt: new Date() },
  })

  return { sourceName: source.name, sourceType: source.type as SourceType, items }
}

/**
 * 合并所有采集结果为一个列表
 */
export function flattenResults(results: CrawlResult[]): RawItem[] {
  const all: RawItem[] = []
  for (const result of results) {
    all.push(...result.items)
  }
  return all
}
