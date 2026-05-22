import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  const today = new Date().toISOString().split('T')[0]
  const daily = await prisma.daily.findUnique({
    where: { date: today },
    include: { sections: true },
  })
  if (!daily) {
    console.log('No daily report for', today)
    return
  }
  console.log('Daily:', daily.title)
  console.log('Summary:', daily.summary)
  console.log('EditorNote:', daily.editorNote)
  console.log('Sections:', daily.sections.length)
  for (const section of daily.sections) {
    console.log(`\n[${section.category}] ${section.title}`)
    console.log(' ', section.description)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
