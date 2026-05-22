async function test() {
  const urls = [
    'https://www.bmlink.com/news/',
    'https://www.bmlink.com/news/1125835.html',
  ]
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          Referer: 'https://www.bmlink.com/',
        },
      })
      console.log(url, 'status:', res.status)
      if (res.ok) {
        const text = await res.text()
        console.log('  length:', text.length)
      }
    } catch (e: any) {
      console.log(url, 'error:', e.message)
    }
  }
}

test().catch(console.error)
