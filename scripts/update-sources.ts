import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  // 更新中国建材网
  try {
    await prisma.source.update({
      where: { id: 'cmpasj778000483jfj8hw1r5e' },
      data: { url: 'https://www.bmlink.com/news/' }
    })
    console.log('OK: 中国建材网 updated')
  } catch(e: any) { console.error('FAIL 中国建材网:', e.message) }

  // 禁用网易家居WEB
  try {
    await prisma.source.update({
      where: { id: 'cmpasj76h000283jf5mzwldvc' },
      data: { isActive: false }
    })
    console.log('OK: 网易家居WEB disabled')
  } catch(e: any) { console.error('FAIL 网易家居WEB:', e.message) }

  // 查看结果
  const all = await prisma.source.findMany({
    where: { isActive: true },
    select: { name: true, type: true, url: true }
  })
  console.log('\nActive sources:')
  all.forEach((s: any) => console.log(' ', s.name, '-', s.url))

  await prisma.$disconnect()
}

main().catch((e: any) => { console.error(e); process.exit(1) })
