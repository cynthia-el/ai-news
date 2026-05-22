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
      console.log('  length:', html.length)
      // 找任何包含weixin.qq.com的链接
      const links = html.match(/href="([^"]*weixin\.qq\.com[^"]*)"/g)
      console.log('  weixin links:', links?.slice(0, 5) || 'none')
      // 找搜索结果中的标题
      const titles = html.match(/<title>([^<]+)<\/title>/)
      console.log('  title:', titles?.[1] || 'none')
    }
  } catch (e: any) {
    console.log(name, 'error:', e.message)
  }
}

async function main() {
  await testSogou('77度')
}

main().catch(console.error)
