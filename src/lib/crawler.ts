/**
 * 爬虫入口（兼容层）
 * 内部实现已迁移到 src/lib/sources/ 模块
 */

export type { RawItem, SourceType, SourceConfig } from './sources/types'
export { dedupItems } from './sources/dedup'
export { crawlAllSources, crawlSourceById, flattenResults, loadActiveSources } from './sources/manager'
export { WebAdapter } from './sources/adapters/web'
export { RssAdapter } from './sources/adapters/rss'
export { WechatRssAdapter } from './sources/adapters/wechat-rss'
export { ApiAdapter } from './sources/adapters/api'

import { RawItem } from './sources/types'
import { crawlAllSources, flattenResults } from './sources/manager'

/**
 * 兼容旧接口的批量采集入口
 * 内部使用新的 SourceManager 实现
 */
export async function crawlAll(): Promise<RawItem[]> {
  const results = await crawlAllSources()
  return flattenResults(results)
}

// ============================================================
// 手动添加/批量导入工具（保留兼容）
// ============================================================

export interface ManualItemInput {
  title: string
  url: string
  source: string
  content: string
  imageUrl?: string
}

export async function addManualItem(input: ManualItemInput): Promise<boolean> {
  const { prisma } = await import('./prisma')
  const { processItem } = await import('./ai')

  // 检查是否已存在
  const exists = await prisma.item.findUnique({
    where: { url: input.url },
  })

  if (exists) {
    console.log(`  ⚠ 已存在，跳过: ${input.title.slice(0, 40)}`)
    return false
  }

  // AI 处理
  const aiResult = await processItem(input.title, input.content)

  // 存储
  await prisma.item.create({
    data: {
      title: input.title,
      url: input.url,
      source: input.source,
      content: input.content,
      imageUrl: input.imageUrl,
      publishedAt: new Date(),
      category: aiResult.category,
      summary: aiResult.summary,
      reason: aiResult.reason,
      score: aiResult.score,
      isSelected: aiResult.score >= 6,
    },
  })

  console.log(
    `  ✓ 已添加: ${input.title.slice(0, 40)} [${aiResult.category}] 评分:${aiResult.score}`
  )
  return true
}

export async function batchImportItems(inputs: ManualItemInput[]): Promise<{ added: number; skipped: number }> {
  let added = 0
  let skipped = 0

  for (const input of inputs) {
    const success = await addManualItem(input)
    if (success) added++
    else skipped++
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return { added, skipped }
}

export const IMPORT_JSON_EXAMPLE = `[
  {
    "title": "千年舟集团发布2026年度新品战略",
    "url": "https://example.com/news/001",
    "source": "企业官网",
    "content": "千年舟集团于今日发布2026年度新品战略，聚焦绿色环保板材赛道，推出零醛添加系列产品。"
  },
  {
    "title": "住建部发布新修订《住宅设计规范》",
    "url": "https://example.com/news/002",
    "source": "政策文件",
    "content": "新修订的《住宅设计规范》将于明年起实施，对住宅空间布局、采光通风等方面提出更高要求。"
  }
]`
