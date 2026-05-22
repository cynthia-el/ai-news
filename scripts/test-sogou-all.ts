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

const queries = [
  '77度', '大材研究', '定峰汇', '定制观察',
  '中国人造板', '中国建筑材料流通协会', '中国林产品指标机制',
  '临沂市木业协会', '木业网', '亚洲板材家居',
  '中指研究院', '58安居客研究院'
]

async function test(query: string) {
  const url = `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent(query)}`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://weixin.sogou.com/',
      },
    })
    const html = await res.text()
    const $ = cheerio.load(html)

    let newest: Date | null = null
    let newestTitle = ''
    $('.news-list li, .result li').each((_, el) => {
      const title = $(el).find('h3 a, .tit a').first().text().trim()
      const dateText = $(el).find('.s2, .time, .time-s2').first().text().trim()
      const parsed = parseSogouDate(dateText)
      if (parsed && (!newest || parsed > newest)) {
        newest = parsed
        newestTitle = title
      }
    })

    const daysAgo = newest ? Math.floor((Date.now() - newest.getTime()) / (24 * 60 * 60 * 1000)) : null
    console.log(`${query}: ${newest?.toISOString().slice(0,10) || 'null'} (${daysAgo}天前) ${newestTitle.slice(0,40)}`)
  } catch (e: any) {
    console.log(`${query}: error ${e.message}`)
  }
}

async function main() {
  for (const q of queries) {
    await test(q)
    await new Promise(r => setTimeout(r, 1000))
  }
}

main().catch(console.error)
