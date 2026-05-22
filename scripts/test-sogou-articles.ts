async function testSogouArticles(name: string) {
  try {
    const url = `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent(name)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    console.log(name, 'status:', res.status)
    if (res.ok) {
      const html = await res.text()
      console.log('  length:', html.length)
      // 搜狗文章结果通常在 .news-list li 中
      const listItems = html.match(/<li[^>]*id="s?\d+"[^>]*>[\s\S]*?<\/li>/g)
      console.log('  list items:', listItems?.length || 0)
      // 找文章链接
      const links = html.match(/href="(\/link\?url=[^"]+)"/g)
      console.log('  links:', links?.slice(0, 5) || 'none')
      // 找标题
      const titles = html.match(/<a[^>]*target="_blank"[^>]*>([^<]+)<\/a>/g)
      console.log('  titles:', titles?.slice(0, 5) || 'none')
    }
  } catch (e: any) {
    console.log(name, 'error:', e.message)
  }
}

async function main() {
  await testSogouArticles('77度')
}

main().catch(console.error)
