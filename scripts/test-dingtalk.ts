/**
 * 钉钉日报推送测试脚本
 *
 * 用法:
 *   npx tsx scripts/test-dingtalk.ts          # 推送昨天的日报到所有激活的 webhook
 *   npx tsx scripts/test-dingtalk.ts 2026-06-04  # 推送指定日期的日报
 *
 * 环境变量要求:
 *   - DATABASE_URL（必填）
 *   - NEXT_PUBLIC_SITE_URL（可选，默认 https://your-site.com）
 */

import 'dotenv/config'
import { pushDailyToDingTalk } from '../src/lib/dingtalk'
import { prisma } from '../src/lib/prisma'

async function main() {
  const dateArg = process.argv[2]

  console.log('╔══════════════════════════════════════════╗')
  console.log('║       钉钉日报推送 - 手动测试工具         ║')
  console.log('╚══════════════════════════════════════════╝')

  // 检查是否有日报数据
  const targetDate = dateArg || new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const daily = await prisma.daily.findUnique({ where: { date: targetDate } })

  if (!daily) {
    console.error(`\n⚠️  ${targetDate} 暂无日报数据`)
    console.error('   可选方案:')
    console.error('   1. 先运行一次同步生成日报: npx tsx scripts/sync.ts')
    console.error('   2. 指定其他日期: npx tsx scripts/test-dingtalk.ts 2026-06-03')

    // 列出最近7天的日报
    const recentDailies = await prisma.daily.findMany({
      orderBy: { date: 'desc' },
      take: 7,
      select: { date: true, title: true },
    })
    if (recentDailies.length > 0) {
      console.error('\n   最近可用的日报:')
      for (const d of recentDailies) {
        console.error(`   - ${d.date}: ${d.title}`)
      }
    }
    process.exit(1)
  }

  console.log(`\n📅 推送日期: ${targetDate}`)
  console.log(`📰 日报标题: ${daily.title}\n`)

  const result = await pushDailyToDingTalk(targetDate, false)

  console.log(`\n📊 推送结果: ${result.pushedCount}/${result.totalCount} 个群成功`)

  if (result.success) {
    console.log('\n✅ 测试推送成功！请检查钉钉群消息')
  } else {
    console.error('\n❌ 测试推送失败，请检查日志')
    process.exit(1)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
