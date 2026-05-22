import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  await prisma.source.update({
    where: { id: 'cmpc91myy0002l4t789qweux2' },
    data: {
      url: 'https://news.fang.com/',
      config: JSON.stringify({
        listSelector: '.news-list li, .list-item, .item, .news-item',
        itemSelector: {
          title: 'h3 a, .title a, a[title], h2 a',
          link: 'h3 a, .title a, a[title], h2 a',
          date: '.date, .time, .pub-time',
          summary: '.summary, .desc, .intro, p'
        }
      })
    }
  })
  console.log('Updated 房天下家居 -> https://news.fang.com/')

  const all = await prisma.source.findMany({
    where: { isActive: true },
    select: { name: true, type: true, url: true }
  })
  console.log('Active sources:', all.length)
  all.forEach((s: any) => console.log(' ', s.name, s.type, s.url))

  await prisma.$disconnect()
}

main().catch((e: any) => { console.error(e); process.exit(1) })
