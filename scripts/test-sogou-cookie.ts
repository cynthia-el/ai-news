async function test() {
  // 第一步：访问搜狗首页获取Cookie
  const homeRes = await fetch('https://weixin.sogou.com/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  })
  const cookies = homeRes.headers.get('set-cookie') || ''
  console.log('home cookies:', cookies.slice(0, 200))

  // 第二步：使用Cookie搜索
  const url = `https://weixin.sogou.com/weixin?type=1&query=${encodeURIComponent('77度')}&ie=utf8`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Cookie': cookies,
      Referer: 'https://weixin.sogou.com/',
    },
  })
  const html = await res.text()
  console.log('search html length:', html.length)
  console.log('has results:', html.includes('gzh-box') || html.includes('news-list'))

  // 打印是否有公众号结果
  const hasGzh = html.includes('gzh') || html.includes('公众号') || html.includes('微信号')
  console.log('has gzh keywords:', hasGzh)
}

test().catch(console.error)
