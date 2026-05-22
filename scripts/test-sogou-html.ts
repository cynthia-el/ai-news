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

  // 找news-list的完整HTML
  const listMatch = html.match(/<ul class="news-list">[\s\S]*?<\/ul>/)
  if (listMatch) {
    console.log('news-list HTML:')
    console.log(listMatch[0].slice(0, 3000))
  } else {
    console.log('no news-list found')
    console.log('html preview:', html.slice(0, 2000))
  }
}

test().catch(console.error)
