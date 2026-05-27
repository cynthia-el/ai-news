import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  const source = await prisma.source.findFirst({
    where: { name: '中国陶瓷网-资讯' },
  })

  if (!source) {
    console.log('Source not found')
    return
  }

  await prisma.source.update({
    where: { id: source.id },
    data: {
      config: JSON.stringify({
        listSelector: 'ul.list-paddingleft-2 li',
        itemSelector: {
          title: 'a[href*="eventDetail"]',
          link: 'a[href*="eventDetail"]',
          date: '',
          summary: '',
        },
        detailSelector: {
          content: '.article-content, .content-detail, .news-content',
          filter: '.ad, .advertisement, .related-read, script, style',
        },
      }),
    },
  })

  console.log('Updated 中国陶瓷网 config')
}

main().catch(console.error).finally(() => prisma.$disconnect())
