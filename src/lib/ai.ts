const API_KEY = process.env.LONGCAT_API_KEY || process.env.ANTHROPIC_API_KEY || ''
const BASE_URL = process.env.AI_BASE_URL || 'https://api.longcat.chat/anthropic'
const MODEL = process.env.AI_MODEL || 'LongCat-Flash-Lite'

export interface AIProcessResult {
  category: string
  summary: string
  reason: string
  score: number
  tags: string[]
}

export interface BatchAIResult {
  index: number
  category: string
  summary: string
  score: number
  tags: string[]
}

export interface DailySectionPlan {
  category: string
  title: string
  description: string
}

export interface DailyWithSectionsResult {
  title: string
  summary: string
  editorNote: string
  sections: DailySectionPlan[]
}

const VALID_CATEGORIES = [
  'industry-news',
  'new-products',
  'design-trends',
  'policy',
  'materials',
  'tips',
]

const CATEGORY_LABELS: Record<string, string> = {
  'industry-news': '行业动态',
  'new-products': '新品发布',
  'design-trends': '设计趋势',
  policy: '政策法规',
  materials: '原材料',
  tips: '实用技巧',
}

// 直接调用 LongCat API（绕过 Anthropic SDK，因为 SDK 用 x-api-key header，LongCat 不认）
async function callLongCat(systemPrompt: string, userPrompt: string, maxTokens = 2000): Promise<string> {
  const response = await fetch(`${BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`LongCat API ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || ''
  return text
}

// ============================================================
// 1. 批量分类评分
// ============================================================

export async function batchClassify(
  items: { title: string; content: string }[]
): Promise<BatchAIResult[]> {
  if (items.length === 0) return []

  const itemsText = items
    .map((item, i) => `${i + 1}. 标题：${item.title}\n   正文：${item.content.slice(0, 800)}`)
    .join('\n\n')

  const prompt = `你是一位家居建材行业资深分析师。请对以下 ${items.length} 条资讯进行严格筛选和深度分析。

【你的任务】
1. 判断每条资讯是否有真实的产业价值
2. 对广告、软文、低质量内容坚决给低分
3. 对有价值的产业资讯、政策、技术、市场洞察给高分

资讯列表：
${itemsText}

请严格按照以下JSON数组格式输出，不要输出任何其他内容：
[
  {
    "index": 1,
    "category": "industry-news|new-products|design-trends|policy|materials|tips",
    "summary": "100字左右的核心摘要，概括资讯的主要内容和要点",
    "score": 1-10,
    "tags": ["标签1", "标签2"]
  }
]

【category说明】
- industry-news: 行业动态、市场新闻、企业战略变动、产业链变化
- new-products: 新品发布、产品升级、技术创新、工艺突破
- design-trends: 设计趋势、装修风格、空间理念、设计奖
- policy: 政策法规、标准规范、行业监管、环保要求
- materials: 原材料、供应链、新技术材料、价格波动
- tips: 实用技巧、行业知识、操作指南（仅保留专业内容，排除生活常识类）

【评分标准 — 严格执行，宁缺毋滥】

★ 9-10分（精选，必须入选日报）：
- 重大行业事件：头部企业并购/上市/战略转型、国际展会重大发布
- 重磅政策：国家级/省级产业政策、环保新规、标准更新
- 突破性创新：新材料、新工艺、智能制造重大突破
- 关键数据：行业白皮书、权威市场报告数据发布

★ 7-8分（重要，值得阅读）：
- 重要新品发布、产品技术升级
- 区域市场趋势分析、细分领域增长数据
- 有影响的行业会议/论坛核心观点
- 原材料价格大幅波动及原因分析

★ 5-6分（常规，可看可不看）：
- 普通企业动态、门店开业
- 常规展会信息、行业活动预告
- 一般性市场信息，缺乏深度分析

★ 3-4分（低价值）：
- 边缘资讯、重复性内容
- 个人装修经验分享、生活类内容
- 内容空洞，只有标题没有实质信息

★ 1-2分（垃圾内容，坚决排除）：
- 广告软文、品牌宣传稿、招商加盟
- 招聘求职、培训课程推销
- 明显的产品推销、促销信息
- 与家居建材产业完全无关的内容
- 标题党、内容空洞的自媒体水文
- 房产销售、家装公司自我宣传
- 内容乱码、无法阅读、全是符号的

【特别注意 — 严格执行】
- 如果一条资讯主要是"XX品牌最好"、"选XX就对了"、"限时优惠"、"加盟热线"这类推销话术，直接给1-2分
- 如果内容是"如何选地板"、"装修避坑指南"但没有专业数据支撑，给3-4分
- 只有包含真实产业数据、政策解读、技术参数、市场分析的内容才配7分以上
- 摘要必须客观中立，禁止出现推销语气
- 如果内容包含乱码（如问号、�符号、无法识别的字符）或根本无法理解，一律给1分
- 内容极短（少于50字且没有实质信息）的给1-2分
- 同一品牌的重复宣传、无新信息的给2-3分
- 装修日记、个人经验分享、生活类内容给3-4分

tags: 提取2-4个精准关键词标签，禁止出现品牌自荐类词汇（如"首选"、"领先"、"第一品牌"）。`

  try {
    const text = await callLongCat('', prompt, 2000)
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('AI 返回格式错误')

    const results: BatchAIResult[] = JSON.parse(jsonMatch[0])

    return results.map((r, idx) => {
      let category = r.category?.toLowerCase().trim() || 'industry-news'
      if (!VALID_CATEGORIES.includes(category)) category = 'industry-news'

      let score = parseFloat(String(r.score))
      if (isNaN(score) || score < 1 || score > 10) score = 5

      const tags = Array.isArray(r.tags)
        ? r.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 4)
        : []

      return {
        index: r.index || idx + 1,
        category,
        summary: r.summary?.slice(0, 200) || items[idx]?.title?.slice(0, 50) || '',
        score,
        tags,
      }
    })
  } catch (error) {
    console.error('批量AI处理失败:', error)
    return items.map((_, idx) => ({
      index: idx + 1,
      category: 'industry-news',
      summary: items[idx]?.title?.slice(0, 50) || '',
      score: 5,
      tags: [],
    }))
  }
}

// ============================================================
// 2. 深度推荐理由生成
// ============================================================

export async function generateDeepReasons(
  items: { title: string; summary: string; category: string }[]
): Promise<string[]> {
  if (items.length === 0) return []

  const itemsText = items
    .map((item, i) => `${i + 1}. [${CATEGORY_LABELS[item.category] || item.category}] ${item.title}\n   摘要：${item.summary}`)
    .join('\n\n')

  const prompt = `你是一位家居建材行业资深分析师。请为以下 ${items.length} 条精选资讯分别生成"AI精选解读"，对资讯的核心价值进行深入分析解读。

资讯列表：
${itemsText}

请严格按照以下JSON数组格式输出，每条解读80-100字，分析该资讯对行业从业者的实际价值、影响或启示：
[
  { "index": 1, "reason": "解读内容..." },
  { "index": 2, "reason": "解读内容..." }
]

要求：
- 不要泛泛而谈，要指出具体的价值点（如：影响采购决策、预示价格走势、涉及合规要求、技术趋势判断等）
- 分析要专业、有洞察，像行业专家给同事的点评
- 80-100字，简洁有力
- 不要加引号，直接输出文字`

  try {
    const text = await callLongCat('', prompt, 2000)
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('AI 返回格式错误')

    const results: { index: number; reason: string }[] = JSON.parse(jsonMatch[0])
    return items.map((_, idx) => {
      const found = results.find((r) => r.index === idx + 1)
      return found?.reason?.slice(0, 100) || '行业相关资讯，值得关注'
    })
  } catch (error) {
    console.error('推荐理由生成失败:', error)
    return items.map(() => '行业相关资讯，值得关注')
  }
}

// ============================================================
// 3. 分版块日报生成
// ============================================================

export async function generateDailyWithSections(
  items: { title: string; summary: string; category: string }[]
): Promise<DailyWithSectionsResult> {
  if (items.length === 0) {
    return {
      title: '家居建材行业日报',
      summary: '今日暂无重要资讯',
      editorNote: '',
      sections: [],
    }
  }

  const itemsText = items
    .map((item, i) => `${i + 1}. [${CATEGORY_LABELS[item.category] || item.category}] ${item.title}\n   ${item.summary}`)
    .join('\n\n')

  const prompt = `你是家居建材行业日报主编。请根据以下今日精选资讯，生成一份结构化的日报。

资讯列表：
${itemsText}

请严格按照以下JSON格式输出，不要输出任何其他内容：
{
  "title": "日报标题，15字以内，体现今日核心主题",
  "summary": "主编导语，80字以内，概括今日行业要点和趋势",
  "editorNote": "主编点评，50字以内，点出最值得关注的1-2个方向",
  "sections": [
    {
      "category": "industry-news",
      "title": "版块标题，如'行业动态'",
      "description": "版块导语，30字以内，概括该版块核心内容"
    }
  ]
}

要求：
- 只创建有实际资讯的版块，不要创造空版块
- 版块的 category 必须从以下选择：industry-news, new-products, design-trends, policy, materials, tips
- 版块按重要性排序（资讯数量多、评分高的优先）
- title 要简洁有力，像报纸头版`

  try {
    const text = await callLongCat('', prompt, 1500)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI 返回格式错误')

    const result = JSON.parse(jsonMatch[0])

    const sections: DailySectionPlan[] = []
    if (Array.isArray(result.sections)) {
      for (const s of result.sections) {
        const cat = s.category?.toLowerCase().trim()
        if (VALID_CATEGORIES.includes(cat)) {
          sections.push({
            category: cat,
            title: s.title?.slice(0, 20) || CATEGORY_LABELS[cat] || cat,
            description: s.description?.slice(0, 50) || '',
          })
        }
      }
    }

    return {
      title: result.title?.slice(0, 30) || '家居建材行业日报',
      summary: result.summary?.slice(0, 150) || '今日家居建材行业重要资讯汇总',
      editorNote: result.editorNote?.slice(0, 80) || '',
      sections,
    }
  } catch (error) {
    console.error('日报生成失败:', error)
    return {
      title: '家居建材行业日报',
      summary: '今日家居建材行业重要资讯汇总',
      editorNote: '',
      sections: [],
    }
  }
}

// ============================================================
// 4. 兼容旧接口（单条处理）
// ============================================================

export async function processItem(
  title: string,
  content: string
): Promise<AIProcessResult> {
  const batch = await batchClassify([{ title, content }])
  const result = batch[0]

  if (!result) {
    return {
      category: 'industry-news',
      summary: title.slice(0, 30),
      reason: '行业相关资讯',
      score: 5,
      tags: [],
    }
  }

  let reason = '行业相关资讯'
  if (result.score >= 7) {
    const reasons = await generateDeepReasons([
      { title, summary: result.summary, category: result.category },
    ])
    reason = reasons[0] || reason
  }

  return {
    category: result.category,
    summary: result.summary,
    reason,
    score: result.score,
    tags: result.tags,
  }
}

// ============================================================
// 5. 兼容旧接口（日报摘要）
// ============================================================

export async function generateDailySummary(
  items: { title: string; summary: string }[]
): Promise<{ title: string; summary: string }> {
  const result = await generateDailyWithSections(
    items.map((item) => ({ ...item, category: 'industry-news' }))
  )
  return {
    title: result.title,
    summary: result.summary,
  }
}
