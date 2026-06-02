import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

/**
 * 添加优质信源：政策、财经、行业协会
 * 补充现有行业垂直网站的不足
 */
async function main() {
  console.log('🌟 添加优质信源...\n')

  const newSources = [
    // 政策监管类
    {
      name: '中国政府网-政策',
      type: 'RSS',
      url: 'https://www.gov.cn/zhengce/zhengceku/',
      config: JSON.stringify({
        rssUrl: 'https://www.gov.cn/zhengce/zhengceku/rss.htm',
        category: 'policy',
      }),
      category: 'policy',
      priority: 12,
      isActive: true,
    },
    {
      name: '住建部-新闻动态',
      type: 'WEB',
      url: 'https://www.mohurd.gov.cn/xinwen/gzdt/',
      config: JSON.stringify({
        listSelector: '.news_list li, .list li',
        itemSelector: {
          title: 'a',
          link: 'a',
          date: 'span.date, .date, .time',
          summary: '',
        },
        detailSelector: {
          content: '.TRS_Editor, .content, .detail-content',
          filter: '.ad, script, style',
        },
      }),
      category: 'policy',
      priority: 11,
      isActive: true,
    },
    // 财经媒体类
    {
      name: '第一财经-产业经济',
      type: 'RSS',
      url: 'https://www.yicai.com/news/industry/',
      config: JSON.stringify({
        rssUrl: 'https://www.yicai.com/rss/',
        category: 'capital',
        keywords: ['家居', '建材', '家具', '陶瓷', '卫浴', '地板', '装修', '木材', '人造板', '全屋定制', '智能家居', '房地产', '绿色建筑', '双碳'],
      }),
      category: 'capital',
      priority: 11,
      isActive: true,
    },
    {
      name: '36氪-房产家居',
      type: 'RSS',
      url: 'https://36kr.com/information/realestate/',
      config: JSON.stringify({
        rssUrl: 'https://36kr.com/feed',
        category: 'capital',
        keywords: ['家居', '建材', '家具', '陶瓷', '卫浴', '地板', '装修', '木材', '人造板', '全屋定制', '智能家居', '房地产'],
      }),
      category: 'capital',
      priority: 10,
      isActive: true,
    },
    {
      name: '财新网-公司',
      type: 'RSS',
      url: 'https://www.caixin.com/search/scroll/company/',
      config: JSON.stringify({
        rssUrl: 'http://weekly.caixin.com/rss/',
        category: 'capital',
        keywords: ['家居', '建材', '家具', '陶瓷', '卫浴', '地板', '装修', '木材', '人造板', '全屋定制'],
      }),
      category: 'capital',
      priority: 10,
      isActive: true,
    },
    // 证券研报类
    {
      name: '东方财富-建材行业研报',
      type: 'WEB',
      url: 'https://data.eastmoney.com/report/stock.jshtml?infocode=SW801710',
      config: JSON.stringify({
        listSelector: '.table-body tr',
        itemSelector: {
          title: 'a.title',
          link: 'a.title',
          date: 'td:nth-child(4)',
          summary: '',
        },
        detailSelector: {
          content: '.report-content, .detail-content',
          filter: '.ad, script, style',
        },
      }),
      category: 'capital',
      priority: 9,
      isActive: true,
    },
    // 行业协会
    {
      name: '中国木材与木制品流通协会',
      type: 'WEB',
      url: 'http://www.ctwpda.org/list-7.html',
      config: JSON.stringify({
        listSelector: '.news_list li, .list li',
        itemSelector: {
          title: 'a',
          link: 'a',
          date: 'span.date, .date',
          summary: '',
        },
        detailSelector: {
          content: '.content, .detail-content, .TRS_Editor',
          filter: '.ad, script, style',
        },
      }),
      category: 'supply-chain',
      priority: 9,
      isActive: true,
    },
    // 技术材料类
    {
      name: '中国建材信息总网',
      type: 'WEB',
      url: 'http://www.cbminfo.com/news/',
      config: JSON.stringify({
        listSelector: '.news-list li, .list li',
        itemSelector: {
          title: 'a',
          link: 'a',
          date: 'span.date, .date',
          summary: '',
        },
        detailSelector: {
          content: '.content, .detail-content',
          filter: '.ad, script, style',
        },
      }),
      category: 'technology',
      priority: 8,
      isActive: true,
    },
    // 国际市场
    {
      name: '华尔街见闻-房产家居',
      type: 'RSS',
      url: 'https://wallstreetcn.com/news/global/',
      config: JSON.stringify({
        rssUrl: 'https://wallstreetcn.com/rss.xml',
        category: 'market',
        keywords: ['家居', '建材', '家具', '陶瓷', '卫浴', '地板', '装修', '木材', '房地产', 'housing'],
      }),
      category: 'market',
      priority: 8,
      isActive: true,
    },
  ]

  let added = 0
  let skipped = 0

  for (const source of newSources) {
    const exists = await prisma.source.findFirst({
      where: { name: source.name },
    })

    if (exists) {
      console.log(`  ⏭ 已存在: ${source.name}`)
      skipped++
      continue
    }

    await prisma.source.create({ data: source })
    console.log(`  ✓ 新增: ${source.name} [${source.type}]`)
    added++
  }

  console.log(`\n✅ 完成: 新增 ${added} 个, 跳过 ${skipped} 个`)
  console.log(`当前共 ${await prisma.source.count()} 个信源`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
