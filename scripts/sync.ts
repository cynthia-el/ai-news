import 'dotenv/config'
import * as cheerio from 'cheerio'
import * as iconv from 'iconv-lite'
import { prisma } from '../src/lib/prisma'
import { crawlAllSources, flattenResults, loadActiveSources } from '../src/lib/crawler'
import { dedupItems } from '../src/lib/crawler'
import { batchClassify, generateDeepReasons, generateDailyWithSections } from '../src/lib/ai'
import { RawItem } from '../src/lib/sources/types'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/** 触发 Cloudflare Pages 重新构建部署 */
async function triggerDeploy() {
  const githubToken = process.env.GITHUB_TOKEN
  const repoOwner = process.env.VERCEL_GIT_REPO_OWNER
  const repoSlug = process.env.VERCEL_GIT_REPO_SLUG

  if (!githubToken) {
    console.log('⚠️ GITHUB_TOKEN 未配置，跳过自动触发部署')
    return
  }

  const owner = repoOwner || 'cynthia-el'
  const slug = repoSlug || 'ai-news'

  try {
    console.log('\n🚀 触发 Cloudflare Pages 重新构建部署...')
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${slug}/actions/workflows/deploy-pages.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${githubToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' }),
      }
    )

    if (res.ok) {
      console.log('✅ 已触发 deploy-pages workflow，静态站点将在几分钟后更新')
    } else {
      const text = await res.text()
      console.error(`❌ 触发部署失败: ${res.status} ${text}`)
    }
  } catch (error) {
    console.error('触发部署出错:', (error as Error).message)
  }
}

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

    const contentType = res.headers.get('content-type') || ''
    const charsetMatch = contentType.match(/charset=([\w-]+)/i)
    let encoding = charsetMatch ? charsetMatch[1].toLowerCase() : 'utf-8'

    if (encoding === 'utf-8') {
      const metaCheck = buffer.toString('ascii', 0, Math.min(4096, buffer.length))
      const metaMatch = metaCheck.match(/<meta[^>]+charset=["']?([\w-]+)/i)
      if (metaMatch) {
        encoding = metaMatch[1].toLowerCase()
      }
    }

    if (encoding !== 'utf-8' && encoding !== 'utf8') {
      return iconv.decode(buffer, encoding)
    }

    return buffer.toString('utf-8')
  } catch {
    return ''
  }
}

/** 从详情页HTML中提取发布日期 */
function extractDateFromHtml(html: string): Date | null {
  try {
    const $ = cheerio.load(html)

    const metaSelectors = [
      'meta[property="article:published_time"]',
      'meta[name="pubdate"]',
      'meta[name="publishdate"]',
      'meta[name="PublishDate"]',
      'meta[http-equiv="Date"]',
    ]
    for (const sel of metaSelectors) {
      const val = $(sel).attr('content')
      if (val) {
        const d = new Date(val.trim())
        if (!isNaN(d.getTime())) return d
      }
    }

    const timeVal = $('time').first().attr('datetime') || $('time').first().text()
    if (timeVal) {
      const d = new Date(timeVal.trim())
      if (!isNaN(d.getTime())) return d
    }

    const dateSelectors = [
      '.pub-date', '.publish-time', '.post-date', '.article-date', '.news-date',
      '.date', '.time', '[class*="pub"]', '[class*="date"]', '[class*="time"]',
    ]
    for (const sel of dateSelectors) {
      const text = $(sel).first().text().trim()
      if (text) {
        const cnMatch = text.match(/(\d{4})\s*[年/\-.]\s*(\d{1,2})\s*[月/\-.]\s*(\d{1,2})/)
        if (cnMatch) {
          const d = new Date(`${cnMatch[1]}-${cnMatch[2].padStart(2, '0')}-${cnMatch[3].padStart(2, '0')}`)
          if (!isNaN(d.getTime())) return d
        }
        const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})/)
        if (isoMatch) {
          const d = new Date(isoMatch[1])
          if (!isNaN(d.getTime())) return d
        }
      }
    }

    const bodyText = $('body').text()
    const datePatterns = [
      { pattern: /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日[\s\d:]*发布/, hasGroups: true },
      { pattern: /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日[\s\d:]*/, hasGroups: true },
      { pattern: /发布时间[\s：:]\s*(\d{4}-\d{2}-\d{2})/, hasGroups: false },
      { pattern: /发布日期[\s：:]\s*(\d{4}-\d{2}-\d{2})/, hasGroups: false },
      { pattern: /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/, hasGroups: false },
      { pattern: /(\d{4}-\d{2}-\d{2})/, hasGroups: false },
    ]
    for (const { pattern, hasGroups } of datePatterns) {
      const match = bodyText.match(pattern)
      if (match) {
        let dateStr = match[1]
        if (hasGroups && match[2]) dateStr += `-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
        const d = new Date(dateStr)
        if (!isNaN(d.getTime())) return d
      }
    }

    const infoSelectors = ['.info', '.source', '.meta', '.article-info', '.post-meta', '[class*="info"]', '[class*="meta"]']
    for (const sel of infoSelectors) {
      const text = $(sel).first().text()
      const infoMatch = text.match(/(\d{4})\s*[年/\-.]\s*(\d{1,2})\s*[月/\-.]\s*(\d{1,2})/)
        || text.match(/(\d{4}-\d{2}-\d{2})/)
      if (infoMatch) {
        let dateStr = infoMatch[1]
        if (infoMatch[2]) dateStr += `-${infoMatch[2].padStart(2, '0')}-${infoMatch[3].padStart(2, '0')}`
        const d = new Date(dateStr)
        if (!isNaN(d.getTime())) return d
      }
    }
  } catch {
    // ignore
  }
  return null
}

/** 通用详情页爬取：不依赖CSS选择器配置，同时提取正文和日期 */
async function fetchArticleDetail(url: string): Promise<{ content: string; date: Date | null }> {
  try {
    const html = await fetchHtmlWithEncoding(url, 10000)
    if (!html) return { content: '', date: null }

    const date = extractDateFromHtml(html)
    const $ = cheerio.load(html)

    // 移除干扰元素（导航、广告、免责声明、页脚、面包屑等）
    const junkSelectors = [
      'script', 'style', 'nav', 'header', 'footer', 'aside', 'iframe', '.ad', '.advertisement',
      '.related-read', '.comments', '.sidebar', '.breadcrumb', '.share', '.tags',
      '.copyright', '.warning', '.notice', '.tip', '.declare', '.statement',
      '.disclaimer', '.legal', '.prompt', '[class*="copy"]',
      '[class*="warning"]', '[class*="notice"]', '[class*="tip"]',
      '[class*="declare"]', '[class*="legal"]', '[class*="prompt"]',
      '[class*="disclaimer"]', '[class*="breadcrumb"]', '[class*="share"]',
      '.db-related', '.db-prevnext', '.pagination', '.page-nav',
      '#comment', '.comment', '.reply', '.post-copyright',
      'form', 'input', 'textarea', 'button', 'select',
    ]
    junkSelectors.forEach(sel => $(sel).remove())

    // 优先使用高置信度的正文选择器（从具体到宽泛）
    const selectors = [
      '#artibody',                  // 新浪
      '.TRS_Editor',                // 政府网站
      'article .content',           // 语义化 + 内容区
      'article',                    // 语义化文章标签
      '.article-content',           // 文章内容
      '.content-detail',            // 详情内容
      '.post-content',              // 博客内容
      '.entry-content',             // CMS内容
      '.news-content',              // 新闻内容
      '.detail-content',            // 详情页内容
      '.main-content',              // 主内容区
      '.db-contxt',                 // 中华地板网
      '.contxt', '.context',        // 通用内容
      '[class*="article-body"]',    // 文章主体
      '[class*="article_body"]',    // 文章主体
      '[class*="articleBody"]',     // 文章主体
      '[class*="post-body"]',       // 文章主体
      '[class*="post_body"]',       // 文章主体
      '[class*="news-body"]',       // 新闻主体
      '[class*="news_body"]',       // 新闻主体
      '[class*="detail-body"]',     // 详情主体
      '[class*="detail_body"]',     // 详情主体
      '[class*="content-body"]',    // 内容主体
      '[class*="content_body"]',    // 内容主体
      '[class*="text-body"]',       // 文本主体
      'main',                       // 语义化主内容
    ]

    for (const sel of selectors) {
      const el = $(sel).first()
      if (el.length) {
        // 移除子干扰元素
        el.find('.ad, .advertisement, .share, .tags, .copyright, .related-read, .comments').remove()
        const text = el.text().trim()
        // 过滤掉纯法律声明/免责声明（通常包含特定关键词且很短）
        if (text.length > 300 && !isJunkText(text)) {
          return { content: text.slice(0, 5000), date }
        }
      }
    }

    // fallback: 基于段落密度的算法——找包含最多连续段落的区域
    let bestNode: cheerio.Cheerio | null = null
    let bestScore = 0

    $('div, section').each((_, node) => {
      const $node = $(node)
      const paragraphs = $node.find('p')
      if (paragraphs.length < 3) return

      let textLength = 0
      paragraphs.each((_, p) => {
        textLength += $(p).text().trim().length
      })

      // 评分 = 段落数 * 平均段落长度
      const avgLen = textLength / paragraphs.length
      const score = paragraphs.length * avgLen

      if (score > bestScore) {
        bestScore = score
        bestNode = $node
      }
    })

    if (bestNode && bestScore > 500) {
      bestNode.find('.ad, .advertisement, .share, .tags, .copyright').remove()
      const text = bestNode.text().trim()
      if (text.length > 300 && !isJunkText(text)) {
        return { content: text.slice(0, 5000), date }
      }
    }

    // 最后 fallback: 找最长的段落
    let bestText = ''
    $('p').each((_, p) => {
      const t = $(p).text().trim()
      if (t.length > bestText.length) bestText = t
    })

    return { content: bestText.slice(0, 5000), date }
  } catch {
    return { content: '', date: null }
  }
}

/** 判断文本是否为免责声明/法律声明等垃圾内容 */
function isJunkText(text: string): boolean {
  const lower = text.toLowerCase()
  const junkPatterns = [
    /温馨提醒[：:]/, /免责声明/, /法律声明/, /版权声明/, /风险提示/,
    /加盟.*投资.*风险/, /本网站不承担任何责任/, /自行审核风险/,
    /谨防受骗/, /最终确认的为准/, /不承担任何责任/,
    /部分企业可能不开放加盟/, /投资开店.*核实.*确认/,
    /风险提示.*仅供参考/, /不代表.*立场/, /不构成.*建议/,
  ]
  // 如果前200字包含3个以上的垃圾关键词，判定为垃圾内容
  const prefix = lower.slice(0, 400)
  let hitCount = 0
  for (const pattern of junkPatterns) {
    if (pattern.test(prefix)) hitCount++
  }
  return hitCount >= 2
}

const BATCH_SIZE = 1

// ============================================================
// 硬过滤规则 — 消费端低质量内容一票否决
// ============================================================

/** 消费端技巧类关键词 */
const CONSUMER_KEYWORDS = [
  '避坑', '翻车', '技巧', '攻略', '教程', '怎么选', '多少钱',
  '如何选', '手把手', '新手', '小白', '踩雷', '智商税',
  '后悔', '被坑', '血泪', '教训', '维权', '投诉',
]

/** 个体案例/投诉类关键词 */
const CASE_KEYWORDS = [
  '网友', '业主', '消费者', '客户', '师傅', '工人',
  '装修队', '游击队', '偷工减料',
]

/** 地方性微观调研关键词 */
const LOCAL_SURVEY_KEYWORDS = [
  '西宁', '兰州', '银川', '拉萨', '呼和浩特',
  '某三线城市', '某四线城市', '某县城', '某小区',
]

/** 广告/软文/招商关键词 */
const AD_KEYWORDS = [
  '需要采购', '求购', '询价', '诚招代理', '诚招全国',
  '厂家招商', '品牌招商', '我要代理', '加盟热线',
  '招商加盟', '限时优惠', '选XX就对了', '最好',
]

/** 硬过滤：消费端低质量内容一票否决 */
function isLowQualityConsumerContent(title: string, content: string): boolean {
  const text = `${title} ${content || ''}`

  // 1. 消费端技巧类一票否决
  for (const kw of CONSUMER_KEYWORDS) {
    if (title.includes(kw)) return true
  }

  // 2. 个体案例/投诉（标题特征）
  const casePatterns = [
    /某网友.*翻车/, /某业主.*投诉/, /新房.*翻车/, /装修.*售后/,
    /质量.*投诉/, /售后.*差/, /师傅.*不会/, /工人.*偷懒/,
    /装修队.*坑/, /游击队.*坑/,
  ]
  for (const pattern of casePatterns) {
    if (pattern.test(title)) return true
  }

  // 3. 地方性微观调研（标题明确限定单一小城市且无全国性推导）
  const localPatterns = [
    /西宁.*家庭.*装修/, /兰州.*家庭.*调研/, /某三线城市.*分析/,
    /某县城.*调研/, /某小区.*装修/,
  ]
  for (const pattern of localPatterns) {
    if (pattern.test(title)) return true
  }

  // 4. 广告/软文/招商
  for (const kw of AD_KEYWORDS) {
    if (title.includes(kw)) return true
  }
  if (title.startsWith('咨询') && title.length < 30) return true
  if (title.includes('十大品牌') && (title.includes('排名') || title.includes('评测'))) return true

  // 5. 纯C端消费指南（标题开头特征）
  const consumerStartPatterns = [
    /^如何/, /^怎么/, /^教你/, /^新手/, /^小白/,
    /^签合同/, /^验收/, /^选.*板材/, /^选.*地板/,
    /^装修.*注意/, /^装修.*细节/,
  ]
  for (const pattern of consumerStartPatterns) {
    if (pattern.test(title)) return true
  }

  return false
}

/** B2B采购/招商类硬过滤 */
function isProcurementOrAd(title: string): boolean {
  const t = title.trim()
  const procurementKws = ['需要采购', '求购', '询价', '诚招代理', '诚招全国', '厂家招商', '品牌招商', '我要代理', '加盟热线', '招商加盟']
  if (procurementKws.some(kw => t.includes(kw))) return true
  if (t.startsWith('咨询') && t.length < 30) return true
  if (t.includes('十大品牌') && (t.includes('排名') || t.includes('评测') || t.includes('综合'))) return true
  return false
}

async function processCrawledItems(rawItems: RawItem[], crawlStartTime: Date) {
  let added = 0
  let skipped = 0
  let failed = 0
  let consumerFiltered = 0
  let adFiltered = 0

  console.log(`\n[去重] 原始资讯 ${rawItems.length} 条`)
  const { unique } = dedupItems(rawItems)
  console.log(`[去重] 去重后 ${unique.length} 条`)

  // 第一步：硬过滤消费端低质量内容
  const afterHardFilter = unique.filter((item) => {
    if (isLowQualityConsumerContent(item.title, item.content)) {
      consumerFiltered++
      return false
    }
    if (isProcurementOrAd(item.title)) {
      adFiltered++
      return false
    }
    return true
  })
  console.log(`[硬过滤] 消费端低质量内容: ${consumerFiltered} 条, 广告/招商: ${adFiltered} 条, 保留: ${afterHardFilter.length} 条`)

  const now = new Date()
  const cutoff72h = new Date(now.getTime() - 72 * 60 * 60 * 1000)
  const futureCutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const currentYear = now.getFullYear()

  let yearFiltered = 0
  const afterYearCheck = afterHardFilter.filter((item) => {
    const title = item.title
    const url = item.url

    const yearMatches = title.match(/\b(20\d{2})\b/g)
    if (yearMatches) {
      for (const ym of yearMatches) {
        const y = parseInt(ym, 10)
        if (y < currentYear - 1) { yearFiltered++; return false }
        if (y === currentYear - 1 && !title.includes('年报') && !title.includes('回顾')) { yearFiltered++; return false }
      }
    }

    const urlYearMatch = url.match(/\/(20\d{2})[\/\-]/)
    if (urlYearMatch) {
      const urlYear = parseInt(urlYearMatch[1], 10)
      if (urlYear < currentYear) { yearFiltered++; return false }
    }

    const oldKeywords = ['回顾', '盘点', '去年', '前年', '往届', '历届', '往届回顾']
    if (oldKeywords.some(kw => title.includes(kw))) { yearFiltered++; return false }

    return true
  })
  console.log(`[年份检测] 保留: ${afterYearCheck.length} 条 (排除 ${yearFiltered} 条旧文)`)

  let timeFiltered = 0
  const recentItems = afterYearCheck.filter((item) => {
    const date = item.publishedAt
    if (!date) { timeFiltered++; return false }
    const d = new Date(date)

    const isFallback = Math.abs(d.getTime() - crawlStartTime.getTime()) < 2 * 60 * 1000
    if (!isFallback) {
      const ok = d >= cutoff72h && d <= futureCutoff
      if (!ok) timeFiltered++
      return ok
    }

    const ok = d >= cutoff72h && d <= futureCutoff
    if (!ok) timeFiltered++
    return ok
  })
  console.log(`[日期过滤] 保留: ${recentItems.length} 条 (排除 ${timeFiltered} 条超期)`)

  if (recentItems.length === 0) {
    return { added: 0, skipped: 0, failed: 0, consumerFiltered, adFiltered, sourceStats: {} }
  }

  const sources = await loadActiveSources()
  const sourceMap = new Map<string, string>()
  for (const s of sources) {
    sourceMap.set(s.name, s.id)
  }

  let detailCrawled = 0
  let dateCorrected = 0
  let dateFailed = 0
  for (const item of recentItems) {
    const d = new Date(item.publishedAt)
    const isFallback = Math.abs(d.getTime() - crawlStartTime.getTime()) < 2 * 60 * 1000

    // 两种情况需要爬详情页：1) 日期是fallback（没有正确日期）2) 内容太短（<300字）
    const needsDetail = isFallback || item.content.length < 300
    if (!needsDetail) continue

    try {
      const detail = await fetchArticleDetail(item.url)
      if (detail.content && detail.content.length > item.content.length + 50) {
        item.content = detail.content.slice(0, 5000)
      }
      if (detail.content && detail.content.length > 200) {
        detailCrawled++
      }
      if (detail.date && isFallback) {
        const oldDate = item.publishedAt
        item.publishedAt = detail.date
        dateCorrected++
        console.log(`  [日期修正] ${item.title.slice(0, 35)}... ${oldDate?.toISOString().slice(0,10)} → ${detail.date.toISOString().slice(0,10)}`)
      } else if (isFallback && !detail.date) {
        dateFailed++
        item.publishedAt = null as any
      }
    } catch {
      if (isFallback) {
        dateFailed++
        item.publishedAt = null as any
      }
    }
  }
  if (detailCrawled > 0 || dateCorrected > 0) {
    console.log(`[详情页] 爬取 ${detailCrawled} 条，修正 ${dateCorrected} 条日期，${dateFailed} 条无法获取日期`)
  }

  let postDetailFiltered = 0
  const finalRecentItems = recentItems.filter((item) => {
    const date = item.publishedAt
    if (!date) { postDetailFiltered++; return false }
    const d = new Date(date)

    const isFallback = Math.abs(d.getTime() - crawlStartTime.getTime()) < 2 * 60 * 1000
    if (!isFallback) {
      const ok = d >= cutoff72h && d <= futureCutoff
      if (!ok) postDetailFiltered++
      return ok
    }
    const ok = d >= cutoff72h && d <= futureCutoff
    if (!ok) postDetailFiltered++
    return ok
  })
  if (postDetailFiltered > 0) {
    console.log(`[二次过滤] 详情页修正后排除 ${postDetailFiltered} 条超期，保留 ${finalRecentItems.length} 条`)
  }

  // 二次硬过滤：爬取详情后再次检查内容
  let postCrawlConsumerFiltered = 0
  const afterPostCrawlFilter = finalRecentItems.filter((item) => {
    if (isLowQualityConsumerContent(item.title, item.content)) {
      postCrawlConsumerFiltered++
      return false
    }
    return true
  })
  if (postCrawlConsumerFiltered > 0) {
    console.log(`[二次硬过滤] 详情页内容检查后排除 ${postCrawlConsumerFiltered} 条低质量内容`)
  }

  console.log(`\n[AI处理] 开始五维评分筛选，每批 ${BATCH_SIZE} 条`)

  const allResults: { raw: RawItem; category: string; summary: string; score: number; tags: string[] }[] = []

  for (let i = 0; i < afterPostCrawlFilter.length; i += BATCH_SIZE) {
    const batch = afterPostCrawlFilter.slice(i, i + BATCH_SIZE)
    console.log(`  处理批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(afterPostCrawlFilter.length / BATCH_SIZE)} (${batch.length} 条)`)

    try {
      const batchResults = await batchClassify(
        batch.map((item) => ({ title: item.title, content: item.content, source: item.source, publishedAt: item.publishedAt }))
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

      if (i + BATCH_SIZE < afterPostCrawlFilter.length) {
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
    } catch (error) {
      console.error(`  ✗ 批次处理失败:`, (error as Error).message)
      for (const item of batch) {
        allResults.push({
          raw: item,
          category: 'market',
          summary: item.title.slice(0, 30),
          score: 5,
          tags: ['全屋定制', '中性'],
        })
      }
    }
  }

  // 评分>=6分生成战略解读
  const highScoreItems = allResults.filter((r) => r.score >= 6)
  console.log(`\n[战略解读] ${highScoreItems.length} 条评分≥6分条目需要生成深度解读`)

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
          reasonsMap.set(idx, reasons[j] || '行业战略资讯，建议关注')
        }
        if (i + BATCH_SIZE < highScoreItems.length) {
          await new Promise((resolve) => setTimeout(resolve, 3000))
        }
      } catch (error) {
        console.error(`  ✗ 战略解读生成失败:`, (error as Error).message)
      }
    }
  }

  console.log(`\n[存储] 开始写入数据库`)

  const sourceStats: Record<string, { fetched: number; added: number; failed: number }> = {}
  let scoreAdjusted = 0

  for (let i = 0; i < allResults.length; i++) {
    let { raw, category, summary, score, tags } = allResults[i]
    let finalScore = score

    // 最终硬过滤：采购/招商类强制降分
    if (isProcurementOrAd(raw.title)) {
      finalScore = Math.min(finalScore, 2)
      scoreAdjusted++
    }

    // 内容平衡调整：战略相关性强的内容上浮
    const strategicKeywords = ['人造板', '刨花板', '胶合板', '纤维板', 'OSB', '饰面板', '定制家居', '全屋定制', '高定', '智能家居', '陶瓷', '卫浴', '门窗', '厨卫', '家具', '板材', '木业', '建材家居', '绿色建材', '双碳', '负碳', 'ENF', '装配式', '木结构']
    const isStrategicContent = strategicKeywords.some(kw => raw.title.includes(kw) || raw.content.includes(kw))
    const isRealEstateOnly = (raw.source === '房地产市场' || raw.source === '房地产研究') && !isStrategicContent

    if (isStrategicContent && finalScore < 10) {
      finalScore += 0.5
      scoreAdjusted++
    }
    if (isRealEstateOnly && finalScore > 1) {
      finalScore -= 1
      scoreAdjusted++
    }

    finalScore = Math.round(finalScore * 10) / 10
    finalScore = Math.max(1, Math.min(10, finalScore))

    const reason = reasonsMap.get(i) || (finalScore >= 6 ? '行业战略资讯，建议关注' : '行业相关资讯')
    const isSelected = finalScore >= 6

    // 3 分以下直接丢弃，不入库
    if (finalScore < 3) {
      skipped++
      continue
    }

    if (!sourceStats[raw.source]) {
      sourceStats[raw.source] = { fetched: 0, added: 0, failed: 0 }
    }
    sourceStats[raw.source].fetched++

    try {
      const exists = await prisma.item.findUnique({
        where: { url: raw.url },
      })

      if (exists) {
        skipped++
        continue
      }

      // 标题去重：最近7天内相同标题视为重复
      const recentSameTitle = await prisma.item.findFirst({
        where: {
          title: { equals: raw.title, mode: 'insensitive' },
          publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      })
      if (recentSameTitle) {
        skipped++
        continue
      }

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

  if (scoreAdjusted > 0) {
    console.log(`  [分数调整] ${scoreAdjusted} 条因内容特征调整评分`)
  }

  console.log(`\n处理结果: 新增 ${added} 条, 跳过 ${skipped} 条, 失败 ${failed} 条`)
  return { added, skipped, failed, consumerFiltered, adFiltered, sourceStats }
}

async function generateDaily() {
  const today = new Date().toISOString().split('T')[0]
  console.log(`\n📰 开始生成日报: ${today}`)

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const items = await prisma.item.findMany({
    where: {
      isSelected: true,
      publishedAt: { gte: yesterday },
    },
    orderBy: { score: 'desc' },
    take: 10,
  })

  if (items.length === 0) {
    console.log('  ⚠ 今日无精选内容，跳过日报生成')
    return false
  }

  console.log(`  找到 ${items.length} 条精选内容`)

  const dailyResult = await generateDailyWithSections(
    items.map((item) => ({
      title: item.title,
      summary: item.summary || item.title,
      category: item.category,
      tags: item.tags,
    }))
  )

  const categoryGroups: Record<string, typeof items> = {}
  for (const item of items) {
    if (!categoryGroups[item.category]) categoryGroups[item.category] = []
    categoryGroups[item.category].push(item)
  }

  const sectionsData = dailyResult.sections
    .filter((s) => categoryGroups[s.category] && categoryGroups[s.category].length > 0)
    .map((s) => ({
      category: s.category,
      title: s.title,
      description: s.description,
      itemIds: categoryGroups[s.category].map((item) => item.id),
      order: Object.keys(categoryGroups).indexOf(s.category),
    }))

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

  const exists = await prisma.daily.findUnique({
    where: { date: today },
  })

  if (exists) {
    await prisma.dailySection.deleteMany({
      where: { dailyId: exists.id },
    })

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
  console.log('║      家居战略资讯日报 - 智能同步工具        ║')
  console.log('║    面向CEO/战略发展部的决策级内容筛选       ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log(`\n开始时间: ${new Date().toLocaleString('zh-CN')}`)

  // 支持通过命令行参数传入 log_id，复用已创建的 crawlLog
  const logId = process.argv[2]
  let crawlLog

  if (logId) {
    const existing = await prisma.crawlLog.findUnique({ where: { id: logId } })
    if (existing) {
      crawlLog = existing
      console.log(`📋 复用已有同步记录: ${logId.slice(0, 8)}`)
    }
  }

  if (!crawlLog) {
    crawlLog = await prisma.crawlLog.create({
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    })
  }

  const crawlStartTime = new Date()
  let rawItems: RawItem[] = []
  let result = { added: 0, skipped: 0, failed: 0, consumerFiltered: 0, adFiltered: 0, sourceStats: {} as Record<string, { fetched: number; added: number; failed: number }> }
  let dailyGenerated = false
  let errorMessage: string | null = null

  try {
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

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🤖 第2步：五维评分筛选与存储')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    result = await processCrawledItems(rawItems, crawlStartTime)

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    dailyGenerated = await generateDaily()

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

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 同步完成')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`  爬取资讯: ${rawItems.length} 条`)
    console.log(`  消费端过滤: ${result.consumerFiltered} 条`)
    console.log(`  广告/招商过滤: ${result.adFiltered} 条`)
    console.log(`  新增入库: ${result.added} 条`)
    console.log(`  重复跳过: ${result.skipped} 条`)
    console.log(`  处理失败: ${result.failed} 条`)
    console.log(`  日报生成: ${dailyGenerated ? '✓' : '✗'}`)
    console.log(`\n结束时间: ${new Date().toLocaleString('zh-CN')}`)

    // 触发 Cloudflare Pages 重新构建
    await triggerDeploy()
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
