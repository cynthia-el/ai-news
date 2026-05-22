import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  // 禁用长期不更新的公众号
  const deadSources = ['临沂市木业协会', '58安居客研究院']
  for (const name of deadSources) {
    try {
      await prisma.source.updateMany({
        where: { name },
        data: { isActive: false }
      })
      console.log('Disabled:', name)
    } catch (e: any) {
      console.log('Error disabling', name, e.message)
    }
  }

  const active = await prisma.source.findMany({
    where: { isActive: true },
    select: { name: true, type: true }
  })
  console.log('\nActive sources:', active.length)
  active.forEach((s: any) => console.log(' ', s.name))

  await prisma.$disconnect()
}

main().catch((e: any) => { console.error(e); process.exit(1) })
