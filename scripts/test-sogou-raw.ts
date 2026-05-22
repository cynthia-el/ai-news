import * as cheerio from 'cheerio'

async function test() {
  const url = `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent('77度')}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      Referer: 'https://weixin.sogou.com/',
    },
  })
  const html = await res.text()

  // 检查是否有反爬/验证码
  console.log('contains antispider:', html.includes('antispider'))
  console.log('contains 验证码:', html.includes('验证码'))
  console.log('contains verify:', html.includes('verify'))

  const $ = cheerio.load(html)

  // 打印所有class包含news或list的元素
  console.log('\nAll elements with class containing "news" or "list":')
  $('[class*="news"], [class*="list"]').each((i, el) => {
    const tag = el.tagName
    const cls = $(el).attr('class') || ''
    if (cls) console.log(`  <${tag} class="${cls.slice(0, 60)}">`)
  })

  // 打印所有li元素
  console.log('\nAll li elements count:', $('li').length)

  // 打印body文本长度
  console.log('body text length:', $('body').text().length)
}

test().catch(console.error)
