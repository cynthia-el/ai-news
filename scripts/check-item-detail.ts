import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  const item = await prisma.item.findFirst({
    where: { title: { contains: '兔宝宝' } },
    select: { title: true, summary: true, content: true, source: true, score: true, reason: true, url: true }
  })
  if (item) {
    console.log('标题:', item.title)
    console.log('来源:', item.source)
    console.log('URL:', item.url)
    console.log('评分:', item.score)
    console.log('摘要长度:', item.summary?.length)
    console.log('摘要:', item.summary)
    console.log('内容长度:', item.content?.length)
    console.log('内容:', item.content?.slice(0, 500))
    console.log('解读:', item.reason)
  } else {
    console.log('未找到')
  }
}

main().catch(console.error).finally(async () => await prisma.$disconnect())
