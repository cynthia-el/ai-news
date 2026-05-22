import { fetchHtmlWithEncoding } from '../src/lib/sources/adapters/web'
import * as cheerio from 'cheerio'

const urls = [
  'https://www.bmlink.com/news/1125733.html',
  'https://www.bmlink.com/news/1125710.html',
  'https://www.bmlink.com/news/1125735.html',
  'https://www.bmlink.com/news/1125669.html',
  'https://www.bmlink.com/news/1124354.html',
]

async function test() {
  for (const url of urls) {
    try {
      const html = await fetchHtmlWithEncoding(url, 10000)
      if (!html) {
        console.log('FAIL', url, 'empty response')
        continue
      }
      const $ = cheerio.load(html)

      // 尝试多种方式提取日期
      const metaDate = $('meta[property="article:published_time"]').attr('content')
        || $('meta[name="pubdate"]').attr('content')
        || $('meta[name="publishdate"]').attr('content')

      const timeDate = $('time').first().attr('datetime') || $('time').first().text()

      const dateSelectors = ['.pub-date', '.publish-time', '.post-date', '.article-date', '.news-date', '.date', '.time']
      let classDate = ''
      for (const sel of dateSelectors) {
        const text = $(sel).first().text().trim()
        if (text) { classDate = text; break }
      }

      // 从body文本中搜索日期
      const bodyText = $('body').text()
      const dateMatch = bodyText.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
        || bodyText.match(/(\d{4}-\d{2}-\d{2})/)

      console.log('URL:', url)
      console.log('  meta:', metaDate)
      console.log('  time:', timeDate)
      console.log('  class:', classDate)
      console.log('  text match:', dateMatch ? dateMatch[0] : 'none')
      console.log()
    } catch (e: any) {
      console.log('ERROR', url, e.message)
    }
  }
}

test().catch(console.error)
