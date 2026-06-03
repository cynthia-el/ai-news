import 'dotenv/config'
import * as cheerio from 'cheerio'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

const TEST_URLS = [
  // 政策类
  { name: '中国政府网-政策', url: 'https://www.gov.cn/zhengce/zhengceku/', selector: '.list li, .news_list li' },
  { name: '住建部-新闻', url: 'https://www.mohurd.gov.cn/xinwen/gzdt/', selector: 'ul.news_list li, .list li' },
  { name: '发改委-新闻', url: 'https://www.ndrc.gov.cn/xwdt/', selector: '.list li, ul li' },

  // 财经类
  { name: '东方财富-建材', url: 'https://data.eastmoney.com/report/industry.jshtml?industryCode=220', selector: 'table tbody tr' },
  { name: '同花顺-财经', url: 'https://basic.10jqka.com.cn/16/worth.html', selector: '.news-list li' },

  // 新闻类
  { name: '百度新闻-家居', url: 'https://news.baidu.com/ns?word=家居建材&tn=news&from=news&cl=2&rn=20&ct=0', selector: '.result' },
  { name: '搜狗微信-家居', url: 'https://weixin.sogou.com/weixin?type=2&query=家居建材行业', selector: '.news-list li' },
]

async function testWeb(name: string, url: string, selector: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    if (!response.ok) {
      console.log(`  ✗ ${name}: HTTP ${response.status}`)
      return
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const items = $(selector)
    console.log(`  ${items.length > 0 ? '✓' : '⚠'} ${name}: ${items.length} 条 (选择器: ${selector})`)

    if (items.length > 0) {
      const first = items.first()
      const title = first.find('a').text().trim() || first.text().trim()
      console.log(`    示例: ${title.slice(0, 60)}`)

      const link = first.find('a').attr('href')
      if (link) console.log(`    链接: ${link.slice(0, 80)}`)
    }
  } catch (error) {
    console.log(`  ✗ ${name}: ${(error as Error).message}`)
  }
}

async function main() {
  console.log('测试网页爬虫信源...\n')
  for (const source of TEST_URLS) {
    await testWeb(source.name, source.url, source.selector)
    await new Promise(r => setTimeout(r, 1000))
  }
  console.log('\n测试完成')
}

main().catch(console.error)
