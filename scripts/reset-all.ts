import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('🧹 清理所有历史数据...\n')

  const deletedItems = await prisma.item.deleteMany({})
  console.log(`  ✓ 删除 ${deletedItems.count} 条资讯`)

  const deletedSections = await prisma.dailySection.deleteMany({})
  console.log(`  ✓ 删除 ${deletedSections.count} 个日报版块`)

  const deletedDailies = await prisma.daily.deleteMany({})
  console.log(`  ✓ 删除 ${deletedDailies.count} 条日报`)

  const deletedLogs = await prisma.crawlLog.deleteMany({})
  console.log(`  ✓ 删除 ${deletedLogs.count} 条采集记录`)

  console.log('\n✅ 清理完成，数据库已清空')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
