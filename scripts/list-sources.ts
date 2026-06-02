import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  const sources = await prisma.source.findMany({ orderBy: { priority: 'desc' } })
  console.log('当前信源列表：\n')
  for (const s of sources) {
    console.log(`  ${s.isActive ? '✓' : '✗'} [${s.type}] ${s.name} (${s.category})`)
    console.log(`     URL: ${s.url}`)
    console.log(`     优先级: ${s.priority}`)
    console.log()
  }
  console.log(`共 ${sources.length} 个信源，${sources.filter(s => s.isActive).length} 个活跃`)
}

main().finally(async () => await prisma.$disconnect())
