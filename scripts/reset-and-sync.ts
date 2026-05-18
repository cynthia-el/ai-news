import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import { execSync } from 'child_process'
import path from 'path'

async function main() {
  console.log('清空旧数据...')
  await prisma.dailySection.deleteMany({})
  await prisma.daily.deleteMany({})
  await prisma.crawlLog.deleteMany({})
  await prisma.item.deleteMany({})
  console.log('旧数据已清空，开始同步...\n')
  await prisma.$disconnect()

  // 执行 sync-remote.ts
  const syncScript = path.resolve(__dirname, 'sync-remote.ts')
  execSync(`npx tsx "${syncScript}"`, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') })
}

main().catch((e) => { console.error(e); process.exit(1) })
