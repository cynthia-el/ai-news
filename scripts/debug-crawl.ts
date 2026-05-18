process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_g8ASiRe1LNpM@ep-holy-meadow-aqvv4kth-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require'

import { crawlAllSources, flattenResults } from '../src/lib/crawler'

async function main() {
  console.log('调试爬取结果...\n')
  const results = await crawlAllSources()
  const items = flattenResults(results)

  console.log(`总爬取: ${items.length} 条\n`)

  for (const item of items.slice(0, 10)) {
    console.log('---')
    console.log('来源:', item.source)
    console.log('标题:', item.title.slice(0, 60))
    console.log('URL:', item.url)
    console.log('日期:', item.publishedAt)
    console.log('内容长度:', item.content.length)
    console.log()
  }

  if (items.length > 10) {
    console.log(`... 还有 ${items.length - 10} 条未显示`)
  }
}

main().catch(console.error)
