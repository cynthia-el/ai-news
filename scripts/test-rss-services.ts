async function test(url: string) {
  try {
    const res = await fetch(url, { redirect: 'follow', timeout: 10000 } as any)
    console.log(url, 'status:', res.status, 'content-type:', res.headers.get('content-type')?.slice(0, 30))
    if (res.ok && res.headers.get('content-type')?.includes('xml')) {
      const text = await res.text()
      const items = text.match(/<item>/g)
      console.log('  items:', items?.length || 0)
    }
  } catch (e: any) {
    console.log(url, 'error:', e.message)
  }
}

async function main() {
  // 测试一些可能的RSS服务
  await test('https://werss.app/')
  await test('https://feeddd.org/')
  await test('https://wechat2rss.xlab.app/')
  await test('https://rsshub.app/')
}

main().catch(console.error)
