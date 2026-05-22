async function testSogou(name: string) {
  try {
    const url = `https://weixin.sogou.com/weixin?type=1&query=${encodeURIComponent(name)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    console.log(name, 'status:', res.status)
    if (res.ok) {
      const html = await res.text()
      // 找公众号链接
      const bizMatch = html.match(/href="(\/gzh\?[^"]+)"/)
      if (bizMatch) {
        console.log('  gzh link:', bizMatch[1])
      }
      // 找文章链接
      const articleMatch = html.match(/href="(https:\/\/mp\.weixin\.qq\.com\/s\?[^"]+)"/)
      if (articleMatch) {
        console.log('  article:', articleMatch[1].slice(0, 100))
      }
    }
  } catch (e: any) {
    console.log(name, 'error:', e.message)
  }
}

async function main() {
  const names = ['77度', '大材研究', '中国人造板']
  for (const name of names) {
    await testSogou(name)
  }
}

main().catch(console.error)
