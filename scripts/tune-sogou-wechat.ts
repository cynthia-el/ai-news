import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

/**
 * 调整 SOGOU_WECHAT 信源配置
 * 用法（在 my-app 目录下）：
 *   npx tsx scripts/tune-sogou-wechat.ts --disable-low
 *   npx tsx scripts/tune-sogou-wechat.ts --disable-all
 *   npx tsx scripts/tune-sogou-wechat.ts --pages=1 --priority=3
 *
 * 当前问题：搜狗微信搜索对未登录/无 Cookie 请求返回 antispider 验证码页，
 * SOGOU_WECHAT 各源已连续多日 0 产出，但每个源仍要执行 ~60+ 个 query，
 * 大量占用同步时长。
 */

const LOW_PRIORITY_NAMES = ['陶瓷卫浴门窗', '智能家居', '房地产关联']

function parseArgs() {
  const args = process.argv.slice(2)
  return {
    disableLow: args.includes('--disable-low'),
    disableAll: args.includes('--disable-all'),
    pages: args.find(a => a.startsWith('--pages='))?.split('=')[1],
    priority: args.find(a => a.startsWith('--priority='))?.split('=')[1],
    dryRun: args.includes('--dry-run'),
  }
}

async function main() {
  const { disableLow, disableAll, pages, priority, dryRun } = parseArgs()

  if (!disableLow && !disableAll && !pages && !priority) {
    console.log('用法: npx tsx scripts/tune-sogou-wechat.ts [选项]')
    console.log('  --disable-low   禁用低优先级源（陶瓷卫浴门窗、智能家居、房地产关联）')
    console.log('  --disable-all   禁用所有 SOGOU_WECHAT 源')
    console.log('  --pages=N       统一设置 pages（建议 1）')
    console.log('  --priority=N    统一设置 priority')
    console.log('  --dry-run       只打印，不执行数据库更新')
    process.exit(0)
  }

  const sources = await prisma.source.findMany({ where: { type: 'SOGOU_WECHAT' } })
  console.log(`找到 ${sources.length} 个 SOGOU_WECHAT 源`)

  for (const s of sources) {
    const cfg = s.config ? JSON.parse(s.config) : {}
    const isLow = LOW_PRIORITY_NAMES.includes(s.name)
    const shouldDisable = disableAll || (disableLow && isLow)

    const data: { isActive?: boolean; priority?: number; config?: string } = {}
    if (shouldDisable) data.isActive = false
    if (priority !== undefined) data.priority = parseInt(priority, 10)
    if (pages !== undefined) {
      cfg.pages = parseInt(pages, 10)
      data.config = JSON.stringify(cfg)
    }

    const actions: string[] = []
    if (shouldDisable) actions.push('禁用')
    if (priority !== undefined) actions.push(`priority→${data.priority}`)
    if (pages !== undefined) actions.push(`pages→${cfg.pages}`)

    if (actions.length === 0) continue

    console.log(`[${dryRun ? 'DRY-RUN' : '执行'}] ${s.name}: ${actions.join(', ')}`)
    if (!dryRun) {
      await prisma.source.update({ where: { id: s.id }, data })
    }
  }

  if (!dryRun) {
    const active = await prisma.source.findMany({
      where: { type: 'SOGOU_WECHAT', isActive: true },
      orderBy: { priority: 'desc' },
    })
    console.log(`\n调整后仍活跃的 SOGOU_WECHAT 源: ${active.length}`)
    for (const s of active) {
      const cfg = s.config ? JSON.parse(s.config) : {}
      console.log(`  - ${s.name} (priority=${s.priority}, pages=${cfg.pages ?? 'unset'})`)
    }
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
