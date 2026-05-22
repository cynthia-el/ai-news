import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  const itemCount = await prisma.item.count()
  const dailyCount = await prisma.daily.count()
  console.log('Before cleanup:', itemCount, 'items,', dailyCount, 'dailies')

  await prisma.dailySection.deleteMany({})
  await prisma.daily.deleteMany({})
  await prisma.item.deleteMany({})

  const afterItems = await prisma.item.count()
  const afterDailies = await prisma.daily.count()
  console.log('After cleanup:', afterItems, 'items,', afterDailies, 'dailies')

  await prisma.$disconnect()
}

main().catch((e: any) => { console.error(e); process.exit(1) })
