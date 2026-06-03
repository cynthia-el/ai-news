import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import { generateDeepReasons } from '../src/lib/ai'

const BATCH_SIZE = 6

async function main() {
  console.log('🔄 重新生成 AI 深度解读...\n')

  const defaultItems = await prisma.item.findMany({
    where: {
      isSelected: true,
      OR: [
        { reason: '行业战略资讯，建议关注' },
        { reason: '行业相关资讯' },
      ],
    },
    select: {
      id: true,
      title: true,
      summary: true,
      category: true,
    },
    orderBy: { publishedAt: 'desc' },
  })

  console.log(`找到 ${defaultItems.length} 条需要重新解读的内容\n`)

  if (defaultItems.length === 0) {
    console.log('没有需要处理的内容')
    return
  }

  let updated = 0
  let failed = 0

  for (let i = 0; i < defaultItems.length; i += BATCH_SIZE) {
    const batch = defaultItems.slice(i, i + BATCH_SIZE)
    console.log(`批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(defaultItems.length / BATCH_SIZE)} (${batch.length} 条)`)

    try {
      const reasons = await generateDeepReasons(
        batch.map((item) => ({
          title: item.title,
          summary: item.summary || item.title,
          category: item.category,
        }))
      )

      for (let j = 0; j < batch.length; j++) {
        const newReason = reasons[j]
        if (newReason && newReason !== '行业战略资讯，建议关注') {
          await prisma.item.update({
            where: { id: batch[j].id },
            data: { reason: newReason },
          })
          console.log(`  ✓ [${batch[j].id.slice(0, 8)}] ${batch[j].title.slice(0, 40)}...`)
          console.log(`    → ${newReason}`)
          updated++
        } else {
          console.log(`  ⚠ [${batch[j].id.slice(0, 8)}] 生成失败，保持原值`)
          failed++
        }
      }

      if (i + BATCH_SIZE < defaultItems.length) {
        await new Promise((r) => setTimeout(r, 1000))
      }
    } catch (err) {
      console.error(`  ✗ 批次失败:`, (err as Error).message)
      failed += batch.length
    }
  }

  console.log(`\n✅ 完成: 更新 ${updated} 条, 失败 ${failed} 条`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
