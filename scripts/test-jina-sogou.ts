async function test() {
  const url = 'https://r.jina.ai/http://weixin.sogou.com/weixin?type=2&query=77%E5%BA%A6'
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    console.log('status:', res.status)
    if (res.ok) {
      const text = await res.text()
      console.log('length:', text.length)
      console.log('preview:', text.slice(0, 500))
    }
  } catch (e: any) {
    console.log('error:', e.message)
  }
}

test().catch(console.error)
