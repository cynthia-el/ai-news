import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

// 搜狗微信搜索(type=2)是按关键词匹配，无法精确定位特定公众号。
// 策略：使用行业关键词组合搜索，获取近期发布的行业文章。
// 每个"源"代表一个行业方向，配置一组相关关键词。
const SOGOU_SOURCES = [
  {
    name: '人造板行业',
    category: '建材家居',
    keywords: ['人造板', '刨花板', '胶合板', '纤维板', 'OSB板', '饰面板', '板材 价格'],
    priority: 12,
    pages: 2,
  },
  {
    name: '定制家居动态',
    category: '建材家居',
    keywords: ['定制家居', '全屋定制', '高定 家居', '整木定制', '橱柜 衣柜', '定制家具'],
    priority: 12,
    pages: 2,
  },
  {
    name: '家具行业资讯',
    category: '建材家居',
    keywords: ['家具 行业', '家具 市场', '软体家具', '实木家具', '办公家具', '家具 制造'],
    priority: 11,
    pages: 2,
  },
  {
    name: '陶瓷卫浴门窗',
    category: '建材家居',
    keywords: ['陶瓷 行业', '卫浴 市场', '门窗 行业', '厨卫 家居', '瓷砖 岩板', '系统门窗'],
    priority: 11,
    pages: 2,
  },
  {
    name: '智能家居',
    category: '建材家居',
    keywords: ['智能家居', '智慧家居', '智能家电', '智能照明', '家居物联网', 'IoT 家居'],
    priority: 10,
    pages: 2,
  },
  {
    name: '建材家居综合',
    category: '建材家居',
    keywords: ['家居建材', '建材 市场', '家装 行业', '家居产业', '家装 装修', '建材 展会'],
    priority: 10,
    pages: 2,
  },
  // 房地产相关（减少数量和优先级，避免反爬）
  {
    name: '房地产关联',
    category: '房地产',
    keywords: ['房地产 家居', '楼市 建材', '住房 装修', '精装房 市场'],
    priority: 5,
    pages: 2,
  },
]

async function main() {
  // 禁用所有现有信源（保留手动信源）
  const disabled = await prisma.source.updateMany({
    where: { isActive: true, type: { not: 'MANUAL' } },
    data: { isActive: false }
  })
  console.log(`Disabled ${disabled.count} existing sources`)

  // 添加/更新搜狗微信搜索源
  for (const s of SOGOU_SOURCES) {
    const exists = await prisma.source.findFirst({ where: { name: s.name } })
    const data = {
      name: s.name,
      type: 'SOGOU_WECHAT' as const,
      url: 'https://weixin.sogou.com/weixin',
      config: JSON.stringify({ keywords: s.keywords, pages: s.pages || 2 }),
      isActive: true,
      category: s.category,
      priority: s.priority || (s.category === '建材家居' ? 10 : 5),
    }

    if (!exists) {
      await prisma.source.create({ data })
      console.log('Created:', s.name, '- keywords:', s.keywords.join(', '))
    } else {
      await prisma.source.update({ where: { id: exists.id }, data })
      console.log('Updated:', s.name)
    }
  }

  // 显示活跃信源
  const active = await prisma.source.findMany({
    where: { isActive: true },
    select: { name: true, type: true, category: true, priority: true },
    orderBy: [{ priority: 'desc' }, { name: 'asc' }],
  })
  console.log('\nActive sources:', active.length)
  active.forEach((s: any) => console.log(' ', s.name, '|', s.type, '|', s.category, '| priority:', s.priority))

  await prisma.$disconnect()
}

main().catch((e: any) => { console.error(e); process.exit(1) })
