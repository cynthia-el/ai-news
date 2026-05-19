import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

// 错误的品牌官网信源（URL为猜测，全部404）
const BAD_BRAND_NAMES = [
  '兔宝宝官网',
  '莫干山官网',
  '千年舟官网',
  '鲁丽木业官网',
  '千山板材官网',
  '索菲亚官网',
  '欧派官网',
  '志邦官网',
  '福人官网',
  '福庆官网',
]

// 用搜狗新闻搜索替代（国内可访问，结构稳定）
const SOGOU_BRAND_KEYWORDS = [
  { keyword: '兔宝宝', category: 'industry-news' },
  { keyword: '莫干山板材', category: 'industry-news' },
  { keyword: '千年舟', category: 'industry-news' },
  { keyword: '鲁丽木业', category: 'industry-news' },
  { keyword: '千山板材', category: 'industry-news' },
  { keyword: '索菲亚家居', category: 'industry-news' },
  { keyword: '欧派家居', category: 'industry-news' },
  { keyword: '志邦家居', category: 'industry-news' },
  { keyword: '福人板材', category: 'industry-news' },
  { keyword: '福庆板材', category: 'industry-news' },
]

async function main() {
  console.log('========== 修复品牌信源 ==========\n')

  // 1. 删除错误的品牌官网WEB信源
  console.log('[1/2] 删除错误的品牌官网信源...')
  const deleted = await prisma.source.deleteMany({
    where: { name: { in: BAD_BRAND_NAMES } },
  })
  console.log(`  ✓ 删除 ${deleted.count} 个错误信源`)

  // 2. 添加搜狗新闻品牌关键词搜索
  console.log('\n[2/2] 添加搜狗新闻品牌关键词搜索...')
  let added = 0
  for (const { keyword, category } of SOGOU_BRAND_KEYWORDS) {
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
            listSelector: '.vrwrap, .result, .news-list li, .rb',
            itemSelector: {
              title: 'h3 a, .news-title a, a[title]',
              link: 'h3 a, .news-title a, a[title]',
              date: '.cite, .time, .news-date, .pub-time',
              summary: '.news-info, .str_info, .content-info, .abstract, p',
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
  console.log(`\n✅ 完成: 删除 ${deleted.count} 个，新增 ${added} 个`)

  // 3. 统计当前活跃信源
  const allSources = await prisma.source.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  })
  console.log(`\n当前活跃信源总数: ${allSources.length} 个`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
