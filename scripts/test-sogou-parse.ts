import * as cheerio from 'cheerio'

async function test() {
  try {
    const url = `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent('77度')}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    const html = await res.text()
    const $ = cheerio.load(html)

    // 搜狗文章结果在 .news-list > li 中
    $('.news-list li, .result li').each((i, el) => {
      const title = $(el).find('h3 a, .tit a, a[data-share]').text().trim()
      const link = $(el).find('h3 a, .tit a, a[data-share]').attr('href') || ''
      const summary = $(el).find('.txt-info, .content, p').text().trim()
      const dateText = $(el).find('.s2, .time, .date').text().trim()
      if (title) {
        console.log(`--- ${i} ---`)
        console.log('title:', title.slice(0, 60))
        console.log('link:', link.slice(0, 100))
        console.log('date:', dateText)
        console.log('summary:', summary.slice(0, 100))
      }
    })
  } catch (e: any) {
    console.log('error:', e.message)
  }
}

test().catch(console.error)
