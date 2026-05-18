import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const REMOTE_DATABASE_URL = 'postgresql://neondb_owner:npg_g8ASiRe1LNpM@ep-holy-meadow-aqvv4kth-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require'

const pool = new Pool({ connectionString: REMOTE_DATABASE_URL, ssl: false })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('修复信源...\n')

  // 1. 删除被墙的 Google News 信源
  const deletedGoogle = await prisma.source.deleteMany({
    where: { url: { startsWith: 'https://news.google.com/' } }
  })
  console.log(`  删除 Google News 信源: ${deletedGoogle.count} 个`)

  // 2. 删除失效的百度 RSS 信源
  const deletedBaidu = await prisma.source.deleteMany({
    where: { url: { startsWith: 'http://news.baidu.com/' } }
  })
  console.log(`  删除百度 RSS 信源: ${deletedBaidu.count} 个`)

  // 3. 添加 Bing 新闻 RSS（国内可访问）
  const bingKeywords = [
    { keyword: '建材', category: 'materials' },
    { keyword: '家居', category: 'industry-news' },
    { keyword: '全屋定制', category: 'industry-news' },
    { keyword: '人造板', category: 'materials' },
    { keyword: '木结构', category: 'materials' },
    { keyword: '装配式建筑', category: 'industry-news' },
    { keyword: '板材', category: 'materials' },
  ]

  let added = 0
  for (const { keyword, category } of bingKeywords) {
    const name = `Bing News - ${keyword}`
    const url = `https://www.bing.com/news/search?q=${encodeURIComponent(keyword)}&format=rss`

    const exists = await prisma.source.findFirst({ where: { url } })
    if (!exists) {
      await prisma.source.create({
        data: {
          name,
          type: 'RSS',
          url,
          config: JSON.stringify({}),
          category,
          isActive: true,
          priority: 10,
        },
      })
      console.log(`  + ${name}`)
      added++
    }
  }

  // 4. 添加搜狗新闻搜索（WEB 爬取）
  const sogouKeywords = [
    { keyword: '建材', category: 'materials' },
    { keyword: '家居', category: 'industry-news' },
  ]

  for (const { keyword, category } of sogouKeywords) {
    const name = `搜狗新闻 - ${keyword}`
    const url = `https://news.sogou.com/news?query=${encodeURIComponent(keyword)}`

    const exists = await prisma.source.findFirst({ where: { url } })
    if (!exists) {
      await prisma.source.create({
        data: {
          name,
          type: 'WEB',
          url,
          config: JSON.stringify({
            listSelector: '.vrwrap, .result, .news-list li',
            itemSelector: {
              title: 'h3 a, .news-title a, a[title]',
              link: 'h3 a, .news-title a, a[title]',
              date: '.cite, .time, .news-date',
              summary: '.news-info, .str_info, .content-info',
            },
          }),
          category,
          isActive: true,
          priority: 8,
        },
      })
      console.log(`  + ${name} (WEB爬取)`)
      added++
    }
  }

  console.log(`\n修复完成: 新增 ${added} 个信源`)

  const allSources = await prisma.source.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } })
  console.log(`\n当前活跃信源: ${allSources.length} 个`)
  for (const s of allSources) {
    console.log(`  [${s.type}] ${s.name}`)
  }
}

main()
  .catch((e) => { console.error('错误:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
