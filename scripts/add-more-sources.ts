import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const REMOTE_DATABASE_URL = 'postgresql://neondb_owner:npg_g8ASiRe1LNpM@ep-holy-meadow-aqvv4kth-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require'

const pool = new Pool({ connectionString: REMOTE_DATABASE_URL, ssl: false })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const MORE_KEYWORDS = [
  { keyword: '人造板', category: 'materials' },
  { keyword: '全屋定制', category: 'industry-news' },
  { keyword: '木结构', category: 'materials' },
  { keyword: '装配式建筑', category: 'industry-news' },
  { keyword: '板材', category: 'materials' },
  { keyword: '家具', category: 'industry-news' },
  { keyword: '装修', category: 'industry-news' },
  { keyword: '地板', category: 'materials' },
  { keyword: '橱柜', category: 'industry-news' },
  { keyword: '木门', category: 'materials' },
]

async function main() {
  console.log('添加更多搜狗新闻信源...\n')

  let added = 0
  for (const { keyword, category } of MORE_KEYWORDS) {
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
      console.log(`  + ${name}`)
      added++
    } else {
      console.log(`  ⚠ ${name} (已存在)`)
    }
  }

  console.log(`\n完成: 新增 ${added} 个信源`)

  const allSources = await prisma.source.count({ where: { isActive: true } })
  console.log(`当前活跃信源总数: ${allSources} 个`)
}

main()
  .catch((e) => { console.error('错误:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
