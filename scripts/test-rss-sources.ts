import 'dotenv/config'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

const TEST_SOURCES = [
  // 政策类
  { name: '中国政府网-最新政策', url: 'http://www.gov.cn/pushinfo/v150203/rss.htm' },
  { name: '中国政府网-国务院信息', url: 'http://www.gov.cn/pushinfo/v150203/rss2.htm' },

  // 财经媒体
  { name: '第一财经-RSS', url: 'https://www.yicai.com/rss/' },
  { name: '36氪-RSS', url: 'https://36kr.com/feed' },
  { name: '虎嗅-RSS', url: 'https://www.huxiu.com/rss/0.xml' },
  { name: '华尔街见闻-RSS', url: 'https://api.wallstreetcn.com/apiv1/rss/global.xml' },
  { name: '界面新闻-RSS', url: 'https://www.jiemian.com/rss/4.xml' },

  // 证券/财报
  { name: '巨潮资讯-最新公告', url: 'http://www.cninfo.com.cn/new/information/topSearch/query?keyWord=建材' },
  { name: '证券时报-RSS', url: 'http://www.stcn.com/rss/company.xml' },

  // 行业
  { name: '中国建材联合会', url: 'http://www.cbmf.org.cn/news/' },
]

async function testRss(name: string, url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/rss+xml,application/xml,text/xml,*/*',
      },
    })

    if (!response.ok) {
      console.log(`  ✗ ${name}: HTTP ${response.status}`)
      return
    }

    const xml = await response.text()

    // 简单检查是否是有效的 RSS/XML
    if (!xml.includes('<rss') && !xml.includes('<feed') && !xml.includes('<channel')) {
      console.log(`  ✗ ${name}: 不是有效的 RSS/XML (前200字符: ${xml.slice(0, 200).replace(/\n/g, ' ')})`)
      return
    }

    // 统计 item 数量
    const itemMatches = xml.match(/<item>/g)
    const count = itemMatches ? itemMatches.length : 0

    if (count > 0) {
      console.log(`  ✓ ${name}: ${count} 条 (${url})`)

      // 打印第一条标题
      const titleMatch = xml.match(/<title>(?:<!\[CDATA\[)?([^<\]]+)/)
      if (titleMatch) {
        console.log(`    示例: ${titleMatch[1].trim().slice(0, 60)}`)
      }
    } else {
      console.log(`  ⚠ ${name}: 0 条 (${url})`)
    }
  } catch (error) {
    console.log(`  ✗ ${name}: ${(error as Error).message}`)
  }
}

async function main() {
  console.log('测试 RSS 信源可用性...\n')

  for (const source of TEST_SOURCES) {
    await testRss(source.name, source.url)
    // 间隔 500ms 避免触发限流
    await new Promise(r => setTimeout(r, 500))
  }

  console.log('\n测试完成')
}

main().catch(console.error)
