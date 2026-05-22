import 'dotenv/config'

async function testRss(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/rss+xml,application/xml,text/xml,*/*',
      },
    })
    console.log(url, 'status:', res.status)
    if (res.ok) {
      const text = await res.text()
      console.log('  length:', text.length)
      const items = text.match(/<item>/g)
      console.log('  items:', items?.length || 0)
    }
  } catch (e: any) {
    console.log(url, 'error:', e.message)
  }
}

async function main() {
  const urls = [
    'https://r.jina.ai/http://home.163.com/rss/',
    'https://r.jina.ai/http://news.baidu.com/ns?word=%E5%AE%B6%E5%B1%85%E5%BB%BA%E6%9D%90&tn=newsrss&sr=0&cl=2&rn=20&ct=0',
    'https://r.jina.ai/http://rss.sina.com.cn/news/china/focus15.xml',
  ]
  for (const url of urls) {
    await testRss(url)
  }
}

main().catch(console.error)
