import 'dotenv/config'
import * as cheerio from 'cheerio'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

const TEST_URLS = [
  // 财经/证券
  { name: '证券时报-公司', url: 'https://www.stcn.com/company/', selector: '.news-list li, .list li' },
  { name: '财联社-家居', url: 'https://www.cls.cn/searchPage?keyword=%E5%AE%B6%E5%B1%85', selector: '.content-list .news-item' },
  { name: '金融界-建材', url: 'https://finance.jrj.com.cn/invest/buildingmaterial.shtml', selector: '.list li' },

  // 行业政策
  { name: '生态环境部', url: 'https://www.mee.gov.cn/zcwj/zcjd/', selector: '.list li' },
  { name: '市场监管总局', url: 'https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/fgs/', selector: '.list li, .news-list li' },

  // 新闻聚合
  { name: '今日头条-家居', url: 'https://www.toutiao.com/search?keyword=%E5%AE%B6%E5%B1%85%E5%BB%BA%E6%9D%90', selector: '.result-content' },

  // 行业协会（用已有但验证）
  { name: '中国建筑材料联合会', url: 'http://www.cbmf.org.cn/news/', selector: '.news-list li, .list li' },

  // 确定能工作的：发改委
  { name: '发改委-政策发布', url: 'https://www.ndrc.gov.cn/xxgk/zcfb/tz/', selector: '.list li' },
  { name: '发改委-产业动态', url: 'https://www.ndrc.gov.cn/fggz/fzgh/ghwb/gjjgh/', selector: '.list li' },
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
    console.log(`  ${items.length > 0 ? '✓' : '⚠'} ${name}: ${items.length} 条`)

    if (items.length > 0) {
      const first = items.first()
      const title = first.find('a').text().trim() || first.text().trim().slice(0, 60)
      console.log(`    示例: ${title}`)
      const link = first.find('a').attr('href')
      if (link) console.log(`    链接: ${link.slice(0, 80)}`)
    }
  } catch (error) {
    console.log(`  ✗ ${name}: ${(error as Error).message}`)
  }
}

async function main() {
  console.log('测试第二批网页爬虫信源...\n')
  for (const source of TEST_URLS) {
    await testWeb(source.name, source.url, source.selector)
    await new Promise(r => setTimeout(r, 1000))
  }
  console.log('\n测试完成')
}

main().catch(console.error)
