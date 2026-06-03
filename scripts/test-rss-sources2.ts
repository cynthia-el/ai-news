import 'dotenv/config'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

const TEST_SOURCES = [
  // 综合新闻 RSS（可能有效）
  { name: '网易新闻-RSS', url: 'https://news.163.com/special/00011K6L/rss_newstop.xml' },
  { name: '腾讯新闻-RSS', url: 'https://news.qq.com/newsgn/rss_newsgn.xml' },
  { name: '新浪新闻-RSS', url: 'https://rss.sina.com.cn/news/china/focus15.xml' },
  { name: '搜狐新闻-RSS', url: 'http://news.sohu.com/rss/guonei.xml' },

  // 财经 RSS
  { name: '新浪财经-RSS', url: 'https://rss.sina.com.cn/finance/focus15.xml' },
  { name: '新浪财经-公司', url: 'https://rss.sina.com.cn/finance/company/focus15.xml' },
  { name: '雪球-热门文章', url: 'https://xueqiu.com/hots/rss' },

  // 行业 RSS
  { name: '亿欧网-RSS', url: 'https://www.iyiou.com/rss' },
  { name: '雷峰网-RSS', url: 'https://www.leiphone.com/rss' },
  { name: '动脉网-RSS', url: 'https://www.vbdata.cn/rss' },

  // 知乎/头条
  { name: '知乎每日精选', url: 'https://www.zhihu.com/rss' },

  // 英文 RSS（国际视角）
  { name: 'Reuters-China', url: 'https://www.reutersagency.com/feed/?taxonomy=markets&post_type=reuters-best' },
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

    if (!xml.includes('<rss') && !xml.includes('<feed') && !xml.includes('<channel')) {
      console.log(`  ✗ ${name}: 无效 RSS (前200字符: ${xml.slice(0, 200).replace(/\n/g, ' ')})`)
      return
    }

    const itemMatches = xml.match(/<item>/g)
    const count = itemMatches ? itemMatches.length : 0

    if (count > 0) {
      console.log(`  ✓ ${name}: ${count} 条`)
      const titleMatch = xml.match(/<title>(?:<!\[CDATA\[)?([^<\]]+)/)
      if (titleMatch) console.log(`    示例: ${titleMatch[1].trim().slice(0, 60)}`)
    } else {
      console.log(`  ⚠ ${name}: 0 条`)
    }
  } catch (error) {
    console.log(`  ✗ ${name}: ${(error as Error).message}`)
  }
}

async function main() {
  console.log('测试第二批 RSS 信源...\n')
  for (const source of TEST_SOURCES) {
    await testRss(source.name, source.url)
    await new Promise(r => setTimeout(r, 500))
  }
  console.log('\n测试完成')
}

main().catch(console.error)
