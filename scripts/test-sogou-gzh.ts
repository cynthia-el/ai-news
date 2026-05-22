import * as cheerio from 'cheerio'

async function test(query: string) {
  // type=1 搜索公众号
  const url = `https://weixin.sogou.com/weixin?type=1&query=${encodeURIComponent(query)}&ie=utf8`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      Referer: 'https://weixin.sogou.com/',
    },
  })
  const html = await res.text()
  const $ = cheerio.load(html)

  console.log(`\n=== ${query} (type=1) ===`)

  // 找公众号卡片
  $('.gzh-box2, .gzh-box, .wx-news-list2 li').each((i, el) => {
    const name = $(el).find('.gzh-name, .txt-box h3, em').first().text().trim()
    const wechatId = $(el).find('.gzh-weixin, .info label').first().text().trim()
    const link = $(el).find('a').first().attr('href')
    const lastArticle = $(el).find('.gzh-txt, dd a, p a').first().text().trim()
    console.log(`  ${name} | ${wechatId} | ${link?.slice(0, 60)}`)
    console.log(`  latest: ${lastArticle.slice(0, 60)}`)
  })

  // 也尝试找文章列表
  $('.news-list2 li, .wx-news-list2 li').each((i, el) => {
    const title = $(el).find('h3 a, .tit a').first().text().trim()
    const link = $(el).find('h3 a, .tit a').first().attr('href')
    const dateText = $(el).find('.s2, .time').first().text().trim()
    if (title) {
      console.log(`  article: ${dateText} | ${title.slice(0, 50)} | ${link?.slice(0, 60)}`)
    }
  })
}

async function main() {
  await test('77度')
  await test('大材研究')
  await test('中国林产品指标机制')
}

main().catch(console.error)
