import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('🧹 清理旧数据并初始化新信源...')

  // 1. 删除所有历史资讯
  const deletedItems = await prisma.item.deleteMany({})
  console.log(`  ✓ 删除 ${deletedItems.count} 条历史资讯`)

  // 2. 删除所有日报和版块
  const deletedSections = await prisma.dailySection.deleteMany({})
  const deletedDailies = await prisma.daily.deleteMany({})
  console.log(`  ✓ 删除 ${deletedDailies.count} 条日报, ${deletedSections.count} 个版块`)

  // 3. 删除旧信源
  const deletedSources = await prisma.source.deleteMany({})
  console.log(`  ✓ 删除 ${deletedSources.count} 个旧信源`)

  // 4. 创建新信源
  const newSources = [
    {
      name: '新浪家居-企业新闻',
      type: 'WEB',
      url: 'https://jiaju.sina.cn/news/list-jiaju-a42',
      config: JSON.stringify({
        listSelector: '#news_list a.itembox',
        itemSelector: {
          title: 'h4',
          link: 'a.itembox',
          date: 'span.time',
          summary: 'p.desc',
        },
        detailSelector: {
          content: '#artibody, .article-content, .content-detail',
          filter: '.ad, .advertisement, .related-read, script, style',
        },
      }),
      category: 'market',
      priority: 10,
      isActive: true,
    },
    {
      name: '中华地板网-行业资讯',
      type: 'WEB',
      url: 'https://www.chinafloor.cn/news/',
      config: JSON.stringify({
        listSelector: '.db-news-list2 .bd ul li',
        itemSelector: {
          title: 'h3 a.a-title',
          link: 'h3 a.a-title',
          date: 'p.icon',
          summary: 'p.leadtxt',
        },
        detailSelector: {
          content: '.db-contxt, .article-content, .content-detail',
          filter: '.ad, .advertisement, .related-read, script, style',
        },
      }),
      category: 'supply-chain',
      priority: 9,
      isActive: true,
    },
  ]

  for (const source of newSources) {
    await prisma.source.create({ data: source })
    console.log(`  ✓ 创建信源: ${source.name}`)
  }

  console.log('\n✅ 信源重置完成，共', newSources.length, '个活跃信源')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
