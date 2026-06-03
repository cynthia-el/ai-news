import 'dotenv/config'
import { batchClassify } from '../src/lib/ai'

async function main() {
  const items = [
    {
      title: '斩获"发明界奥林匹克"国际金奖！兔宝宝技术突破，领跑全球人造板行业',
      content: '近日，兔宝宝凭借"高稳定与功能化生态板绿色制造关键技术与应用"科研成果，斩获日内瓦国际发明展金奖，再次让中国品牌的科创实力站上全球舞台。',
      source: '中华地板网',
      publishedAt: new Date('2026-06-01'),
    },
  ]

  console.log('测试 AI 返回的原始内容...\n')
  const results = await batchClassify(items)
  console.log('返回结果:', JSON.stringify(results, null, 2))
  console.log('\n摘要长度:', results[0]?.summary?.length)
  console.log('摘要内容:', results[0]?.summary)
}

main().catch(console.error)
