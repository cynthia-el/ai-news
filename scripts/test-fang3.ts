async function test() {
  try {
    const res = await fetch('https://news.fang.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    })
    console.log('status:', res.status)
    if (res.ok) {
      const html = await res.text()
      console.log('length:', html.length)
      const links = html.match(/href="([^"]*open\/\d+[^"]*)"/g)
      console.log('news links:', [...new Set(links || [])].slice(0, 20))
    }
  } catch (e: any) {
    console.log('error:', e.message)
  }
}

test().catch(console.error)
