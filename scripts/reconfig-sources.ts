import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

const MACRO_KEYWORDS = ['产业', '制造业', '标准', '规范', '意见', '通知', '规划', '纲要', '双碳', '绿色', '环保', '能耗', '减排', '质量', '安全', '补贴', '以旧换新', '设备更新', '技术改造', '数字化转型', '智能制造']

const INDUSTRY_KEYWORDS = ['人造板', '刨花板', '胶合板', '纤维板', 'OSB', '饰面板', '全屋定制', '高定', '整木', '整装', '木门', '橱柜', '衣柜', '地板', '瓷砖', '岩板', '卫浴', '洁具', '陶瓷', '门窗', '系统门窗', '铝门窗', '智能家居', '智能照明', 'IoT', '家具', '软体家具', '办公家具', '红木家具', '木材', '林业', '木工', '胶粘剂', '五金', '涂料', '油漆', '防水', '墙纸', '软装', '家纺', '床垫', '沙发']

async function main() {
  console.log('🔄 重新配置信源 keywords...\n')

  // 1. 宏观政策信源：不加 keywords 过滤，让 AI 判断重要性
  const macroSources = ['国家发改委-新闻动态', '国家发改委-政策文件', '国家发改委-产业规划']
  for (const name of macroSources) {
    const s = await prisma.source.findFirst({ where: { name } })
    if (s) {
      const cfg = JSON.parse(s.config || '{}')
      delete cfg.keywords  // 去掉 keywords 过滤
      await prisma.source.update({
        where: { id: s.id },
        data: { config: JSON.stringify(cfg) },
      })
      console.log(`  ✓ ${name}: 已去掉 keywords 过滤（AI 全量判断）`)
    }
  }

  // 2. 行业垂直网站：聚焦人造板/全屋定制等核心关键词
  const industrySources = [
    { name: '中华地板网-行业资讯', keywords: INDUSTRY_KEYWORDS },
    { name: '网易家居-行业新闻', keywords: INDUSTRY_KEYWORDS },
    { name: '新浪家居-企业新闻', keywords: INDUSTRY_KEYWORDS },
    { name: '腾讯家居-资讯', keywords: INDUSTRY_KEYWORDS },
    { name: '中国木业网-行业资讯', keywords: INDUSTRY_KEYWORDS },
    { name: '中国陶瓷网-资讯', keywords: INDUSTRY_KEYWORDS },
    { name: '九正建材网-行业资讯', keywords: INDUSTRY_KEYWORDS },
  ]

  for (const { name, keywords } of industrySources) {
    const s = await prisma.source.findFirst({ where: { name } })
    if (s) {
      const cfg = JSON.parse(s.config || '{}')
      cfg.keywords = keywords
      await prisma.source.update({
        where: { id: s.id },
        data: { config: JSON.stringify(cfg), isActive: true },
      })
      console.log(`  ✓ ${name}: 已配置 ${keywords.length} 个行业关键词`)
    }
  }

  // 3. 36氪：也用人造板/全屋定制关键词
  const kr = await prisma.source.findFirst({ where: { name: '36氪' } })
  if (kr) {
    const cfg = JSON.parse(kr.config || '{}')
    cfg.keywords = [...INDUSTRY_KEYWORDS, '家居', '建材', '装修', '房地产']
    await prisma.source.update({
      where: { id: kr.id },
      data: { config: JSON.stringify(cfg) },
    })
    console.log(`  ✓ 36氪: 已配置 keywords`)
  }

  // 4. 删除失败的信源
  const failed = ['搜狐新闻', '证券时报-公司动态']
  for (const name of failed) {
    await prisma.source.deleteMany({ where: { name } })
    console.log(`  ✗ 已删除: ${name}`)
  }

  console.log('\n✅ 信源重新配置完成')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
