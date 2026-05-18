import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

// ============================================================
// 默认信源配置
// ============================================================

const DEFAULT_SOURCES = [
  {
    name: '新浪家居',
    type: 'WEB',
    url: 'https://jiaju.sina.cn',
    config: JSON.stringify({
      listSelector: '.news-item, .feed-card-item, .ty-card-item',
      itemSelector: {
        title: 'h3 a, .ty-card-title a, .feed-card-title a',
        link: 'h3 a, .ty-card-title a, .feed-card-title a',
        date: '.date, .time, .ty-card-time',
        summary: '.summary, .feed-card-txt, .ty-card-desc',
      },
      detailSelector: {
        content: '#artibody, .article-content, .content-detail',
        filter: '.ad, .advertisement, .related-read, script, style',
      },
    }),
    category: 'industry-news',
    priority: 10,
  },
  {
    name: '腾讯家居',
    type: 'WEB',
    url: 'https://home.qq.com',
    config: JSON.stringify({
      listSelector: '.list-item, .news-list li, .item',
      itemSelector: {
        title: 'h3 a, .title a, a[title]',
        link: 'h3 a, .title a, a[title]',
        date: '.time, .date, .pub-time',
        summary: '.summary, .desc, .intro',
      },
    }),
    category: 'industry-news',
    priority: 10,
  },
  {
    name: '网易家居',
    type: 'WEB',
    url: 'https://home.163.com',
    config: JSON.stringify({
      listSelector: '.news_item, .data_row, .post_item',
      itemSelector: {
        title: 'h3 a, .news_title a, .title a',
        link: 'h3 a, .news_title a, .title a',
        date: '.news_time, .time, .post_time',
        summary: '.news_digest, .digest, .summary',
      },
      detailSelector: {
        content: '.post_body, .article-content, #content',
        filter: '.ad, .gg, .recommend, script, style',
      },
    }),
    category: 'industry-news',
    priority: 10,
  },
  {
    name: '太平洋家居',
    type: 'WEB',
    url: 'https://www.pchouse.com.cn',
    config: JSON.stringify({
      listSelector: '.item, .news-item, .list-item',
      itemSelector: {
        title: '.title a, h3 a, .item-title a',
        link: '.title a, h3 a, .item-title a',
        date: '.time, .date, .pub-date',
        summary: '.desc, .summary, .intro',
      },
      detailSelector: {
        content: '.article-content, .content, .editor-content',
        filter: '.ad, .adv, script, style',
      },
    }),
    category: 'design-trends',
    priority: 8,
  },
  {
    name: '中国建材网',
    type: 'WEB',
    url: 'https://www.bmlink.com',
    config: JSON.stringify({
      listSelector: '.list-item, .news-list li, .item',
      itemSelector: {
        title: 'h3 a, .title a, a[title]',
        link: 'h3 a, .title a, a[title]',
        date: '.time, .date',
        summary: '.summary, .desc, .intro',
      },
    }),
    category: 'materials',
    priority: 8,
  },
  {
    name: '设计癖',
    type: 'WEB',
    url: 'https://www.shejipi.com',
    config: JSON.stringify({
      listSelector: '.post-item, .article-item, .item',
      itemSelector: {
        title: '.post-title a, h2 a, .title a',
        link: '.post-title a, h2 a, .title a',
        date: '.post-date, .date, time',
        summary: '.post-excerpt, .excerpt, .summary',
      },
      detailSelector: {
        content: '.post-content, .entry-content, .article-content',
        filter: '.ad, .wp-block-embed, script, style',
      },
    }),
    category: 'design-trends',
    priority: 8,
  },
  {
    name: '新浪家居 RSS',
    type: 'RSS',
    url: 'https://r.jina.ai/http://jiaju.sina.cn/feed/',
    config: JSON.stringify({}),
    category: 'industry-news',
    priority: 12,
  },
  {
    name: '网易家居 RSS',
    type: 'RSS',
    url: 'https://r.jina.ai/http://home.163.com/rss/',
    config: JSON.stringify({}),
    category: 'industry-news',
    priority: 12,
  },
  {
    name: '设计癖 RSS',
    type: 'RSS',
    url: 'https://r.jina.ai/http://www.shejipi.com/feed/',
    config: JSON.stringify({}),
    category: 'design-trends',
    priority: 12,
  },
]

// ============================================================
// 示例资讯数据
// ============================================================

const SAMPLE_ITEMS = [
  {
    title: '2026年全屋定制市场趋势报告：整装模式成主流',
    url: 'https://example.com/seed/1',
    source: '新浪家居',
    content: '据最新市场调研数据显示，2026年全屋定制市场规模预计突破5000亿元，整装模式占比超过60%，成为行业主流发展方向。消费者对一站式服务的需求推动了整装模式的快速普及。',
    category: 'industry-news',
    summary: '全屋定制市场规模将突破5000亿，整装模式占比超60%',
    reason: '整装模式正在重塑行业格局，直接影响经销商转型方向',
    score: 8.5,
    isSelected: true,
    tags: ['全屋定制', '整装', '市场趋势'],
  },
  {
    title: '新型环保板材技术突破：甲醛释放量降低90%',
    url: 'https://example.com/seed/2',
    source: '网易家居',
    content: '国内某知名板材企业发布新一代环保板材，采用全新胶黏剂配方，甲醛释放量较传统板材降低90%，已通过国家最高环保标准认证。该技术有望在下半年实现量产。',
    category: 'new-products',
    summary: '环保板材甲醛释放量降低90%，通过最高环保认证',
    reason: '环保标准趋严背景下，该技术可能引发行业产品升级潮',
    score: 9.0,
    isSelected: true,
    tags: ['环保板材', '甲醛', '技术创新'],
  },
  {
    title: '智能家居与建材融合：未来五年将迎爆发期',
    url: 'https://example.com/seed/3',
    source: '腾讯家居',
    content: '随着物联网技术发展，智能家居与传统建材的融合加速。预计到2028年，智能建材市场规模将达到3000亿元。智能门锁、智能照明、智能温控等产品已进入快速普及阶段。',
    category: 'industry-news',
    summary: '智能建材市场2028年将达3000亿，进入快速普及阶段',
    reason: '智能化转型是建材企业必须关注的重要赛道',
    score: 7.5,
    isSelected: true,
    tags: ['智能家居', '智能建材', '物联网'],
  },
  {
    title: '住建部发布新修订《住宅设计规范》',
    url: 'https://example.com/seed/4',
    source: '政策发布',
    content: '新修订的《住宅设计规范》将于明年起实施，对住宅空间布局、采光通风、隔音降噪等方面提出更高要求，将推动建材行业技术升级和产品迭代。',
    category: 'policy',
    summary: '住宅设计规范修订，对采光通风隔音提出更高要求',
    reason: '政策变动直接影响建材产品标准和市场需求结构',
    score: 9.5,
    isSelected: true,
    tags: ['住建部', '住宅设计规范', '政策'],
  },
  {
    title: '意大利米兰家具展2026：极简主义回归',
    url: 'https://example.com/seed/5',
    source: '设计癖',
    content: '2026年米兰国际家具展落幕，极简主义设计风格强势回归，原木、微水泥等自然材质成为主流，色彩趋于低饱和度。多家中国品牌参展并获得国际关注。',
    category: 'design-trends',
    summary: '米兰家具展极简主义回归，原木微水泥成主流材质',
    reason: '国际设计风向标，直接影响国内产品研发和营销方向',
    score: 7.0,
    isSelected: true,
    tags: ['米兰家具展', '极简主义', '设计趋势'],
  },
  {
    title: '实木价格连续三月上涨，下游企业承压',
    url: 'https://example.com/seed/6',
    source: '中国建材网',
    content: '受原材料供应紧张和运输成本上升影响，实木板材价格已连续三个月上涨，累计涨幅达15%。下游家具制造企业面临成本压力，部分企业已开始调整产品定价策略。',
    category: 'materials',
    summary: '实木板材价格连涨三月，累计涨幅达15%',
    reason: '原材料价格波动直接影响企业成本和采购决策',
    score: 8.0,
    isSelected: true,
    tags: ['实木', '原材料', '价格'],
  },
  {
    title: '装修季来临，这些防水施工细节要注意',
    url: 'https://example.com/seed/7',
    source: '装修攻略',
    content: '春季装修旺季到来，卫生间、厨房、阳台等区域的防水施工质量直接影响居住体验。本文总结了防水施工中的10个关键细节，帮助业主和施工队避免常见错误。',
    category: 'tips',
    summary: '装修旺季防水施工10个关键细节',
    reason: '实用技巧类内容，对施工质量把控有参考价值',
    score: 6.0,
    isSelected: false,
    tags: ['防水', '施工', '装修技巧'],
  },
  {
    title: '定制家居头部企业2026年一季度财报：营收增长分化明显',
    url: 'https://example.com/seed/8',
    source: '财经报道',
    content: '多家定制家居头部企业发布2026年一季度财报。数据显示，欧派、索菲亚等龙头企业保持稳健增长，而部分中小企业营收下滑。行业马太效应持续加剧。',
    category: 'industry-news',
    summary: '定制家居Q1财报分化，头部企业稳健中小企下滑',
    reason: '财报数据反映行业竞争格局，对投资决策有参考价值',
    score: 7.5,
    isSelected: true,
    tags: ['财报', '定制家居', '欧派'],
  },
]

async function main() {
  console.log('🌱 开始初始化数据...')

  // 1. 初始化信源
  console.log('\n[1/3] 初始化信源...')
  for (const source of DEFAULT_SOURCES) {
    const exists = await prisma.source.findFirst({
      where: { name: source.name },
    })
    if (!exists) {
      await prisma.source.create({ data: source })
      console.log(`  ✓ 信源: ${source.name} (${source.type})`)
    } else {
      console.log(`  ⚠ 已存在: ${source.name}`)
    }
  }

  // 2. 加载信源映射
  const sources = await prisma.source.findMany()
  const sourceMap = new Map(sources.map((s) => [s.name, s.id]))

  // 3. 初始化示例资讯
  console.log('\n[2/3] 初始化示例资讯...')
  for (const item of SAMPLE_ITEMS) {
    const exists = await prisma.item.findUnique({
      where: { url: item.url },
    })
    if (exists) {
      console.log(`  ⚠ 已存在: ${item.title}`)
      continue
    }

    await prisma.item.create({
      data: {
        ...item,
        sourceId: sourceMap.get(item.source) || null,
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
    })
    console.log(`  ✓ 资讯: ${item.title.slice(0, 40)} [${item.category}]`)
  }

  // 4. 初始化示例日报
  console.log('\n[3/3] 初始化示例日报...')
  const today = new Date().toISOString().split('T')[0]
  const existingDaily = await prisma.daily.findUnique({
    where: { date: today },
  })

  if (!existingDaily) {
    const selectedItems = await prisma.item.findMany({
      where: { isSelected: true },
      orderBy: { score: 'desc' },
      take: 10,
    })

    if (selectedItems.length > 0) {
      const daily = await prisma.daily.create({
        data: {
          date: today,
          title: '家居建材行业日报',
          summary: '今日家居建材行业重要资讯汇总，涵盖政策动向、市场趋势、新品发布等多个维度。',
          editorNote: '今日重点关注：住建部新规对建材标准的提升要求，以及环保板材技术突破带来的行业变革。',
          itemIds: selectedItems.map((item) => item.id),
          sectionCount: 3,
        },
      })

      // 创建日报版块
      const sections = [
        { category: 'industry-news', title: '行业动态', description: '市场整体走势与头部企业动向', order: 0 },
        { category: 'policy', title: '政策法规', description: '最新行业标准与监管要求', order: 1 },
        { category: 'new-products', title: '新品与技术', description: '产品创新与技术突破', order: 2 },
      ]

      for (const section of sections) {
        const sectionItems = selectedItems
          .filter((item) => item.category === section.category)
          .map((item) => item.id)

        if (sectionItems.length > 0) {
          await prisma.dailySection.create({
            data: {
              dailyId: daily.id,
              ...section,
              itemIds: sectionItems,
            },
          })
        }
      }

      console.log(`  ✓ 日报: ${daily.title}`)
    }
  } else {
    console.log(`  ⚠ 今日日报已存在`)
  }

  console.log('\n✅ 初始化完成！')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
