import 'dotenv/config'
import { loadActiveSources } from '../src/lib/sources/manager'
import { WebAdapter } from '../src/lib/sources/adapters/web'

async function testUpdatedSources() {
  const sources = await loadActiveSources()
  const targetNames = [
    '九正建材网-行业资讯',
    '腾讯家居-资讯',
    '中国木业网-行业资讯',
    '中国陶瓷网-资讯',
    '网易家居-行业新闻',
  ]

  for (const name of targetNames) {
    const source = sources.find((s) => s.name === name)
    if (!source) {
      console.log(`\n❌ ${name}: 未找到`)
      continue
    }

    console.log(`\n▶ 测试: ${source.name}`)
    console.log(`  URL: ${source.url}`)

    try {
      const adapter = new WebAdapter()
      const items = await adapter.crawl({
        name: source.name,
        url: source.url,
        config: source.config,
      })

      if (items.length === 0) {
        console.log(`  ⚠️  爬取成功但 0 条数据 - 选择器可能不匹配`)
      } else {
        console.log(`  ✅ 成功: ${items.length} 条`)
        console.log(`  示例: ${items[0].title.substring(0, 50)}...`)
        console.log(`  链接: ${items[0].url.substring(0, 60)}...`)
        console.log(`  日期: ${items[0].publishedAt.toISOString()}`)
      }
    } catch (error) {
      console.log(`  ❌ 失败: ${(error as Error).message}`)
    }
  }
}

testUpdatedSources()
  .catch((e) => console.error(e))
  .finally(() => process.exit(0))
