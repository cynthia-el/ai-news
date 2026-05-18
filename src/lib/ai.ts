import Anthropic from '@anthropic-ai/sdk'

// 支持 LongCat API（美团，Anthropic 兼容格式， generous free tier）
// 也兼容原生 Anthropic API（通过环境变量切换）
const API_KEY = process.env.LONGCAT_API_KEY || process.env.ANTHROPIC_API_KEY || ''
const BASE_URL = process.env.AI_BASE_URL || 'https://api.longcat.chat/anthropic'

const anthropic = new Anthropic({
  apiKey: API_KEY,
  baseURL: BASE_URL,
})

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

// ============================================================
// 1. 批量分类评分（核心优化：降低API调用次数）
// ============================================================

export async function batchClassify(
  items: { title: string; content: string }[]
): Promise<BatchAIResult[]> {
  if (items.length === 0) return []

  const itemsText = items
    .map((item, i) => `${i + 1}. 标题：${item.title}\n   正文：${item.content.slice(0, 800)}`)
    .join('\n\n')

  const prompt = `你是一位家居建材行业资深分析师。请对以下 ${items.length} 条资讯进行批量分析，提取核心信息。

资讯列表：
${itemsText}

请严格按照以下JSON数组格式输出，不要输出任何其他内容：
[
  {
    "index": 1,
    "category": "industry-news|new-products|design-trends|policy|materials|tips",
    "summary": "20字以内的核心摘要",
    "score": 1-10,
    "tags": ["标签1", "标签2"]
  }
]

category说明：
- industry-news: 行业动态、市场新闻、企业动向
- new-products: 新品发布、产品升级、技术创新
- design-trends: 设计趋势、装修风格、空间理念
- policy: 政策法规、标准规范、行业监管
- materials: 原材料、供应链、新技术材料
- tips: 实用技巧、行业知识、操作指南

评分标准（1-10分）：
- 9-10: 重大行业事件、重磅政策、突破性创新、头部企业战略变动
- 7-8: 重要新品发布、关键数据发布、有影响的行业趋势
- 5-6: 常规行业动态、一般性市场信息
- 3-4: 边缘资讯、重复性内容、价值有限
- 1-2: 广告软文、无关内容、低价值信息

tags: 提取2-4个关键词标签，帮助检索和归类。`

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text =
      response.content[0].type === 'text'
        ? response.content[0].text
        : '[]'

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('AI 返回格式错误')
    }

    const results: BatchAIResult[] = JSON.parse(jsonMatch[0])

    // 验证并修正每个结果
    return results.map((r, idx) => {
      let category = r.category?.toLowerCase().trim() || 'industry-news'
      if (!VALID_CATEGORIES.includes(category)) {
        category = 'industry-news'
      }

      let score = parseFloat(String(r.score))
      if (isNaN(score) || score < 1 || score > 10) {
        score = 5
      }

      const tags = Array.isArray(r.tags)
        ? r.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 4)
        : []

      return {
        index: r.index || idx + 1,
        category,
        summary: r.summary?.slice(0, 50) || items[idx]?.title?.slice(0, 30) || '',
        score,
        tags,
      }
    })
  } catch (error) {
    console.error('批量AI处理失败:', error)
    // 全部返回默认值
    return items.map((_, idx) => ({
      index: idx + 1,
      category: 'industry-news',
      summary: items[idx]?.title?.slice(0, 30) || '',
      score: 5,
      tags: [],
    }))
  }
}

// ============================================================
// 2. 深度推荐理由生成（只对高分条目）
// ============================================================

export async function generateDeepReasons(
  items: { title: string; summary: string; category: string }[]
): Promise<string[]> {
  if (items.length === 0) return []

  const itemsText = items
    .map((item, i) => `${i + 1}. [${CATEGORY_LABELS[item.category] || item.category}] ${item.title}\n   摘要：${item.summary}`)
    .join('\n\n')

  const prompt = `你是一位家居建材行业分析师。请为以下 ${items.length} 条精选资讯分别生成"推荐理由"，说明为什么从业者应该关注。

资讯列表：
${itemsText}

请严格按照以下JSON数组格式输出，每条理由50字以内，直接、专业、有洞察：
[
  { "index": 1, "reason": "推荐理由..." },
  { "index": 2, "reason": "推荐理由..." }
]

要求：
- 不要泛泛而谈，要指出具体的价值点（如：影响采购决策、预示价格走势、涉及合规要求等）
- 语言简洁有力，像行业专家给同事的推荐
- 不要加引号，直接输出文字`

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text =
      response.content[0].type === 'text'
        ? response.content[0].text
        : '[]'

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('AI 返回格式错误')
    }

    const results: { index: number; reason: string }[] = JSON.parse(jsonMatch[0])

    return items.map((_, idx) => {
      const found = results.find((r) => r.index === idx + 1)
      return found?.reason?.slice(0, 80) || '行业相关资讯，值得关注'
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
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text =
      response.content[0].type === 'text'
        ? response.content[0].text
        : '{}'

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AI 返回格式错误')
    }

    const result = JSON.parse(jsonMatch[0])

    // 验证并修正 sections
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

  // 对高分条目生成深度推荐理由
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
