import * as cheerio from 'cheerio'
import * as iconv from 'iconv-lite'
import { RawItem, SourceAdapter, SourceConfig } from '../types'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// 导航/非文章标题黑名单
const NAV_BLACKLIST = [
  '首页', '新闻中心', '建材展会', '建材行情', '加盟代理', '采购中心',
  '产品供给', '人才频道', '精品推荐', '我要代理', '建材地图',
  '新闻', '体育', '娱乐', '财经', '汽车', '科技', '时尚', '手机', '房产', '教育',
  '地板', '洁具', '陶瓷', '涂料', '防水', '家居', '门窗', '吊顶',
  '管材管件', '厨卫设施', '建筑材料', '机械设备', '精细化工',
]

/** 检测HTML中的charset并正确解码 */
async function fetchHtmlWithEncoding(url: string, timeout = 15000): Promise<string> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    })
    clearTimeout(id)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const buffer = Buffer.from(await response.arrayBuffer())

    // 从Content-Type头中检测编码
    const contentType = response.headers.get('content-type') || ''
    const charsetMatch = contentType.match(/charset=([\w-]+)/i)
    let encoding = charsetMatch ? charsetMatch[1].toLowerCase() : 'utf-8'

    // 仅当header未指定charset时，才检查HTML meta标签
    // （避免meta中的旧编码声明覆盖正确的Content-Type头）
    if (!charsetMatch) {
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
  } catch (error) {
    clearTimeout(id)
    throw error
  }
}

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

/** 解析中文日期，支持多种格式和相对时间 */
function parseDate(dateText: string): Date | null {
  if (!dateText) return null
  const cleaned = dateText.trim().replace(/\s+/g, ' ')

  // 1. 标准ISO/数字格式直接解析
  const d1 = new Date(cleaned)
  if (!isNaN(d1.getTime())) return d1

  // 2. 相对时间："X分钟前", "X小时前", "X天前", "刚刚"
  const relativeMatch = cleaned.match(/^(\d+)\s*[分钟小天时天][钟时前]?前?$/)
  if (relativeMatch) {
    const num = parseInt(relativeMatch[1], 10)
    const now = new Date()
    if (cleaned.includes('分')) now.setMinutes(now.getMinutes() - num)
    else if (cleaned.includes('小时') || cleaned.includes('时')) now.setHours(now.getHours() - num)
    else if (cleaned.includes('天')) now.setDate(now.getDate() - num)
    return now
  }
  if (cleaned === '刚刚' || cleaned === '刚才') return new Date()

  // 3. "今天", "昨天", "前天"
  const now = new Date()
  if (cleaned === '今天') return now
  if (cleaned === '昨天') { now.setDate(now.getDate() - 1); return now }
  if (cleaned === '前天') { now.setDate(now.getDate() - 2); return now }

  // 4. 中文日期格式："2024年5月19日", "2024-05-19", "5月19日"
  const cnFullMatch = cleaned.match(/(\d{4})\s*[年/\-.]\s*(\d{1,2})\s*[月/\-.]\s*(\d{1,2})/)
  if (cnFullMatch) {
    const d2 = new Date(`${cnFullMatch[1]}-${cnFullMatch[2].padStart(2, '0')}-${cnFullMatch[3].padStart(2, '0')}`)
    if (!isNaN(d2.getTime())) return d2
  }

  // 5. 只有月日："5月19日" → 默认为今年
  const cnMonthDayMatch = cleaned.match(/(\d{1,2})\s*[月/\-.]\s*(\d{1,2})/)
  if (cnMonthDayMatch && !cleaned.includes('年')) {
    const year = new Date().getFullYear()
    const d3 = new Date(`${year}-${cnMonthDayMatch[1].padStart(2, '0')}-${cnMonthDayMatch[2].padStart(2, '0')}`)
    if (!isNaN(d3.getTime())) return d3
  }

  // 无法解析
  return null
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
      const html = await fetchHtmlWithEncoding(source.url)
      if (!html) {
        console.warn(`[WebAdapter] ${source.name} 请求失败: 空响应`)
        return items
      }
      const $ = cheerio.load(html)
      const baseUrl = new URL(source.url).origin

      $(cfg.listSelector).each((_, element) => {
        const el = $(element)
        const titleEl = el.find(cfg.itemSelector!.title).first()

        // 优先用页面显示的文本（通常更完整），被截断时才 fallback 到 title 属性
        let title = titleEl.text().trim()
        const isTruncated = title.endsWith('...') || title.endsWith('…') || title.endsWith('..')
        if (!title || isTruncated) {
          const attrTitle = titleEl.attr('title')
          if (attrTitle && attrTitle.trim().length > title.length) {
            title = attrTitle.trim()
          }
        }
        // 仍不完整则尝试父级 <a> 标签的 title
        if (!title || title.endsWith('...') || title.endsWith('…')) {
          const parentATitle = titleEl.closest('a').attr('title')
          if (parentATitle && parentATitle.trim().length > title.length) {
            title = parentATitle.trim()
          }
        }
        const link = titleEl.attr('href') || el.find(cfg.itemSelector!.link).first().attr('href') || el.attr('href') || ''
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
          // 过滤导航页/非文章
          const titleClean = title.trim()
          if (titleClean.length < 5) return
          if (NAV_BLACKLIST.some(kw => titleClean === kw || titleClean.startsWith(kw + ' '))) return

          let url = link.startsWith('http') ? link : new URL(link, baseUrl).href

          // 过滤分类页/列表页URL（非具体文章）
          const urlPath = new URL(url).pathname
          if (urlPath === '/' || urlPath === '' || urlPath.endsWith('/') || urlPath.includes('/list/')) {
            // 进一步判断：如果摘要也很短，大概率是导航/分类页
            if ((summary || '').length < 20) return
          }

          // 搜狗新闻重定向链接：提取真实URL
          if (url.includes('sogou.com/link?')) {
            try {
              const urlObj = new URL(url)
              const realUrl = urlObj.searchParams.get('url')
              if (realUrl) {
                url = decodeURIComponent(realUrl)
              }
            } catch { /* 解析失败则保留原链接 */ }
          }

          // keywords 过滤：如果配置了关键词，标题必须包含至少一个
          if (cfg.keywords && Array.isArray(cfg.keywords) && cfg.keywords.length > 0) {
            const text = (titleClean + ' ' + summary).toLowerCase()
            const matched = cfg.keywords.some((kw: string) => text.includes(kw.toLowerCase()))
            if (!matched) return
          }

          let parsedDate = parseDate(dateText)
          if (!parsedDate) parsedDate = new Date()

          items.push({
            title: titleClean,
            url,
            source: source.name,
            content: summary || titleClean,
            publishedAt: parsedDate,
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
    const html = await fetchHtmlWithEncoding(url)
    if (!html) return ''
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
