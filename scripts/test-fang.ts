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
      console.log('length:', html.length)
      // 找日期
      const dateMatches = html.match(/(\d{4}-\d{2}-\d{2})/g)
      console.log('dates found:', [...new Set(dateMatches || [])].slice(0, 20))
      // 找链接
      const links = html.match(/href="([^"]+\/news\/\d{4}-\d{2}-\d{2}\/[^"]+)"/g)
      console.log('news links:', [...new Set(links || [])].slice(0, 10))
    }
  } catch (e: any) {
    console.log('error:', e.message)
  }
}

test().catch(console.error)
