import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  // 检查立邦涂料
  const nippon = await prisma.item.findFirst({
    where: { title: { contains: '立邦涂料' } },
    select: { title: true, summary: true, reason: true, score: true, content: true }
  })

  if (nippon) {
    console.log('=== 立邦涂料 ===')
    console.log('标题:', nippon.title)
    console.log('评分:', nippon.score)
    console.log('摘要长度:', nippon.summary?.length)
    console.log('摘要:', nippon.summary)
    console.log('解读长度:', nippon.reason?.length)
    console.log('解读:', nippon.reason)
    console.log('内容长度:', nippon.content?.length)
  }

  // 检查兔宝宝
  const rabbit = await prisma.item.findFirst({
    where: { title: { contains: '兔宝宝' } },
    select: { title: true, summary: true, reason: true, score: true, content: true }
  })

  if (rabbit) {
    console.log('\n=== 兔宝宝 ===')
    console.log('标题:', rabbit.title)
    console.log('评分:', rabbit.score)
    console.log('摘要长度:', rabbit.summary?.length)
    console.log('摘要:', rabbit.summary)
    console.log('解读长度:', rabbit.reason?.length)
    console.log('解读:', rabbit.reason)
    console.log('内容长度:', rabbit.content?.length)
  }

  // 统计所有摘要长度
  const allItems = await prisma.item.findMany({
    select: { title: true, summary: true, reason: true }
  })

  const shortSummary = allItems.filter(i => (i.summary?.length || 0) < 100)
  const shortReason = allItems.filter(i => (i.reason?.length || 0) < 100)

  console.log(`\n总资讯数: ${allItems.length}`)
  console.log(`摘要<100字的: ${shortSummary.length} 条`)
  console.log(`解读<100字的: ${shortReason.length} 条`)
}

main().catch(console.error).finally(async () => await prisma.$disconnect())
