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

async function test(query: string, page: number) {
  const url = `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent(query)}&page=${page}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      Referer: 'https://weixin.sogou.com/',
    },
  })
  const html = await res.text()
  const $ = cheerio.load(html)

  console.log(`\n=== ${query} page=${page} ===`)
  let count = 0
  $('.news-list li').each((_, el) => {
    const title = $(el).find('h3 a').first().text().trim()
    const dateText = $(el).find('.s2').first().text().trim()
    const parsed = parseSogouDate(dateText)
    console.log(`${parsed?.toISOString().slice(0,10) || 'null'} | ${title.slice(0, 50)}`)
    count++
  })
  console.log(`total: ${count} items`)
}

async function main() {
  for (let p = 1; p <= 3; p++) {
    await test('77度', p)
    await new Promise(r => setTimeout(r, 2000))
  }
}

main().catch(console.error)
