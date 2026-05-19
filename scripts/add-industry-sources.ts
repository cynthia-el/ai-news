import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

// ============================================================
// 国内可访问的行业媒体网站信源
// 注意：这些URL和选择器基于常见网站结构推测，添加后请到 /admin/sources
// 查看爬取效果，抓取失败的请调整选择器或暂时禁用
// ============================================================

const INDUSTRY_WEB_SOURCES = [
  {
    name: '太平洋家居网',
    url: 'https://www.pchouse.com.cn/news/',
    category: 'design-trends',
    priority: 10,
    config: {
      listSelector: '.news-list li, .list-item, .item, .news-item, .pic-txt-list li',
      itemSelector: {
        title: 'h3 a, .title a, a[title], h2 a',
        link: 'h3 a, .title a, a[title], h2 a',
        date: '.date, .time, .pub-time, .pub-date',
        summary: '.summary, .desc, .intro, .info, p',
      },
    },
  },
  {
    name: '九正建材网',
    url: 'https://news.jc001.cn/',
    category: 'materials',
    priority: 10,
    config: {
      listSelector: '.list-item, .news-item, .item, dl, .news-list li',
      itemSelector: {
        title: 'a, .title, h3, h2, dt a',
        link: 'a, .title, h3, h2, dt a',
        date: '.date, .time, .pub-time',
        summary: '.summary, .desc, .intro, dd, p',
      },
    },
  },
  {
    name: '房天下家居',
    url: 'https://home.fang.com/news/',
    category: 'industry-news',
    priority: 10,
    config: {
      listSelector: '.news-list li, .list-item, .item, .news-item',
      itemSelector: {
        title: 'h3 a, .title a, a[title], h2 a',
        link: 'h3 a, .title a, a[title], h2 a',
        date: '.date, .time, .pub-time',
        summary: '.summary, .desc, .intro, p',
      },
    },
  },
  {
    name: '土巴兔装修网',
    url: 'https://www.to8to.com/article/',
    category: 'tips',
    priority: 9,
    config: {
      listSelector: '.article-list li, .list-item, .item, .news-item',
      itemSelector: {
        title: 'h3 a, .title a, a[title], h2 a',
        link: 'h3 a, .title a, a[title], h2 a',
        date: '.date, .time, .pub-time',
        summary: '.summary, .desc, .intro, p',
      },
    },
  },
  {
    name: '齐家网',
    url: 'https://www.jia.com/zixun/',
    category: 'industry-news',
    priority: 9,
    config: {
      listSelector: '.news-list li, .list-item, .item, .news-item',
      itemSelector: {
        title: 'h3 a, .title a, a[title], h2 a',
        link: 'h3 a, .title a, a[title], h2 a',
        date: '.date, .time, .pub-time',
        summary: '.summary, .desc, .intro, p',
      },
    },
  },
  {
    name: '中国木材网',
    url: 'https://www.wood888.com/news/',
    category: 'materials',
    priority: 9,
    config: {
      listSelector: '.news-list li, .list-item, .item, .news-item',
      itemSelector: {
        title: 'a, .title, h3, h2',
        link: 'a, .title, h3, h2',
        date: '.date, .time, .pub-time',
        summary: '.summary, .desc, .intro, p',
      },
    },
  },
]

// 修正现有行业媒体WEB信源的选择器（更通用）
const FIX_EXISTING_SOURCES = [
  {
    name: '新浪家居',
    newConfig: {
      listSelector: '.news-item, .feed-card-item, .ty-card-item, .item, .list-item, li',
      itemSelector: {
        title: 'h3 a, .ty-card-title a, .feed-card-title a, a[title], h2 a',
        link: 'h3 a, .ty-card-title a, .feed-card-title a, a[title], h2 a',
        date: '.date, .time, .ty-card-time, .pub-time',
        summary: '.summary, .feed-card-txt, .ty-card-desc, .intro, p',
      },
    },
  },
  {
    name: '腾讯家居',
    newConfig: {
      listSelector: '.list-item, .news-list li, .item, dl, .news-item',
      itemSelector: {
        title: 'h3 a, .title a, a[title], h2 a, dt a',
        link: 'h3 a, .title a, a[title], h2 a, dt a',
        date: '.time, .date, .pub-time',
        summary: '.summary, .desc, .intro, dd, p',
      },
    },
  },
  {
    name: '网易家居',
    newConfig: {
      listSelector: '.news_item, .data_row, .post_item, .item, .list-item, li',
      itemSelector: {
        title: 'h3 a, .news_title a, .title a, a[title], h2 a',
        link: 'h3 a, .news_title a, .title a, a[title], h2 a',
        date: '.news_time, .time, .post_time, .pub-time',
        summary: '.news_digest, .digest, .summary, .intro, p',
      },
    },
  },
  {
    name: '中国建材网',
    newConfig: {
      listSelector: '.list-item, .news-list li, .item, .news-item, dl, li',
      itemSelector: {
        title: 'h3 a, .title a, a[title], h2 a, dt a',
        link: 'h3 a, .title a, a[title], h2 a, dt a',
        date: '.time, .date, .pub-time',
        summary: '.summary, .desc, .intro, dd, p',
      },
    },
  },
  {
    name: '设计癖',
    newConfig: {
      listSelector: '.post-item, .article-item, .item, .list-item, .news-item',
      itemSelector: {
        title: '.post-title a, h2 a, .title a, a[title], h3 a',
        link: '.post-title a, h2 a, .title a, a[title], h3 a',
        date: '.post-date, .date, time, .pub-time',
        summary: '.post-excerpt, .excerpt, .summary, .intro, p',
      },
    },
  },
]

// ============================================================
// 微信公众号 RSS 信源配置模板
// 需要通过第三方 RSS 服务获取公众号内容，如 wechat2rss
// 用户需自行到 wechat2rss.xlab.app 查找对应公众号的 RSS 地址
// ============================================================

const WECHAT_RSS_TEMPLATE = [
  { name: '微信公众号 - 示例', url: 'https://wechat2rss.xlab.app/feed/公众号ID', category: 'industry-news' },
]

async function main() {
  console.log('========== 添加行业媒体信源 ==========\n')

  // 1. 添加新的行业媒体网站
  console.log('[1/3] 添加行业媒体网站...')
  let added = 0
  for (const source of INDUSTRY_WEB_SOURCES) {
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
      added++
    } else {
      console.log(`  ⚠ ${source.name} (已存在)`)
    }
  }
  console.log(`  新增行业媒体信源: ${added} 个`)

  // 2. 修正现有行业媒体WEB信源的选择器
  console.log('\n[2/3] 修正现有行业媒体信源选择器...')
  let fixed = 0
  for (const { name, newConfig } of FIX_EXISTING_SOURCES) {
    const source = await prisma.source.findFirst({ where: { name } })
    if (source) {
      await prisma.source.update({
        where: { id: source.id },
        data: {
          config: JSON.stringify(newConfig),
        },
      })
      console.log(`  ✓ 修正 ${name} 的选择器`)
      fixed++
    } else {
      console.log(`  ⚠ ${name} (不存在)`)
    }
  }
  console.log(`  修正选择器: ${fixed} 个`)

  // 3. 添加微信公众号RSS模板（默认不活跃，需要用户自行配置URL后启用）
  console.log('\n[3/3] 添加微信公众号RSS模板（默认不活跃）...')
  let wechatAdded = 0
  for (const source of WECHAT_RSS_TEMPLATE) {
    const exists = await prisma.source.findFirst({ where: { url: source.url } })
    if (!exists) {
      await prisma.source.create({
        data: {
          name: source.name,
          type: 'WECHAT_RSS',
          url: source.url,
          config: JSON.stringify({}),
          category: source.category,
          priority: 10,
          isActive: false,
        },
      })
      console.log(`  + ${source.name} (默认禁用，需配置正确URL后启用)`)
      wechatAdded++
    }
  }

  // 统计
  const allSources = await prisma.source.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`\n✅ 完成！`)
  console.log(`  新增行业媒体: ${added} 个`)
  console.log(`  修正选择器: ${fixed} 个`)
  console.log(`  当前活跃信源总数: ${allSources.length} 个`)

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log('📋 微信公众号RSS添加说明')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('微信公众号内容需要通过第三方RSS服务获取：')
  console.log('  1. 访问 https://wechat2rss.xlab.app/')
  console.log('  2. 搜索你想关注的公众号（如：家居建材行业相关）')
  console.log('  3. 复制该公众号的 RSS 地址')
  console.log('  4. 到 /admin/sources 后台添加信源：')
  console.log('     - 类型: 公众号RSS')
  console.log('     - 采集地址: 复制的RSS地址')
  console.log('     - 启用信源')
  console.log('')
  console.log('推荐的家居建材类公众号（可自行搜索添加）：')
  console.log('  - 中国木材网')
  console.log('  - 家居建材圈')
  console.log('  - 全屋定制观察')
  console.log('  - 板材之家')
  console.log('  - 定制家居智库')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
