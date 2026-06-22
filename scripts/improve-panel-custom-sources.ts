import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

// ============================================================
// 聚焦人造板、全屋定制赛道的高质量信源
// ============================================================
// 说明：
// - WEB 源使用行业协会官网、行业垂直媒体，信息权威
// - RSS 源使用实测可访问的站点 RSS
// - 所有 WEB/RSS 源均配置 keywords，采集端先做硬性过滤
// ============================================================

/** 人造板 + 全屋定制核心关键词（用于 RSS/WEB 采集端过滤） */
const FOCUS_KEYWORDS = [
  // 人造板
  '人造板', '刨花板', '胶合板', '纤维板', 'OSB', '饰面板', '板材',
  'ENF', '甲醛', '无醛', 'MDI胶', '大豆胶', '压贴', '饰面',
  '林业', '木材', '木业', '胶粘剂',
  // 全屋定制
  '全屋定制', '定制家居', '整木定制', '整装', '高定',
  '橱柜', '衣柜', '木门', '定制家具',
  '柔性生产', 'C2M',
  // 战略/竞品/产能
  '产能', '产线', '投产', '扩产', '产能利用率',
  '并购', '收购', '战略合作', '合资',
  '财报', '营收', '净利润', '毛利率',
  '门店', '开店', '关店', '经销商', '渠道',
  '出海', '出口', '反倾销', '关税',
  // 政策/绿色
  '以旧换新', '绿色建筑', '双碳', '碳中和', '绿色建材',
]

/** 聚焦行业的 RSS 源（实测可访问） */
const FOCUS_RSS_SOURCES = [
  {
    name: '36氪-人造板定制家居',
    url: 'https://36kr.com/feed',
    category: 'technology',
    priority: 11,
  },
]

/** 行业协会/权威媒体 WEB 源 */
const FOCUS_WEB_SOURCES = [
  {
    name: '中国林产工业协会-新闻资讯',
    url: 'http://www.cnfpia.org/info.html',
    category: 'policy',
    priority: 12,
    config: {
      listSelector: '.infoBox.iB8 .iL3 ul li',
      itemSelector: {
        title: 'a[title]',
        link: 'a[title]',
        date: '',
        summary: '',
      },
      dateFormat: 'yy-MM-dd',
      keywords: FOCUS_KEYWORDS,
    },
  },
  {
    name: '中国林产工业协会-通知公告',
    url: 'http://www.cnfpia.org/notice.html',
    category: 'policy',
    priority: 12,
    config: {
      listSelector: '#emOne li',
      itemSelector: {
        title: 'a',
        link: 'a',
        date: '',
        summary: '',
      },
      dateFormat: 'yy-MM-dd',
      keywords: FOCUS_KEYWORDS,
    },
  },
  {
    name: '中国木业网-行业资讯',
    url: 'https://www.bmlink.com/news/',
    category: 'supply-chain',
    priority: 10,
    config: {
      listSelector: '.news-list li, .list-item, .item, .news-item',
      itemSelector: {
        title: 'a, .title, h3, h2',
        link: 'a, .title, h3, h2',
        date: '.date, .time, .pub-time',
        summary: '.summary, .desc, .intro, p',
      },
      keywords: FOCUS_KEYWORDS,
    },
  },
  {
    name: '中华地板网-行业资讯',
    url: 'https://www.chinafloor.cn/news/',
    category: 'supply-chain',
    priority: 10,
    config: {
      listSelector: '.db-news-list2 .bd ul li',
      itemSelector: {
        title: 'h3 a.a-title',
        link: 'h3 a.a-title',
        date: 'p.icon',
        summary: 'p.leadtxt',
      },
      keywords: FOCUS_KEYWORDS,
    },
  },
]

async function main() {
  console.log('🌟 聚焦人造板/全屋定制信源配置\n')

  // 1. 删除之前添加但无效的 Bing News RSS 源
  console.log('[1/4] 清理无效 RSS 源...')
  const bingDeleted = await prisma.source.deleteMany({
    where: { url: { startsWith: 'https://www.bing.com/news/search' } },
  })
  console.log(`  ✗ 删除 Bing News 源: ${bingDeleted.count} 个`)

  // 2. 添加聚焦 RSS 源
  console.log('\n[2/4] 添加聚焦 RSS 源...')
  let rssAdded = 0
  for (const s of FOCUS_RSS_SOURCES) {
    const exists = await prisma.source.findFirst({ where: { url: s.url } })
    if (!exists) {
      await prisma.source.create({
        data: {
          name: s.name,
          type: 'RSS',
          url: s.url,
          config: JSON.stringify({ keywords: FOCUS_KEYWORDS }),
          category: s.category,
          priority: s.priority,
          isActive: true,
        },
      })
      console.log(`  + ${s.name}`)
      rssAdded++
    } else {
      await prisma.source.update({
        where: { id: exists.id },
        data: { config: JSON.stringify({ keywords: FOCUS_KEYWORDS }) },
      })
      console.log(`  ✓ ${s.name} (已存在，更新 keywords)`)
    }
  }
  console.log(`  新增 RSS 源: ${rssAdded} 个`)

  // 3. 添加/更新行业协会 WEB 源
  console.log('\n[3/4] 添加行业协会 WEB 源...')
  let webAdded = 0
  for (const s of FOCUS_WEB_SOURCES) {
    const exists = await prisma.source.findFirst({ where: { url: s.url } })
    if (!exists) {
      await prisma.source.create({
        data: {
          name: s.name,
          type: 'WEB',
          url: s.url,
          config: JSON.stringify(s.config),
          category: s.category,
          priority: s.priority,
          isActive: true,
        },
      })
      console.log(`  + ${s.name}`)
      webAdded++
    } else {
      await prisma.source.update({
        where: { id: exists.id },
        data: { config: JSON.stringify(s.config), isActive: true },
      })
      console.log(`  ✓ ${s.name} (已存在，更新配置)`)
    }
  }
  console.log(`  新增 WEB 源: ${webAdded} 个`)

  // 4. 为现有无 keywords 的 RSS 源补充过滤
  console.log('\n[4/4] 为现有无 keywords 的 RSS 源补充过滤...')
  const rssSources = await prisma.source.findMany({ where: { type: 'RSS' } })
  let updated = 0
  for (const s of rssSources) {
    let cfg: any = {}
    try {
      cfg = s.config ? JSON.parse(s.config) : {}
    } catch {
      cfg = {}
    }
    if (cfg.keywords === undefined) {
      cfg.keywords = FOCUS_KEYWORDS
      await prisma.source.update({
        where: { id: s.id },
        data: { config: JSON.stringify(cfg) },
      })
      console.log(`  ✓ 补充 keywords: ${s.name}`)
      updated++
    }
  }
  console.log(`  补充 keywords 源: ${updated} 个`)

  // 统计
  const activeCount = await prisma.source.count({ where: { isActive: true } })
  console.log(`\n✅ 完成！当前活跃信源总数: ${activeCount} 个`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
