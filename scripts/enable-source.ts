import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  await prisma.source.update({
    where: { id: 'cmpasj778000483jfj8hw1r5e' },
    data: { isActive: true }
  })
  console.log('Re-enabled 中国建材网')

  const all = await prisma.source.findMany({
    where: { isActive: true },
    select: { name: true, type: true, url: true }
  })
  console.log('Active sources:', all.length)
  all.forEach((s: any) => console.log(' ', s.name, s.type, s.url))

  await prisma.$disconnect()
}

main().catch((e: any) => { console.error(e); process.exit(1) })
