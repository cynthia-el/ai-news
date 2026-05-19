import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

// 上次爬取失败的信源（0条、403、404、fetch failed）
const FAILING_SOURCES = [
  '腾讯家居',
  '新浪家居',
  '太平洋家居网',
  '土巴兔装修网',
  '齐家网',
  '设计癖',
  '中国木材网',
  '太平洋家居',
  // Bing News RSS
  'Bing News - 家居',
  'Bing News - 建材',
  'Bing News - 装修',
  'Bing News - 板材',
  'Bing News - 家具',
  'Bing News - 地板',
  'Bing News - 橱柜',
  'Bing News - 木门',
  'Bing News - 全屋定制',
  'Bing News - 装配式建筑',
  'Bing News - 智能家居',
  'Bing News - 卫浴',
  'Bing News - 瓷砖',
  'Bing News - 涂料',
  'Bing News - 门窗',
  'Bing News - 灯具',
  'Bing News - 家纺',
  'Bing News - 壁纸',
  'Bing News - 窗帘',
  'Bing News - 吊顶',
  'Bing News - 石材',
  'Bing News - 五金',
  'Bing News - 管道',
  'Bing News - 电器',
  'Bing News - 厨卫',
  'Bing News - 木材',
  'Bing News - 玻璃',
  'Bing News - 钢材',
  'Bing News - 水泥',
  'Bing News - 陶瓷',
  // 搜狗品牌关键词（403）
  '搜狗新闻 - 兔宝宝',
  '搜狗新闻 - 莫干山板材',
  '搜狗新闻 - 千年舟',
  '搜狗新闻 - 鲁丽木业',
  '搜狗新闻 - 千山板材',
  '搜狗新闻 - 索菲亚家居',
  '搜狗新闻 - 欧派家居',
  '搜狗新闻 - 志邦家居',
  '搜狗新闻 - 福人板材',
  '搜狗新闻 - 福庆板材',
  // 搜狗其他关键词（403）
  '搜狗新闻 - 木结构',
  '搜狗新闻 - 装配式建筑',
  '搜狗新闻 - 板材',
  '搜狗新闻 - 家具',
  '搜狗新闻 - 装修',
  '搜狗新闻 - 地板',
  '搜狗新闻 - 橱柜',
  '搜狗新闻 - 木门',
]

async function main() {
  console.log('========== 清理失败信源和乱码数据 ==========\n')

  // 1. 禁用/删除失败信源
  console.log(`[1/4] 清理 ${FAILING_SOURCES.length} 个失败信源...`)

  let deletedCount = 0
  let disabledCount = 0

  for (const name of FAILING_SOURCES) {
    const sources = await prisma.source.findMany({
      where: { name: { contains: name } },
    })

    for (const s of sources) {
      // 检查该信源是否有有效数据
      const itemCount = await prisma.item.count({
        where: { sourceId: s.id },
      })

      if (itemCount === 0) {
        // 没有数据，直接删除
        await prisma.source.delete({ where: { id: s.id } })
        deletedCount++
        console.log(`  ✗ 删除: ${s.name}`)
      } else {
        // 有数据，仅禁用
        await prisma.source.update({
          where: { id: s.id },
          data: { isActive: false },
        })
        disabledCount++
        console.log(`  ⚠ 禁用: ${s.name} (有 ${itemCount} 条数据)`)
      }
    }
  }

  console.log(`  删除: ${deletedCount} 个 | 禁用: ${disabledCount} 个`)

  // 2. 删除URL为空或无效的条目
  console.log('\n[2/4] 清理无效URL条目...')
  const emptyUrlDeleted = await prisma.item.deleteMany({
    where: { url: '' },
  })
  console.log(`  删除空URL: ${emptyUrlDeleted.count} 条`)

  // 3. 删除乱码条目（内容中含有大量问号或乱码特征）
  console.log('\n[3/4] 清理乱码条目...')

  // 获取所有近期条目检查乱码
  const recentItems = await prisma.item.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    select: { id: true, title: true, content: true, source: true },
  })

  let garbledDeleted = 0
  const garbledIds: string[] = []

  for (const item of recentItems) {
    const content = item.content || ''
    const title = item.title || ''

    // 乱码检测规则
    const hasGarbled =
      // 连续多个问号
      content.includes('???') ||
      content.includes('�') ||
      // 大量连续无意义字符
      /[�]{2,}/.test(content) ||
      // 标题中出现乱码特征
      title.includes('�') ||
      // 内容中中文比例极低（可能是编码错误）
      (content.length > 100 &&
        (content.match(/[一-鿿]/g)?.length || 0) / content.length < 0.1 &&
        !content.includes('http')) ||
      // 内容全是数字和符号
      /^[\d\s\W]+$/.test(content.slice(0, 100))

    if (hasGarbled) {
      garbledIds.push(item.id)
      garbledDeleted++
      console.log(`  ✗ 乱码: [${item.source}] ${item.title.slice(0, 40)}`)
    }
  }

  if (garbledIds.length > 0) {
    await prisma.item.deleteMany({
      where: { id: { in: garbledIds } },
    })
  }
  console.log(`  删除乱码: ${garbledDeleted} 条`)

  // 4. 删除低质量广告条目（通过关键词检测）
  console.log('\n[4/4] 清理明显广告/软文...')

  const adKeywords = [
    '限时优惠', '点击领取', '立即抢购', '免费试用', '0元',
    '加盟热线', '招商加盟', '诚招代理', '咨询热线', '预约参观',
    '名额有限', '先到先得', '抢疯了', '卖爆了', '日销',
    '史上最低价', '错过再等', '倒计时', '最后机会',
    '选购攻略', '十大品牌', '品牌排行', '排名第一',
  ]

  const allItems = await prisma.item.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    },
    select: { id: true, title: true, content: true, source: true },
  })

  let adDeleted = 0
  const adIds: string[] = []

  for (const item of allItems) {
    const text = (item.title + ' ' + (item.content || '')).toLowerCase()

    // 检测广告关键词
    const isAd = adKeywords.some(kw => text.includes(kw.toLowerCase()))

    // 检测重复品牌自荐词汇
    const selfPromo = /(首选|领先|第一品牌|销量第一|行业标杆|领军品牌|最佳选择)/.test(item.title)

    if (isAd || selfPromo) {
      adIds.push(item.id)
      adDeleted++
      console.log(`  ✗ 广告: [${item.source}] ${item.title.slice(0, 40)}`)
    }
  }

  if (adIds.length > 0) {
    await prisma.item.deleteMany({
      where: { id: { in: adIds } },
    })
  }
  console.log(`  删除广告: ${adDeleted} 条`)

  // 统计
  const totalItems = await prisma.item.count()
  const activeSources = await prisma.source.count({ where: { isActive: true } })

  console.log(`\n✅ 清理完成！`)
  console.log(`  删除信源: ${deletedCount} 个`)
  console.log(`  禁用信源: ${disabledCount} 个`)
  console.log(`  删除空URL: ${emptyUrlDeleted.count} 条`)
  console.log(`  删除乱码: ${garbledDeleted} 条`)
  console.log(`  删除广告: ${adDeleted} 条`)
  console.log(`  当前活跃信源: ${activeSources} 个`)
  console.log(`  数据库总条目: ${totalItems} 条`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
