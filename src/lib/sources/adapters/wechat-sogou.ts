import * as cheerio from 'cheerio'
import { RawItem, SourceAdapter } from '../types'

// ============================================================
// User-Agent 轮换池
// ============================================================
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
]

function getRandomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

// ============================================================
// 低质量内容排除词（一票否决）
// ============================================================
const EXCLUDE_KEYWORDS = [
  '避坑', '翻车', '技巧', '攻略', '教程', '怎么选', '多少钱', '投诉',
  '维权', '踩雷', '智商税', '后悔', '被坑', '血泪', '教训',
  '十大排行', '排行榜', '品牌榜', '口碑榜',
]

// ============================================================
// 高质量信源站点矩阵
// ============================================================

/** 政策/监管类信源 */
const POLICY_SITES = [
  'site:miit.gov.cn',
  'site:mofcom.gov.cn',
  'site:gov.cn',
  'site:cnis.ac.cn',
]

/** 证券研报/资本类信源 */
const CAPITAL_SITES = [
  'site:eastmoney.com',
  'site:10jqka.com.cn',
  'site:xueqiu.com',
  'site:jiemian.com',
  'site:nbd.com.cn',
]

/** 行业垂直媒体信源 */
const INDUSTRY_SITES = [
  'site:furnituretoday.cn',
  'site:ciff-sh.com',
  'site:ciff-gz.com',
  'site:wood365.cn',
  'site:jiaju.com',
  'site:chinafloor.cn',
]

/** 头部企业动态搜索 */
const ENTERPRISE_QUERIES = [
  '索菲亚 战略 OR 财报 OR 出海 OR 并购 OR 新品',
  '欧派家居 整装 OR 渠道 OR 营收 OR 财报',
  '千年舟 人造板 OR 全屋定制 OR 木结构 OR 负碳',
  '兔宝宝 板材 OR 并购 OR 产能 OR 财报',
  '北新建材 出海 OR 战略 OR 财报',
  '莫干山 负碳 OR 绿色建材 OR ENF',
  '云峰 人造板 OR 环保 OR 战略',
  '志邦家居 定制 OR 渠道 OR 出海',
  '金牌厨柜 战略 OR 财报 OR 出海',
  '好莱客 定制 OR 战略 OR 并购',
]

// ============================================================
// 搜索关键词矩阵
// ============================================================

/** 第一梯队：每日必搜 */
const TIER1_KEYWORDS = [
  '人造板 政策 OR 标准 OR 甲醛 OR ENF OR 产能 OR 价格 OR 出口',
  '全屋定制 战略 OR 财报 OR 整装 OR 并购 OR 门店 OR 出海',
  '木结构建筑 政策 OR 装配式 OR 标准 OR 项目 OR 补贴',
  '绿色建材 双碳 OR 负碳 OR 以旧换新 OR 补贴 OR 应用比例',
  '家居行业 研报 OR 深度分析 OR 市场规模 OR 集中度',
]

/** 第二梯队：轮询搜索 */
const TIER2_KEYWORDS = [
  '板材 原材料 OR 木材 OR 胶粘剂 OR 价格 OR 进口',
  '定制家居 渠道变革 OR 整装 OR 设计师渠道 OR 电商',
  '智能家居 AI OR 物联网 OR 互联互通 OR 标准',
  '家具出口 出海 OR 跨境电商 OR 反倾销 OR 关税',
  '存量房装修 旧改 OR 局改 OR 以旧换新 OR 老旧小区',
]

/** 第三梯队：事件驱动（作为补充） */
const TIER3_KEYWORDS = [
  '建博会 新品 OR 趋势 OR 签约',
  '家博会 新品 OR 趋势 OR 签约',
  '广州展 新品 OR 趋势 OR 签约',
  '家居 以旧换新 政策 OR 补贴',
  '人造板 出口 OR 反倾销 OR 关税',
]

// ============================================================
// 构建高级搜索 Query
// ============================================================

/**
 * 为关键词组合添加排除词
 */
function addExcludeTerms(query: string): string {
  const excludes = EXCLUDE_KEYWORDS.map(kw => ` -${kw}`).join('')
  return `${query}${excludes}`
}

/**
 * 为关键词添加 site 限定
 */
function addSiteLimit(query: string, site: string): string {
  return `${query} ${site}`
}

/**
 * 生成完整的搜索 query 列表
 */
function generateSearchQueries(config?: SearchConfig): string[] {
  const queries: string[] = []

  // 如果外部传入了自定义 keywords，优先使用
  if (config?.customKeywords && config.customKeywords.length > 0) {
    for (const kw of config.customKeywords) {
      queries.push(addExcludeTerms(kw))
    }
    return queries
  }

  // 策略 A: 政策类关键词 × 政策信源
  for (const kw of TIER1_KEYWORDS) {
    if (kw.includes('政策') || kw.includes('标准') || kw.includes('绿色建材')) {
      for (const site of POLICY_SITES) {
        queries.push(addExcludeTerms(addSiteLimit(kw, site)))
      }
    }
  }

  // 策略 B: 资本/研报类关键词 × 证券信源
  for (const kw of TIER1_KEYWORDS) {
    if (kw.includes('研报') || kw.includes('财报') || kw.includes('战略')) {
      for (const site of CAPITAL_SITES) {
        queries.push(addExcludeTerms(addSiteLimit(kw, site)))
      }
    }
  }

  // 策略 C: 行业关键词 × 垂直媒体信源（限制数量，避免过多）
  const industryKwSamples = TIER1_KEYWORDS.slice(0, 3)
  for (const kw of industryKwSamples) {
    for (const site of INDUSTRY_SITES.slice(0, 3)) {
      queries.push(addExcludeTerms(addSiteLimit(kw, site)))
    }
  }

  // 策略 D: 头部企业动态（无 site 限定，直接搜）
  for (const eq of ENTERPRISE_QUERIES) {
    queries.push(addExcludeTerms(eq))
  }

  // 策略 E: 第二梯队轮询（简化版本，避免过多请求）
  // 根据星期几选择不同的第二梯队关键词，实现轮询
  const dayOfWeek = new Date().getDay()
  const tier2Today = TIER2_KEYWORDS[dayOfWeek % TIER2_KEYWORDS.length]
  queries.push(addExcludeTerms(tier2Today))

  // 策略 F: 第三梯队轮询（每周选2个）
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  const tier3Indices = [weekNum % TIER3_KEYWORDS.length, (weekNum + 2) % TIER3_KEYWORDS.length]
  for (const idx of tier3Indices) {
    queries.push(addExcludeTerms(TIER3_KEYWORDS[idx]))
  }

  // 去重
  return [...new Set(queries)]
}

interface SearchConfig {
  keywords?: string[]
  pages?: number
  query?: string
  customKeywords?: string[]
  /** 限制每个 query 的最大结果数 */
  maxResultsPerQuery?: number
}

// ============================================================
// 搜狗日期解析
// ============================================================

function parseSogouDate(dateText: string): Date | null {
  const tsMatch = dateText.match(/timeConvert\('(\d+)'\)/)
  if (tsMatch) {
    const ts = parseInt(tsMatch[1], 10)
    const d = new Date(ts * 1000)
    if (!isNaN(d.getTime())) return d
  }
  const d = new Date(dateText.trim())
  if (!isNaN(d.getTime())) return d
  return null
}

// ============================================================
// 带轮换 UA 的 fetch
// ============================================================

async function fetchSogouHtml(url: string, cookie?: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': getRandomUA(),
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      Referer: 'https://weixin.sogou.com/',
      ...(cookie ? { Cookie: cookie } : {}),
    },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) {
    const cookies = setCookie.split(',').map(c => c.split(';')[0]).join('; ')
    ;(fetchSogouHtml as any)._cookie = cookies
  }
  return res.text()
}

// ============================================================
// 内容质量预过滤
// ============================================================

function isValidItem(title: string, summary: string): boolean {
  if (!title || title.length < 5) return false

  const fullText = `${title} ${summary || ''}`

  // 一票否决：明显低质量内容
  for (const kw of EXCLUDE_KEYWORDS) {
    if (title.includes(kw)) return false
  }

  // 排除纯广告/推广
  if (title.includes('广告') || title.includes('推广') || title.includes(' sponsored ')) return false

  // 排除明显无关的类别
  const irrelevant = ['汽车电瓶', '电动车电池', '锂电池', '新能源汽车', '光伏', '风电', '储能']
  if (irrelevant.some(kw => title.includes(kw) && summary.includes(kw))) return false

  // 排除纯C端消费指南类（通过标题特征）
  const consumerPatterns = [
    /^如何/, /^怎么/, /^(教你|手把手)/, /^(新手|小白)/,
    /签合同.*条款/, /条款.*注意/, /验收.*标准/,
    /师傅.*不会/, /工人.*偷懒/, /装修队.*坑/,
  ]
  for (const pattern of consumerPatterns) {
    if (pattern.test(title)) return false
  }

  return true
}

// ============================================================
// 主适配器
// ============================================================

export class WechatSogouAdapter implements SourceAdapter {
  async crawl(source: { name: string; url: string; config: string | null }): Promise<RawItem[]> {
    const allItems: RawItem[] = []
    const seenUrls = new Set<string>()
    const seenTitles = new Set<string>()

    let config: SearchConfig = {}
    try {
      config = source.config ? JSON.parse(source.config) : {}
    } catch {
      config = {}
    }

    const queries = generateSearchQueries(config)
    const maxPages = Math.min(config.pages || 2, 3)
    const maxResultsPerQuery = config.maxResultsPerQuery || 10
    const adapterCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    console.log(`[SogouWechat] ${source.name}: 生成 ${queries.length} 个搜索 query`)

    let totalQueryIndex = 0
    for (const query of queries) {
      totalQueryIndex++
      let cookie = (fetchSogouHtml as any)._cookie || ''
      let consecutiveEmpty = 0
      let queryResultCount = 0

      for (let page = 1; page <= maxPages; page++) {
        try {
          const pageParam = page === 1 ? '' : `&page=${page * 10}`
          // 搜狗微信搜索 URL，type=2 表示搜文章
          const searchUrl = `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent(query)}${pageParam}`

          // 请求间隔 >3秒，且根据 query 序号递增，分散请求
          const delayMs = 3500 + Math.random() * 2000 + (totalQueryIndex * 500)
          await new Promise(r => setTimeout(r, delayMs))

          const html = await fetchSogouHtml(searchUrl, cookie)
          cookie = (fetchSogouHtml as any)._cookie || cookie

          if (html.includes('antispider') || html.includes('验证码') || html.includes('您的访问过于频繁')) {
            console.warn(`[SogouWechat] ${source.name} query "${query.slice(0, 40)}..." page=${page} 触发反爬，停止该query`)
            break
          }

          const $ = cheerio.load(html)
          const resultSelector = '.news-list li, .result li, ul.news-list > li'
          const pageItems: RawItem[] = []

          $(resultSelector).each((_, element) => {
            const el = $(element)
            const titleEl = el.find('h3 a, .tit a').first()
            const title = titleEl.text().trim()
            const sogouLink = titleEl.attr('href') || ''
            const summary = el.find('.txt-info, .content, p').first().text().trim()
            const dateText = el.find('.s2, .time, .time-s2').first().text().trim()
            const parsedDate = parseSogouDate(dateText)

            if (!title || !sogouLink) return
            if (!isValidItem(title, summary)) return
            if (seenUrls.has(sogouLink)) return
            if (seenTitles.has(title)) return

            const fullLink = sogouLink.startsWith('http') ? sogouLink : `https://weixin.sogou.com${sogouLink}`

            const item: RawItem = {
              title,
              url: fullLink,
              source: source.name,
              content: summary || title,
              publishedAt: parsedDate || new Date(),
            }

            pageItems.push(item)
          })

          if (pageItems.length === 0) {
            consecutiveEmpty++
            if (consecutiveEmpty >= 2) {
              console.log(`[SogouWechat] ${source.name} query "${query.slice(0, 40)}..." 连续空页，停止翻页`)
              break
            }
          } else {
            consecutiveEmpty = 0
          }

          let staleCount = 0
          for (const item of pageItems) {
            const d = item.publishedAt
            const isFallback = Math.abs(d.getTime() - Date.now()) < 60 * 1000
            if (!isFallback && d < adapterCutoff) {
              staleCount++
              continue
            }
            if (queryResultCount >= maxResultsPerQuery) {
              break
            }
            seenUrls.add(item.url)
            seenTitles.add(item.title)
            allItems.push(item)
            queryResultCount++
          }

          if (staleCount > 0) {
            console.log(`[SogouWechat] ${source.name} query "${query.slice(0, 40)}..." page=${page} 过滤 ${staleCount}/${pageItems.length} 条超期`)
          }

          if (pageItems.length > 0 && staleCount === pageItems.length) {
            console.log(`[SogouWechat] ${source.name} query "${query.slice(0, 40)}..." page=${page} 全部超期，停止翻页`)
            break
          }

          if (queryResultCount >= maxResultsPerQuery) {
            break
          }

        } catch (error) {
          console.error(`[SogouWechat] ${source.name} query "${query.slice(0, 40)}..." page=${page} 异常:`, (error as Error).message)
          break
        }
      }

      if (totalQueryIndex % 5 === 0) {
        console.log(`[SogouWechat] ${source.name}: 已处理 ${totalQueryIndex}/${queries.length} 个query，累计 ${allItems.length} 条`)
      }
    }

    allItems.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())

    console.log(`[SogouWechat] ${source.name}: 最终 ${allItems.length} 条 (去重后，来自 ${queries.length} 个query)`)
    return allItems
  }
}
