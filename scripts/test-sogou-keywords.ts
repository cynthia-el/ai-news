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

async function test(query: string) {
  const url = `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent(query)}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      Referer: 'https://weixin.sogou.com/',
    },
  })
  const html = await res.text()
  const $ = cheerio.load(html)

  console.log(`\n=== ${query} ===`)
  let newest: Date | null = null
  let count = 0
  $('.news-list li').each((_, el) => {
    const title = $(el).find('h3 a').first().text().trim()
    const dateText = $(el).find('.s2').first().text().trim()
    const parsed = parseSogouDate(dateText)
    if (parsed) {
      if (!newest || parsed > newest) newest = parsed
    }
    if (count++ < 5) {
      console.log(`${parsed?.toISOString().slice(0,10) || 'null'} | ${title.slice(0, 50)}`)
    }
  })
  const daysAgo = newest ? Math.floor((Date.now() - newest.getTime()) / (24 * 60 * 60 * 1000)) : null
  console.log(`newest: ${newest?.toISOString().slice(0,10)} (${daysAgo} days ago)`)
}

async function main() {
  await test('索菲亚 定制家居')
  await test('人造板 刨花板')
  await test('中国建博会')
  await test('家居建材 行业')
}

main().catch(console.error)
