import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

/**
 * 恢复 SOGOU_WECHAT 信源
 * 用法：
 *   npx tsx scripts/enable-sogou-wechat.ts           # 恢复所有
 *   npx tsx scripts/enable-sogou-wechat.ts --names=智能家居,房地产关联
 */

function parseArgs() {
  const namesArg = process.argv.find(a => a.startsWith('--names='))
  const names = namesArg ? namesArg.split('=')[1].split(',') : null
  const dryRun = process.argv.includes('--dry-run')
  return { names, dryRun }
}

async function main() {
  const { names, dryRun } = parseArgs()

  const where = names
    ? { type: 'SOGOU_WECHAT' as const, name: { in: names } }
    : { type: 'SOGOU_WECHAT' as const }

  const sources = await prisma.source.findMany({ where })
  console.log(`将恢复 ${sources.length} 个 SOGOU_WECHAT 源`)

  for (const s of sources) {
    console.log(`[${dryRun ? 'DRY-RUN' : '执行'}] 启用 ${s.name}`)
    if (!dryRun) {
      await prisma.source.update({ where: { id: s.id }, data: { isActive: true } })
    }
  }

  if (!dryRun) {
    const active = await prisma.source.findMany({
      where: { type: 'SOGOU_WECHAT', isActive: true },
      orderBy: { priority: 'desc' },
    })
    console.log(`\n当前活跃 SOGOU_WECHAT 源: ${active.length}`)
    active.forEach(s => console.log(`  - ${s.name} (priority=${s.priority})`))
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
