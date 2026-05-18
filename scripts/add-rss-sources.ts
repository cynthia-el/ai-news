import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// 直接连接远程数据库
const REMOTE_DATABASE_URL = 'postgresql://neondb_owner:npg_g8ASiRe1LNpM@ep-holy-meadow-aqvv4kth-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require'

const pool = new Pool({ connectionString: REMOTE_DATABASE_URL, ssl: false })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const KEYWORDS = [
  { keyword: '建材', category: 'materials' },
  { keyword: '家居', category: 'industry-news' },
  { keyword: '全屋定制', category: 'industry-news' },
  { keyword: '人造板', category: 'materials' },
  { keyword: '木结构', category: 'materials' },
  { keyword: '装配式建筑', category: 'industry-news' },
  { keyword: '板材', category: 'materials' },
]

async function main() {
  console.log('开始添加 RSS 信源...\n')

  let added = 0
  let skipped = 0

  for (const { keyword, category } of KEYWORDS) {
    // Google News RSS
    const googleName = `Google News - ${keyword}`
    const googleUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`

    const existingGoogle = await prisma.source.findFirst({ where: { url: googleUrl } })
    if (!existingGoogle) {
      await prisma.source.create({
        data: {
          name: googleName,
          type: 'RSS',
          url: googleUrl,
          config: JSON.stringify({}),
          category,
          isActive: true,
          priority: 10,
        },
      })
      console.log(`  + ${googleName}`)
      added++
    } else {
      console.log(`  ⚠ ${googleName} (已存在)`)
      skipped++
    }

    // 百度新闻 RSS
    const baiduName = `百度新闻 - ${keyword}`
    const baiduUrl = `http://news.baidu.com/ns?word=${encodeURIComponent(keyword)}&tn=newsrss&sr=0&cl=2&rn=20&ct=0`

    const existingBaidu = await prisma.source.findFirst({ where: { url: baiduUrl } })
    if (!existingBaidu) {
      await prisma.source.create({
        data: {
          name: baiduName,
          type: 'RSS',
          url: baiduUrl,
          config: JSON.stringify({}),
          category,
          isActive: true,
          priority: 8,
        },
      })
      console.log(`  + ${baiduName}`)
      added++
    } else {
      console.log(`  ⚠ ${baiduName} (已存在)`)
      skipped++
    }
  }

  console.log(`\n完成: 新增 ${added} 个, 跳过 ${skipped} 个`)

  // 列出所有信源
  const allSources = await prisma.source.findMany({ orderBy: { createdAt: 'asc' } })
  console.log(`\n当前共有 ${allSources.length} 个信源:`)
  for (const s of allSources) {
    console.log(`  [${s.isActive ? '✓' : '✗'}] ${s.name} (${s.type})`)
  }
}

main()
  .catch((e) => {
    console.error('错误:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
