import * as cheerio from 'cheerio'

function parseSogouDate(dateText: string): Date | null {
  const tsMatch = dateText.match(/timeConvert\('(\d+)'\)/)
  if (tsMatch) {
    const ts = parseInt(tsMatch[1], 10)
    const d = new Date(ts * 1000)
    if (!isNaN(d.getTime())) return d
  }
  const d = new Date(dateText.trim())
  if (!isNaN(d.getTime())) return d
  return null
}

async function test() {
  const url = `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent('77度')}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: 'https://weixin.sogou.com/',
    },
  })
  const html = await res.text()
  const $ = cheerio.load(html)

  $('.news-list li, .result li').each((i, el) => {
    const title = $(el).find('h3 a, .tit a').first().text().trim()
    const dateText = $(el).find('.s2, .time, .time-s2').first().text().trim()
    const parsed = parseSogouDate(dateText)
    console.log(`${i}: ${parsed?.toISOString().slice(0,10) || 'null'} | ${title.slice(0,50)}`)
  })
}

test().catch(console.error)
