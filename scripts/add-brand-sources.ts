import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

// ============================================================
// 品牌官网信源配置
// ============================================================
// 注意：品牌官网新闻中心 URL 和选择器需要根据实际情况验证和调整
// 如果某个品牌官网无法抓取，请到 /admin/sources 页面调整配置或暂时禁用

const BRAND_SOURCES = [
  {
    name: '兔宝宝官网',
    url: 'https://www.tubaobao.com.cn/news/',
    category: 'industry-news',
    priority: 10,
    config: {
      listSelector: '.news-list li, .news-item, .item, .list-item',
      itemSelector: {
        title: 'a, .title, h3, h2',
        link: 'a',
        date: '.date, .time, .pub-date',
        summary: '.summary, .desc, .intro, p',
      },
    },
  },
  {
    name: '莫干山官网',
    url: 'https://www.mogan-mountain.com/news/',
    category: 'industry-news',
    priority: 10,
    config: {
      listSelector: '.news-list li, .news-item, .item, .list-item',
      itemSelector: {
        title: 'a, .title, h3, h2',
        link: 'a',
        date: '.date, .time, .pub-date',
        summary: '.summary, .desc, .intro, p',
      },
    },
  },
  {
    name: '千年舟官网',
    url: 'https://www.qiannianzhou.com/news/',
    category: 'industry-news',
    priority: 10,
    config: {
      listSelector: '.news-list li, .news-item, .item, .list-item',
      itemSelector: {
        title: 'a, .title, h3, h2',
        link: 'a',
        date: '.date, .time, .pub-date',
        summary: '.summary, .desc, .intro, p',
      },
    },
  },
  {
    name: '鲁丽木业官网',
    url: 'https://www.luligroup.com/news/',
    category: 'industry-news',
    priority: 10,
    config: {
      listSelector: '.news-list li, .news-item, .item, .list-item',
      itemSelector: {
        title: 'a, .title, h3, h2',
        link: 'a',
        date: '.date, .time, .pub-date',
        summary: '.summary, .desc, .intro, p',
      },
    },
  },
  {
    name: '千山板材官网',
    url: 'https://www.qianshanmuye.com/news/',
    category: 'industry-news',
    priority: 10,
    config: {
      listSelector: '.news-list li, .news-item, .item, .list-item',
      itemSelector: {
        title: 'a, .title, h3, h2',
        link: 'a',
        date: '.date, .time, .pub-date',
        summary: '.summary, .desc, .intro, p',
      },
    },
  },
  {
    name: '索菲亚官网',
    url: 'https://www.sogal.com/news/',
    category: 'industry-news',
    priority: 10,
    config: {
      listSelector: '.news-list li, .news-item, .item, .list-item',
      itemSelector: {
        title: 'a, .title, h3, h2',
        link: 'a',
        date: '.date, .time, .pub-date',
        summary: '.summary, .desc, .intro, p',
      },
    },
  },
  {
    name: '欧派官网',
    url: 'https://www.oppein.cn/news/',
    category: 'industry-news',
    priority: 10,
    config: {
      listSelector: '.news-list li, .news-item, .item, .list-item',
      itemSelector: {
        title: 'a, .title, h3, h2',
        link: 'a',
        date: '.date, .time, .pub-date',
        summary: '.summary, .desc, .intro, p',
      },
    },
  },
  {
    name: '志邦官网',
    url: 'https://www.zbom.com/news/',
    category: 'industry-news',
    priority: 10,
    config: {
      listSelector: '.news-list li, .news-item, .item, .list-item',
      itemSelector: {
        title: 'a, .title, h3, h2',
        link: 'a',
        date: '.date, .time, .pub-date',
        summary: '.summary, .desc, .intro, p',
      },
    },
  },
  {
    name: '福人官网',
    url: 'https://www.furen.com/news/',
    category: 'industry-news',
    priority: 10,
    config: {
      listSelector: '.news-list li, .news-item, .item, .list-item',
      itemSelector: {
        title: 'a, .title, h3, h2',
        link: 'a',
        date: '.date, .time, .pub-date',
        summary: '.summary, .desc, .intro, p',
      },
    },
  },
  {
    name: '福庆官网',
    url: 'https://www.fqwood.com/news/',
    category: 'industry-news',
    priority: 10,
    config: {
      listSelector: '.news-list li, .news-item, .item, .list-item',
      itemSelector: {
        title: 'a, .title, h3, h2',
        link: 'a',
        date: '.date, .time, .pub-date',
        summary: '.summary, .desc, .intro, p',
      },
    },
  },
]

// ============================================================
// 行业垂直媒体 RSS 信源（更稳定）
// ============================================================

const MEDIA_RSS_SOURCES = [
  {
    name: '新浪家居 RSS',
    url: 'https://r.jina.ai/http://jiaju.sina.cn/feed/',
    category: 'industry-news',
    priority: 12,
  },
  {
    name: '网易家居 RSS',
    url: 'https://r.jina.ai/http://home.163.com/rss/',
    category: 'industry-news',
    priority: 12,
  },
]

// ============================================================
// Bing 新闻搜索 - 品牌关键词
// ============================================================

const BING_BRAND_KEYWORDS = [
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
  console.log('🌱 开始更新信源...\n')

  // ============================================================
  // 1. 删除无效信源
  // ============================================================
  console.log('[1/4] 删除无效信源...')

  const patternsToDelete = [
    { url: { startsWith: 'https://news.google.com/' } },
    { url: { startsWith: 'http://news.baidu.com/' } },
    { url: { startsWith: 'https://news.baidu.com/' } },
  ]

  let deletedCount = 0
  for (const pattern of patternsToDelete) {
    const result = await prisma.source.deleteMany({ where: pattern })
    deletedCount += result.count
  }
  console.log(`  ✓ 删除无效信源: ${deletedCount} 个`)

  // 删除爬取结果为空的低质量 WEB 信源（可选，谨慎执行）
  // 这里只删除明确已知的无效信源

  // ============================================================
  // 2. 添加品牌官网 WEB 信源
  // ============================================================
  console.log('\n[2/4] 添加品牌官网信源...')
  let brandAdded = 0
  for (const source of BRAND_SOURCES) {
    const exists = await prisma.source.findFirst({ where: { url: source.url } })
    if (!exists) {
      await prisma.source.create({
        data: {
          name: source.name,
          type: 'WEB',
          url: source.url,
          config: JSON.stringify(source.config),
          category: source.category,
          priority: source.priority,
          isActive: true,
        },
      })
      console.log(`  + ${source.name}`)
      brandAdded++
    } else {
      console.log(`  ⚠ ${source.name} (已存在)`)
    }
  }
  console.log(`  新增品牌官网信源: ${brandAdded} 个`)

  // ============================================================
  // 3. 添加/刷新媒体 RSS 信源
  // ============================================================
  console.log('\n[3/4] 添加媒体 RSS 信源...')
  let rssAdded = 0
  for (const source of MEDIA_RSS_SOURCES) {
    const exists = await prisma.source.findFirst({ where: { url: source.url } })
    if (!exists) {
      await prisma.source.create({
        data: {
          name: source.name,
          type: 'RSS',
          url: source.url,
          config: JSON.stringify({}),
          category: source.category,
          priority: source.priority,
          isActive: true,
        },
      })
      console.log(`  + ${source.name}`)
      rssAdded++
    } else {
      console.log(`  ⚠ ${source.name} (已存在)`)
    }
  }
  console.log(`  新增 RSS 信源: ${rssAdded} 个`)

  // ============================================================
  // 4. 添加 Bing 品牌关键词搜索
  // ============================================================
  console.log('\n[4/4] 添加 Bing 品牌关键词搜索...')
  let bingAdded = 0
  for (const { keyword, category } of BING_BRAND_KEYWORDS) {
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
          priority: 8,
          isActive: true,
        },
      })
      console.log(`  + ${name}`)
      bingAdded++
    } else {
      console.log(`  ⚠ ${name} (已存在)`)
    }
  }
  console.log(`  新增 Bing 关键词信源: ${bingAdded} 个`)

  // ============================================================
  // 统计
  // ============================================================
  const allSources = await prisma.source.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`\n✅ 更新完成！`)
  console.log(`  当前活跃信源总数: ${allSources.length} 个`)
  console.log(`\n  --- WEB 信源 (${allSources.filter(s => s.type === 'WEB').length} 个) ---`)
  for (const s of allSources.filter(s => s.type === 'WEB')) {
    console.log(`    [WEB] ${s.name}`)
  }
  console.log(`\n  --- RSS 信源 (${allSources.filter(s => s.type === 'RSS').length} 个) ---`)
  for (const s of allSources.filter(s => s.type === 'RSS')) {
    console.log(`    [RSS] ${s.name}`)
  }
}

main()
  .catch((e) => { console.error('错误:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
