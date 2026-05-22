import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

// ============================================================
// 默认信源配置
// ============================================================

const DEFAULT_SOURCES = [
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
  },
]

// ============================================================
// 示例资讯数据 — 使用新分类体系
// ============================================================

const SAMPLE_ITEMS = [
  {
    title: '工信部等八部门发布《建材行业稳增长工作方案》，2026年绿色建材应用比例超60%',
    url: 'https://example.com/seed/1',
    source: '政策发布',
    content: '工信部等八部门联合印发《建材行业稳增长工作方案》，明确提出到2026年绿色建材应用比例超过60%，推动建材行业绿色低碳转型。方案从优化产业结构、推进绿色制造、加强科技创新等方面提出具体措施。',
    category: 'policy',
    summary: '工信部等八部门发布建材行业稳增长方案，要求2026年绿色建材应用比例超60%，从产业结构、绿色制造、科技创新三方面推进转型。对行业影响：中小厂出清加速，头部企业市占率有望提升。',
    reason: '政策直接设定绿色建材应用硬性指标，建议供应链部门核查上游供应商合规资质',
    score: 9.0,
    isSelected: true,
    tags: ['绿色建材', '风险', '工信部', '双碳', '政策文件'],
  },
  {
    title: '东吴证券研报：2025年二手房+存量房装修套数占比达56.8%',
    url: 'https://example.com/seed/2',
    source: '东吴证券',
    content: '东吴证券发布家居行业深度研报，指出2025年二手房交易及存量房翻新装修套数合计占比已达56.8%，首次超过新房装修。报告预测存量房市场将成为未来五年家居行业主要增长驱动力。',
    category: 'capital',
    summary: '东吴证券研报数据显示，2025年二手房+存量房装修套数占比达56.8%，首次超过新房。预测存量房市场将成为未来五年主要增长驱动力，建议关注旧改/局改赛道布局机会。',
    reason: '存量房占比过半是行业结构性转折点，直接影响渠道策略和产品定位决策',
    score: 8.5,
    isSelected: true,
    tags: ['全屋定制', '正面', '存量房', '研报', '市场数据'],
  },
  {
    title: '欧派家居2026年Q1整装渠道营收同比增长35%，门店突破1000家',
    url: 'https://example.com/seed/3',
    source: '财经报道',
    content: '欧派家居发布2026年一季度财报，整装渠道营收同比增长35%，整装门店数量突破1000家。公司表示将继续加大整装业务投入，预计全年整装渠道营收占比将达到25%以上。',
    category: 'market',
    summary: '欧派家居Q1整装渠道营收同比增35%，门店破1000家，预计全年整装营收占比超25%。影响：整装模式验证成功，行业马太效应加剧，中小品牌面临渠道挤压。',
    reason: '欧派整装数据验证头部企业渠道下沉能力，建议评估自身整装业务布局优先级',
    score: 8.0,
    isSelected: true,
    tags: ['全屋定制', '正面', '欧派', '整装', '财报'],
  },
  {
    title: '云峰莫干山"量子净界"系列板材进入商用，负碳家居市场规模预计2027年破2000亿',
    url: 'https://example.com/seed/4',
    source: '行业媒体',
    content: '云峰莫干山正式发布"量子净界"系列负碳板材并进入商用阶段。据行业协会预测，负碳家居市场规模预计2027年将突破2000亿元。该产品采用新型生物质胶黏剂，实现全生命周期碳负排放。',
    category: 'technology',
    summary: '云峰莫干山"量子净界"负碳板材进入商用，行业协会预测2027年负碳家居市场规模破2000亿。该产品采用生物质胶黏剂实现全生命周期碳负排放，技术路线具有颠覆性潜力。',
    reason: '负碳材料从概念进入商用阶段，可能重塑行业技术标准和竞争壁垒',
    score: 9.0,
    isSelected: true,
    tags: ['绿色建材', '正面', '莫干山', '负碳', '技术突破'],
  },
  {
    title: '2026年4月京东建材联合九牧等发布19款AI赋能战略新品',
    url: 'https://example.com/seed/5',
    source: '京东建材',
    content: '京东建材联合九牧、恒洁、松下等头部品牌发布19款战略级新品，其中9款为AI深度赋能产品，覆盖智能卫浴、智能照明等场景。京东JoyInside平台已接入超80家品牌。',
    category: 'supply-chain',
    summary: '京东建材联合九牧等发布19款AI战略新品，9款深度AI赋能，JoyInside平台已接入超80家品牌。影响：平台型企业加速整合家居AI生态，传统品牌需警惕渠道话语权向平台集中。',
    reason: '平台型企业正加速整合家居AI生态，建议评估与京东/天猫的战略合作优先级',
    score: 7.5,
    isSelected: true,
    tags: ['智能家居', '产业链', '京东', 'AI赋能', '渠道变革'],
  },
  {
    title: '国家标准化管理委员会发布GB/T人造板甲醛新国标，ENF级成准入门槛',
    url: 'https://example.com/seed/6',
    source: '国家标准化管理委员会',
    content: '国家标准化管理委员会正式发布GB/T XXXXX-2026《人造板及其制品甲醛释放量分级》修订版，将ENF级（≤0.025mg/m³）从推荐性升级为强制性基准门槛。据工信部数据，目前市场上约30%中小板材企业产品不满足该标准。',
    category: 'policy',
    summary: '人造板甲醛新国标将ENF级从推荐性升级为强制性基准门槛（≤0.025mg/m³）。据工信部数据，约30%中小板材企业产品不达标。影响：中小厂出清加速，头部企业（千年舟、兔宝宝）市占率有望提升。',
    reason: '环保标准升级将直接淘汰30%中小产能，建议供应链部门核查上游供应商合规资质',
    score: 9.5,
    isSelected: true,
    tags: ['人造板', '风险', 'ENF', '甲醛标准', '政策文件'],
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
          title: 'ENF级成准入门槛，存量房市场占比过半',
          summary: '今日重点关注：人造板甲醛新国标将ENF级升级为强制性门槛，预计加速30%中小产能出清；东吴证券数据显示存量房装修占比已达56.8%，行业增长引擎正从新房转向存量。',
          editorNote: '政策合规风险与存量房机遇并存，建议优先核查供应链ENF合规资质。',
          itemIds: selectedItems.map((item) => item.id),
          sectionCount: 3,
        },
      })

      // 创建日报版块
      const sections = [
        { category: 'policy', title: '政策监管', description: '行业标准升级与合规风险', order: 0 },
        { category: 'capital', title: '资本财务', description: '研报数据与市场结构性变化', order: 1 },
        { category: 'market', title: '市场格局', description: '头部企业战略与竞争动态', order: 2 },
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
