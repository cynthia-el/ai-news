async function test() {
  try {
    const res = await fetch('https://home.fang.com/news/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    })
    console.log('status:', res.status)
    if (res.ok) {
      const html = await res.text()
      // 找所有包含fang.com/news的链接
      const links = html.match(/href="([^"]*fang\.com\/news[^"]*)"/g)
      console.log('fang news links:', [...new Set(links || [])].slice(0, 20))
      // 找所有a标签文本
      const texts = html.match(/<a[^>]*href="[^"]*"[^>]*>([^<]+)<\/a>/g)
      console.log('sample links:', (texts || []).slice(0, 20))
    }
  } catch (e: any) {
    console.log('error:', e.message)
  }
}

test().catch(console.error)
