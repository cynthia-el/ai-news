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

async function testDetail(url: string, name: string) {
  console.log(`\n测试: ${name}`)
  console.log(`URL: ${url}`)
  try {
    const html = await fetchHtml(url)
    const $ = cheerio.load(html)

    // 尝试多个选择器
    const selectors = [
      'article', '.article-content', '.content-detail', '#artibody', '.post-content',
      '.entry-content', '.news-content', '.detail-content', '.main-content',
      '[class*="content"]', '[class*="article"]', 'main', '.text', '.txt',
      '.db-contxt', '.TRS_Editor', '.content',
    ]

    for (const sel of selectors) {
      const el = $(sel).first()
      if (el.length) {
        const text = el.text().trim()
        if (text.length > 100) {
          console.log(`  ✓ 选择器 "${sel}" 匹配, 长度: ${text.length}`)
          console.log(`  前200字: ${text.slice(0, 200)}`)
          return
        }
      }
    }

    // fallback: 找最长段落
    let bestText = ''
    $('p').each((_, p) => {
      const t = $(p).text().trim()
      if (t.length > bestText.length) bestText = t
    })
    if (bestText.length > 50) {
      console.log(`  ⚠ 用 <p> 标签 fallback, 长度: ${bestText.length}`)
      console.log(`  前200字: ${bestText.slice(0, 200)}`)
    } else {
      console.log(`  ✗ 内容太短 (${bestText.length} 字符)`)
    }
  } catch (err) {
    console.log(`  ✗ 异常: ${(err as Error).message}`)
  }
}

async function main() {
  await testDetail(
    'https://www.chinafloor.cn/news/detail_newsID-562639.htm',
    '中华地板网-兔宝宝'
  )
  await testDetail(
    'https://home.163.com/24/0529/15/J21L6G6P00108163.html',
    '网易家居-某条'
  )
  await testDetail(
    'https://www.cerambath.com/news/detail-1234.html',
    '中国陶瓷网-某条'
  )
}

main().catch(console.error)
