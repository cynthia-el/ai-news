import 'dotenv/config'
import * as cheerio from 'cheerio'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

function isJunkText(text: string): boolean {
  const lower = text.toLowerCase()
  const junkPatterns = [
    /温馨提醒[：:]/, /免责声明/, /法律声明/, /版权声明/, /风险提示/,
    /加盟.*投资.*风险/, /本网站不承担任何责任/, /自行审核风险/,
    /谨防受骗/, /最终确认的为准/, /不承担任何责任/,
    /部分企业可能不开放加盟/, /投资开店.*核实.*确认/,
  ]
  const prefix = lower.slice(0, 400)
  let hitCount = 0
  for (const pattern of junkPatterns) {
    if (pattern.test(prefix)) hitCount++
  }
  return hitCount >= 2
}

async function testDetail(url: string) {
  console.log(`\n测试: ${url}`)
  try {
    const html = await fetchHtml(url)
    const $ = cheerio.load(html)

    // 移除干扰元素
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

    // 优先选择器
    const selectors = [
      '#artibody', '.TRS_Editor', 'article .content', 'article',
      '.article-content', '.content-detail', '.post-content',
      '.entry-content', '.news-content', '.detail-content',
      '.main-content', '.db-contxt', '.contxt', '.context',
      '[class*="article-body"]', '[class*="article_body"]', '[class*="articleBody"]',
      '[class*="post-body"]', '[class*="post_body"]', '[class*="news-body"]',
      '[class*="news_body"]', '[class*="detail-body"]', '[class*="detail_body"]',
      '[class*="content-body"]', '[class*="content_body"]', '[class*="text-body"]',
      'main',
    ]

    for (const sel of selectors) {
      const el = $(sel).first()
      if (el.length) {
        el.find('.ad, .advertisement, .share, .tags, .copyright, .related-read, .comments').remove()
        const text = el.text().trim()
        if (text.length > 300 && !isJunkText(text)) {
          console.log(`  ✓ 选择器 "${sel}" 匹配, 长度: ${text.length}`)
          console.log(`  前300字: ${text.slice(0, 300)}`)
          return
        }
      }
    }

    // fallback: 段落密度
    let bestNode: cheerio.Cheerio | null = null
    let bestScore = 0
    $('div, section').each((_, node) => {
      const $node = $(node)
      const paragraphs = $node.find('p')
      if (paragraphs.length < 3) return
      let textLength = 0
      paragraphs.each((_, p) => { textLength += $(p).text().trim().length })
      const avgLen = textLength / paragraphs.length
      const score = paragraphs.length * avgLen
      if (score > bestScore) { bestScore = score; bestNode = $node }
    })

    if (bestNode && bestScore > 500) {
      bestNode.find('.ad, .advertisement, .share, .tags, .copyright').remove()
      const text = bestNode.text().trim()
      if (text.length > 300 && !isJunkText(text)) {
        console.log(`  ✓ 段落密度算法, 长度: ${text.length}`)
        console.log(`  前300字: ${text.slice(0, 300)}`)
        return
      }
    }

    // 最后 fallback
    let bestText = ''
    $('p').each((_, p) => {
      const t = $(p).text().trim()
      if (t.length > bestText.length) bestText = t
    })
    console.log(`  ⚠ <p> fallback, 长度: ${bestText.length}`)
    console.log(`  前300字: ${bestText.slice(0, 300)}`)

  } catch (err) {
    console.log(`  ✗ 异常: ${(err as Error).message}`)
  }
}

async function main() {
  await testDetail('https://www.chinafloor.cn/news/detail_newsID-562639.htm')
}

main().catch(console.error)
