import * as cheerio from 'cheerio'

async function test(query: string) {
  const url = `https://weixin.sogou.com/weixin?type=1&query=${encodeURIComponent(query)}&ie=utf8`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      Referer: 'https://weixin.sogou.com/',
    },
  })
  const html = await res.text()

  console.log(`\n=== ${query} (type=1) ===`)
  console.log('html length:', html.length)

  // 检查是否有反爬
  console.log('has antispider:', html.includes('antispider'))

  const $ = cheerio.load(html)

  // 尝试多种可能的公众号卡片选择器
  const selectors = [
    '.gzh-box2',
    '.gzh-box',
    '.wx-news-list2 li',
    '.news-list2 li',
    '.txt-box',
    '.js_biz_info_item',
    '.gzh-name',
  ]

  for (const sel of selectors) {
    const els = $(sel)
    console.log(`  selector "${sel}": ${els.length} elements`)
    if (els.length > 0 && sel !== '.gzh-name') {
      els.each((i, el) => {
        const name = $(el).find('.gzh-name, h3, .name, em').first().text().trim()
        const wechatId = $(el).find('.gzh-weixin, .weixin-id, .info label').first().text().trim()
        const link = $(el).find('a').first().attr('href')
        if (name) {
          console.log(`    ${name} | ${wechatId} | ${link?.slice(0, 60)}`)
        }
      })
    }
  }

  // 打印部分HTML看看结构
  console.log('\nHTML preview (first 2000 chars):')
  console.log(html.slice(0, 2000))
}

async function main() {
  await test('77度')
}

main().catch(console.error)
