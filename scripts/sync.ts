import 'dotenv/config'
import * as cheerio from 'cheerio'
import * as iconv from 'iconv-lite'
import { prisma } from '../src/lib/prisma'
import { crawlAllSources, flattenResults, loadActiveSources } from '../src/lib/crawler'
import { dedupItems } from '../src/lib/crawler'
import { batchClassify, generateDeepReasons, generateDailyWithSections } from '../src/lib/ai'
import { RawItem } from '../src/lib/sources/types'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/** 获取HTML并自动检测编码（处理gbk/gb2312等） */
async function fetchHtmlWithEncoding(url: string, timeout = 10000): Promise<string> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    })
    clearTimeout(id)
    if (!res.ok) return ''

    const buffer = Buffer.from(await res.arrayBuffer())

    // 从Content-Type头中检测编码
    const contentType = res.headers.get('content-type') || ''
    const charsetMatch = contentType.match(/charset=([\w-]+)/i)
    let encoding = charsetMatch ? charsetMatch[1].toLowerCase() : 'utf-8'

    // 如果header没有指定或指定为utf-8，检查HTML meta标签
    if (encoding === 'utf-8') {
      const metaCheck = buffer.toString('ascii', 0, Math.min(4096, buffer.length))
      const metaMatch = metaCheck.match(/<meta[^>]+charset=["']?([\w-]+)/i)
      if (metaMatch) {
        encoding = metaMatch[1].toLowerCase()
      }
    }

    // 使用iconv-lite解码非UTF-8编码
    if (encoding !== 'utf-8' && encoding !== 'utf8') {
      return iconv.decode(buffer, encoding)
    }

    return buffer.toString('utf-8')
  } catch {
    return ''
  }
}

/** 通用详情页爬取：不依赖CSS选择器配置 */
async function fetchArticleContent(url: string): Promise<string> {
  try {
    const html = await fetchHtmlWithEncoding(url, 10000)
    if (!html) return ''
    const $ = cheerio.load(html)

    // 移除无关元素
    $('script, style, nav, header, footer, aside, .ad, .advertisement, .related-read, .comments, iframe, .sidebar').remove()

    // 尝试多种正文选择器
    const selectors = [
      'article',
      '.article-content',
      '.content-detail',
      '#artibody',
      '.post-content',
      '.entry-content',
      '.news-content',
      '.detail-content',
      '.main-content',
      '[class*="content"]',
      '[class*="article"]',
      'main',
      '.text',
      '.txt',
    ]

    for (const sel of selectors) {
      const el = $(sel).first()
      if (el.length) {
        const text = el.text().trim()
        if (text.length > 200) {
          return text.slice(0, 5000)
        }
      }
    }

    // 兜底：取body中较长的段落
    let bestText = ''
    $('p').each((_, p) => {
      const t = $(p).text().trim()
      if (t.length > bestText.length) bestText = t
    })
    return bestText.slice(0, 5000)
  } catch {
    return ''
  }
}

const BATCH_SIZE = 12

// 采购/招商/广告硬过滤关键词（即使AI给了高分也拒绝进入精选）
const PROCUREMENT_KEYWORDS = ['需要采购', '求购', '询价', '诚招代理', '诚招全国', '厂家招商', '品牌招商', '我要代理', '加盟热线', '招商加盟']
const PROCUREMENT_WEAK = ['咨询', '采购', '招商', '加盟']

function isProcurementOrAd(title: string): boolean {
  const t = title.trim()
  // 强匹配：直接拒绝
  if (PROCUREMENT_KEYWORDS.some(kw => t.includes(kw))) return true
  // 弱匹配：标题以"咨询"开头（大概率是B2B询价）
  if (t.startsWith('咨询') && t.length < 30) return true
  // 弱匹配：包含"十大品牌"（通常是软文排行榜）
  if (t.includes('十大品牌') && (t.includes('排名') || t.includes('评测') || t.includes('综合'))) return true
  return false
}

async function processCrawledItems(rawItems: RawItem[]) {
  let added = 0
  let skipped = 0
  let failed = 0

  // 1. 去重
  console.log(`\n[去重] 原始资讯 ${rawItems.length} 条`)
  const { unique } = dedupItems(rawItems)
  console.log(`[去重] 去重后 ${unique.length} 条`)

  // 1.5 智能日期过滤
  const now = new Date()
  const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000)
  const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const futureCutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const recentItems = unique.filter((item) => {
    const date = item.publishedAt
    if (!date) return false
    const d = new Date(date)

    // 情况A：有真实日期（非fallback）→ 严格48小时
    // 判断是否为fallback：如果publishedAt距离现在小于5分钟，可能是fallback
    const isFallback = now.getTime() - d.getTime() < 5 * 60 * 1000

    if (!isFallback) {
      return d >= cutoff48h && d <= futureCutoff
    }

    // 情况B：fallback日期（列表页无日期）→ 用标题/URL做旧文检测
    const title = item.title
    const url = item.url

    // 检测标题中的旧年份（如"2024"、"2023"且不是当前年）
    const yearMatches = title.match(/\b(20\d{2})\b/g)
    if (yearMatches) {
      for (const ym of yearMatches) {
        const y = parseInt(ym, 10)
        if (y < now.getFullYear() - 1) return false // 早于去年的内容
        if (y === now.getFullYear() - 1 && !title.includes('年报') && !title.includes('回顾')) return false
      }
    }

    // 检测URL中的旧年份
    const urlYearMatch = url.match(/\/(20\d{2})[\/-]/)
    if (urlYearMatch) {
      const urlYear = parseInt(urlYearMatch[1], 10)
      if (urlYear < now.getFullYear()) return false
    }

    // 检测明显的旧文/回顾关键词
    const oldKeywords = ['回顾', '盘点', '年报', '去年', '前年', '往届', '历届', '往届回顾']
    if (oldKeywords.some(kw => title.includes(kw))) return false

    // fallback条目放宽到7天
    return true
  })
  console.log(`[日期过滤] 保留: ${recentItems.length} 条 (排除 ${unique.length - recentItems.length} 条陈旧)`)

  if (recentItems.length === 0) {
    return { added: 0, skipped: 0, failed: 0, sourceStats: {} }
  }

  // 2. 加载信源映射（name -> id / config）
  const sources = await loadActiveSources()
  const sourceMap = new Map<string, string>()
  const sourceConfigMap = new Map<string, string | null>()
  for (const s of sources) {
    sourceMap.set(s.name, s.id)
    sourceConfigMap.set(s.name, s.config)
  }

  // 2.5 对内容过短的条目爬取详情页
  let detailCrawled = 0
  const maxDetailCrawl = recentItems.length
  for (const item of recentItems) {
    if (item.content.length >= 300) continue
    if (detailCrawled >= maxDetailCrawl) break

    try {
      console.log(`  [详情页] ${item.title.slice(0, 40)}...`)
      const detailContent = await fetchArticleContent(item.url)
      if (detailContent && detailContent.length > item.content.length + 100) {
        item.content = detailContent.slice(0, 5000)
        detailCrawled++
      }
    } catch {
      // 详情页爬取失败，忽略
    }
  }
  if (detailCrawled > 0) {
    console.log(`[详情页] 成功爬取 ${detailCrawled} 条详情页内容`)
  }

  // 3. 批量AI处理（分批次）
  console.log(`\n[AI处理] 开始批量分类评分，每批 ${BATCH_SIZE} 条`)

  const allResults: { raw: RawItem; category: string; summary: string; score: number; tags: string[] }[] = []

  for (let i = 0; i < recentItems.length; i += BATCH_SIZE) {
    const batch = recentItems.slice(i, i + BATCH_SIZE)
    console.log(`  处理批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(recentItems.length / BATCH_SIZE)} (${batch.length} 条)`)

    try {
      const batchResults = await batchClassify(
        batch.map((item) => ({ title: item.title, content: item.content }))
      )

      for (let j = 0; j < batch.length; j++) {
        const result = batchResults[j]
        if (result) {
          allResults.push({
            raw: batch[j],
            category: result.category,
            summary: result.summary,
            score: result.score,
            tags: result.tags,
          })
        }
      }

      // 避免请求过快
      if (i + BATCH_SIZE < recentItems.length) {
        await new Promise((resolve) => setTimeout(resolve, 800))
      }
    } catch (error) {
      console.error(`  ✗ 批次处理失败:`, (error as Error).message)
      // 批次失败时，全部按默认值处理
      for (const item of batch) {
        allResults.push({
          raw: item,
          category: 'industry-news',
          summary: item.title.slice(0, 30),
          score: 5,
          tags: [],
        })
      }
    }
  }

  // 4. 对高分条目生成深度推荐理由
  const highScoreItems = allResults.filter((r) => r.score >= 7)
  console.log(`\n[推荐理由] ${highScoreItems.length} 条高分条目需要生成深度推荐理由`)

  const reasonsMap = new Map<number, string>()
  if (highScoreItems.length > 0) {
    for (let i = 0; i < highScoreItems.length; i += BATCH_SIZE) {
      const batch = highScoreItems.slice(i, i + BATCH_SIZE)
      try {
        const reasons = await generateDeepReasons(
          batch.map((r) => ({ title: r.raw.title, summary: r.summary, category: r.category }))
        )
        for (let j = 0; j < batch.length; j++) {
          const idx = allResults.indexOf(batch[j])
          reasonsMap.set(idx, reasons[j] || '行业相关资讯，值得关注')
        }
        if (i + BATCH_SIZE < highScoreItems.length) {
          await new Promise((resolve) => setTimeout(resolve, 600))
        }
      } catch (error) {
        console.error(`  ✗ 推荐理由生成失败:`, (error as Error).message)
      }
    }
  }

  // 5. 存储到数据库（应用采购/招商硬过滤）
  console.log(`\n[存储] 开始写入数据库`)

  const sourceStats: Record<string, { fetched: number; added: number; failed: number }> = {}
  let procurementFiltered = 0

  for (let i = 0; i < allResults.length; i++) {
    let { raw, category, summary, score, tags } = allResults[i]
    let finalScore = score

    // 硬过滤：采购/招商/广告类内容强制降分
    if (isProcurementOrAd(raw.title)) {
      finalScore = Math.min(finalScore, 3)
      procurementFiltered++
    }

    const reason = reasonsMap.get(i) || (finalScore >= 7 ? '行业相关资讯，值得关注' : '行业相关资讯')
    const isSelected = finalScore >= 7

    // 初始化统计
    if (!sourceStats[raw.source]) {
      sourceStats[raw.source] = { fetched: 0, added: 0, failed: 0 }
    }
    sourceStats[raw.source].fetched++

    // 检查是否已存在
    try {
      const exists = await prisma.item.findUnique({
        where: { url: raw.url },
      })

      if (exists) {
        skipped++
        continue
      }

      // 存储
      await prisma.item.create({
        data: {
          title: raw.title,
          url: raw.url,
          source: raw.source,
          sourceId: sourceMap.get(raw.source) || null,
          content: raw.content,
          imageUrl: raw.imageUrl,
          publishedAt: raw.publishedAt,
          category,
          summary,
          reason,
          score: finalScore,
          isSelected,
          tags,
        },
      })

      added++
      sourceStats[raw.source].added++
      console.log(`  [${category}] ${raw.title.slice(0, 50)} (评分:${finalScore}${finalScore !== score ? ',原' + score : ''})`)
    } catch (error) {
      failed++
      sourceStats[raw.source].failed++
      console.error(`  ✗ 存储失败: ${raw.title.slice(0, 40)}`, (error as Error).message)
    }
  }

  if (procurementFiltered > 0) {
    console.log(`  [硬过滤] 采购/招商类强制降分: ${procurementFiltered} 条`)
  }

  console.log(`\n处理结果: 新增 ${added} 条, 跳过 ${skipped} 条, 失败 ${failed} 条`)
  return { added, skipped, failed, sourceStats }
}

async function generateDaily() {
  const today = new Date().toISOString().split('T')[0]
  console.log(`\n📰 开始生成日报: ${today}`)

  // 获取最近24小时的精选内容
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const items = await prisma.item.findMany({
    where: {
      isSelected: true,
      publishedAt: { gte: yesterday },
    },
    orderBy: { score: 'desc' },
    take: 7,
  })

  if (items.length === 0) {
    console.log('  ⚠ 今日无精选内容，跳过日报生成')
    return false
  }

  console.log(`  找到 ${items.length} 条精选内容`)

  // 生成日报结构
  const dailyResult = await generateDailyWithSections(
    items.map((item) => ({
      title: item.title,
      summary: item.summary || item.title,
      category: item.category,
    }))
  )

  // 按分类分组
  const categoryGroups: Record<string, typeof items> = {}
  for (const item of items) {
    if (!categoryGroups[item.category]) categoryGroups[item.category] = []
    categoryGroups[item.category].push(item)
  }

  // 构建版块数据
  const sectionsData = dailyResult.sections
    .filter((s) => categoryGroups[s.category] && categoryGroups[s.category].length > 0)
    .map((s) => ({
      category: s.category,
      title: s.title,
      description: s.description,
      itemIds: categoryGroups[s.category].map((item) => item.id),
      order: Object.keys(categoryGroups).indexOf(s.category),
    }))

  // 如果没有AI返回的版块，手动创建
  if (sectionsData.length === 0) {
    for (const [category, group] of Object.entries(categoryGroups)) {
      sectionsData.push({
        category,
        title: group[0]?.source || category,
        description: '',
        itemIds: group.map((item) => item.id),
        order: 0,
      })
    }
  }

  // 检查是否已存在今日日报
  const exists = await prisma.daily.findUnique({
    where: { date: today },
  })

  if (exists) {
    // 删除旧版块
    await prisma.dailySection.deleteMany({
      where: { dailyId: exists.id },
    })

    // 更新日报
    await prisma.daily.update({
      where: { id: exists.id },
      data: {
        title: dailyResult.title,
        summary: dailyResult.summary,
        editorNote: dailyResult.editorNote,
        itemIds: items.map((item) => item.id),
        sectionCount: sectionsData.length,
      },
    })

    // 创建新版块
    for (const section of sectionsData) {
      await prisma.dailySection.create({
        data: {
          dailyId: exists.id,
          category: section.category,
          title: section.title,
          description: section.description,
          itemIds: section.itemIds,
          order: section.order,
        },
      })
    }

    console.log(`  ✓ 日报已更新: ${dailyResult.title} (${sectionsData.length} 个版块)`)
  } else {
    // 创建日报
    const daily = await prisma.daily.create({
      data: {
        date: today,
        title: dailyResult.title,
        summary: dailyResult.summary,
        editorNote: dailyResult.editorNote,
        itemIds: items.map((item) => item.id),
        sectionCount: sectionsData.length,
      },
    })

    // 创建版块
    for (const section of sectionsData) {
      await prisma.dailySection.create({
        data: {
          dailyId: daily.id,
          category: section.category,
          title: section.title,
          description: section.description,
          itemIds: section.itemIds,
          order: section.order,
        },
      })
    }

    console.log(`  ✓ 日报已创建: ${dailyResult.title} (${sectionsData.length} 个版块)`)
  }

  return true
}

async function main() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║      家居建材AI资讯 - 智能同步工具        ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log(`\n开始时间: ${new Date().toLocaleString('zh-CN')}`)

  // 创建采集日志记录
  const crawlLog = await prisma.crawlLog.create({
    data: {
      status: 'running',
      startedAt: new Date(),
    },
  })

  let rawItems: RawItem[] = []
  let result = { added: 0, skipped: 0, failed: 0, sourceStats: {} as Record<string, { fetched: number; added: number; failed: number }> }
  let dailyGenerated = false
  let errorMessage: string | null = null

  try {
    // 第1步：加载信源并爬取
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📡 第1步：加载信源并爬取')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const crawlResults = await crawlAllSources()
    rawItems = flattenResults(crawlResults)

    const sourceNames = [...new Set(rawItems.map((item) => item.source))]

    if (rawItems.length === 0) {
      console.log('\n⚠ 未获取到任何资讯，跳过后续步骤')

      await prisma.crawlLog.update({
        where: { id: crawlLog.id },
        data: {
          status: 'success',
          endedAt: new Date(),
          totalFetched: 0,
          sources: sourceNames,
        },
      })
      return
    }

    // 第2步：AI处理与存储
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🤖 第2步：AI处理与存储')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    result = await processCrawledItems(rawItems)

    // 第3步：生成日报
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    dailyGenerated = await generateDaily()

    // 更新采集日志
    await prisma.crawlLog.update({
      where: { id: crawlLog.id },
      data: {
        status: 'success',
        endedAt: new Date(),
        totalFetched: rawItems.length,
        added: result.added,
        skipped: result.skipped,
        failed: result.failed,
        sources: sourceNames,
        sourceStats: JSON.stringify(result.sourceStats),
        dailyGenerated,
      },
    })

    // 汇总
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 同步完成')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`  爬取资讯: ${rawItems.length} 条`)
    console.log(`  新增入库: ${result.added} 条`)
    console.log(`  重复跳过: ${result.skipped} 条`)
    console.log(`  处理失败: ${result.failed} 条`)
    console.log(`  日报生成: ${dailyGenerated ? '✓' : '✗'}`)
    console.log(`\n结束时间: ${new Date().toLocaleString('zh-CN')}`)
  } catch (error) {
    errorMessage = (error as Error).message

    await prisma.crawlLog.update({
      where: { id: crawlLog.id },
      data: {
        status: 'failed',
        endedAt: new Date(),
        totalFetched: rawItems.length,
        added: result.added,
        skipped: result.skipped,
        failed: result.failed,
        errorMessage,
        dailyGenerated,
      },
    })

    throw error
  }
}

main()
  .catch((e) => {
    console.error('\n同步任务失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
