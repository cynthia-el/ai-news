import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

const KEYWORDS = ['家居', '建材', '家具', '陶瓷', '卫浴', '地板', '装修', '木材', '人造板', '全屋定制', '智能家居', '房地产', '绿色建筑', '双碳', 'ENF', '装配式', '甲醛', '以旧换新', '高定', '门窗', '橱柜', '衣柜', '木门', '瓷砖', '岩板', '刨花板', '胶合板', '纤维板', 'OSB', '饰面板']

async function main() {
  console.log('🌟 配置高质量信源...\n')

  // 1. 禁用旧的低质量信源（串行避免事务冲突）
  const oldSources = [
    '新浪家居-企业新闻',
    '中华地板网-行业资讯',
    '网易家居-行业新闻',
    '九正建材网-行业资讯',
    '腾讯家居-资讯',
    '中国木业网-行业资讯',
    '中国陶瓷网-资讯',
  ]

  for (const name of oldSources) {
    try {
      await prisma.source.updateMany({
        where: { name },
        data: { isActive: false },
      })
      console.log(`  ✗ 已禁用: ${name}`)
    } catch (e) {
      console.log(`  ⏭ 跳过: ${name}`)
    }
  }

  // 2. 删除之前添加但失败的新信源
  const failedSources = [
    '中国政府网-政策',
    '第一财经-产业经济',
    '财新网-公司',
    '东方财富-建材行业研报',
    '中国木材与木制品流通协会',
    '中国建材信息总网',
    '华尔街见闻-房产家居',
    '住建部-新闻动态',
  ]
  for (const name of failedSources) {
    try {
      await prisma.source.deleteMany({ where: { name } })
    } catch { /* ignore */ }
  }

  // 3. 添加实测有效的高质量信源
  const newSources = [
    {
      name: '国家发改委-新闻动态',
      type: 'WEB',
      url: 'https://www.ndrc.gov.cn/xwdt/',
      config: JSON.stringify({
        listSelector: '.list li',
        itemSelector: {
          title: 'a',
          link: 'a',
          date: 'span.date, .date',
          summary: '',
        },
        detailSelector: {
          content: '.TRS_Editor, .content, .article-content',
          filter: '.ad, script, style',
        },
        keywords: KEYWORDS,
      }),
      category: 'policy',
      priority: 12,
      isActive: true,
    },
    {
      name: '国家发改委-政策文件',
      type: 'WEB',
      url: 'https://www.ndrc.gov.cn/xxgk/zcfb/tz/',
      config: JSON.stringify({
        listSelector: '.list li',
        itemSelector: {
          title: 'a',
          link: 'a',
          date: 'span.date, .date',
          summary: '',
        },
        detailSelector: {
          content: '.TRS_Editor, .content',
          filter: '.ad, script, style',
        },
        keywords: KEYWORDS,
      }),
      category: 'policy',
      priority: 12,
      isActive: true,
    },
    {
      name: '国家发改委-产业规划',
      type: 'WEB',
      url: 'https://www.ndrc.gov.cn/fggz/fzgh/ghwb/gjjgh/',
      config: JSON.stringify({
        listSelector: '.list li',
        itemSelector: {
          title: 'a',
          link: 'a',
          date: 'span.date, .date',
          summary: '',
        },
        detailSelector: {
          content: '.TRS_Editor, .content',
          filter: '.ad, script, style',
        },
        keywords: KEYWORDS,
      }),
      category: 'policy',
      priority: 11,
      isActive: true,
    },
    {
      name: '证券时报-公司动态',
      type: 'WEB',
      url: 'https://www.stcn.com/company/',
      config: JSON.stringify({
        listSelector: '.news-list li',
        itemSelector: {
          title: 'a',
          link: 'a',
          date: 'span.time, .date',
          summary: '',
        },
        detailSelector: {
          content: '.content, .article-content, .TRS_Editor',
          filter: '.ad, script, style',
        },
        keywords: KEYWORDS,
      }),
      category: 'capital',
      priority: 11,
      isActive: true,
    },
    {
      name: '36氪',
      type: 'RSS',
      url: 'https://36kr.com/feed',
      config: JSON.stringify({
        rssUrl: 'https://36kr.com/feed',
        category: 'technology',
        keywords: KEYWORDS,
      }),
      category: 'technology',
      priority: 10,
      isActive: true,
    },
    {
      name: '搜狐新闻',
      type: 'RSS',
      url: 'http://news.sohu.com/rss/guonei.xml',
      config: JSON.stringify({
        rssUrl: 'http://news.sohu.com/rss/guonei.xml',
        category: 'market',
        keywords: KEYWORDS,
      }),
      category: 'market',
      priority: 9,
      isActive: true,
    },
  ]

  let added = 0
  for (const source of newSources) {
    const exists = await prisma.source.findFirst({ where: { name: source.name } })
    if (exists) {
      await prisma.source.updateMany({
        where: { name: source.name },
        data: source,
      })
      console.log(`  ✓ 更新: ${source.name}`)
    } else {
      await prisma.source.create({ data: source })
      console.log(`  ✓ 新增: ${source.name}`)
      added++
    }
  }

  console.log(`\n✅ 完成: 新增/更新 ${added} 个信源，禁用 ${oldSources.length} 个旧信源`)

  const activeCount = await prisma.source.count({ where: { isActive: true } })
  console.log(`当前 ${activeCount} 个活跃信源`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
