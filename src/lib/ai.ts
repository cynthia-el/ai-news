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

// ============================================================
// 新分类体系：五维战略视角
// ============================================================

/** 一级分类：战略维度 */
const PRIMARY_CATEGORIES = [
  'policy',        // 政策监管
  'market',        // 市场格局
  'capital',       // 资本财务
  'technology',    // 技术材料
  'supply-chain',  // 产业链/渠道
]

/** 一级分类中文标签 */
const PRIMARY_LABELS: Record<string, string> = {
  policy: '政策监管',
  market: '市场格局',
  capital: '资本财务',
  technology: '技术材料',
  'supply-chain': '产业链',
}

/** 二级分类：细分领域 */
const SECONDARY_CATEGORIES = [
  '人造板',
  '全屋定制',
  '木结构',
  '智能家居',
  '绿色建材',
  '陶瓷卫浴',
  '门窗厨卫',
  '家具制造',
]

/** 情绪标签 */
const SENTIMENT_TAGS = ['正面', '中性', '风险']

// ============================================================
// API 调用
// ============================================================

async function callLongCat(systemPrompt: string, userPrompt: string, maxTokens = 4000): Promise<string> {
  const messages: { role: string; content: string }[] = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push({ role: 'user', content: userPrompt })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 120000)

  try {
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
        messages,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[AI API Error] Status: ${response.status}, Content-Type: ${response.headers.get('content-type')}`)
      console.error(`[AI API Error] Body: ${errorText.slice(0, 500)}`)
      throw new Error(`LongCat API ${response.status}: ${errorText.slice(0, 200)}`)
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    return text
  } catch (error) {
    clearTimeout(timeoutId)
    if ((error as Error).name === 'AbortError') {
      throw new Error('LongCat API 请求超时（120秒）')
    }
    throw error
  }
}

// ============================================================
// 1. 批量分类评分（五维筛选法）
// ============================================================

export async function batchClassify(
  items: { title: string; content: string; source?: string; publishedAt?: Date }[]
): Promise<BatchAIResult[]> {
  if (items.length === 0) return []

  const itemsText = items
    .map((item, i) => {
      const sourceInfo = item.source ? ` [信源: ${item.source}]` : ''
      const dateInfo = item.publishedAt ? ` [日期: ${item.publishedAt.toISOString().slice(0, 10)}]` : ''
      return `${i + 1}. 标题：${item.title}${sourceInfo}${dateInfo}\n   正文：${item.content.slice(0, 1000)}`
    })
    .join('\n\n')

  const prompt = `你是一位服务于家居建材行业高层决策者的资深战略分析师。你的任务是对以下资讯进行严格的"五维筛选评分"，只有评分≥6分的内容才值得入选战略日报。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【目标受众】
行业内高层决策者（战略发展部、CEO、投资人），用于战略决策参考。他们需要在3分钟内掌握"会影响公司战略/竞争格局/政策合规/市场机会"的关键动态。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【直接排除标准 — 一票否决】
以下类型的资讯无论其他维度如何，必须给1-2分：
1. 标题含"避坑"、"翻车"、"技巧"、"攻略"、"教程"、"怎么选"、"多少钱"等C端消费词
2. 内容仅为单一消费者投诉/个案维权（如"某网友新房翻车"、"质量投诉售后差"）
3. 纯地方性微观调研（单一城市样本量<1000且无全国性推导，如"西宁刚需家庭装修调研"）
4. 无具体数据来源的泛泛评论（如"专家指出"、"行业正经历变革"，无具体机构名称、无数据、无政策文件名）
5. 纯品牌软文/产品种草/招商加盟（无战略意义，如"选XX就对了"、"限时优惠"、"诚招代理"）
6. B2B采购询价（"需要采购XX"、"求购XX材料"、"咨询XX价格"）
7. 内容乱码、无法阅读、全是符号

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【五维评分标准 — 满分10分，≥6分入选】

1. 信源权威性（0-2分）
   - 2分：国家部委/证劵研报/头部企业官方/行业协会
   - 1分：行业垂直媒体/知名财经媒体
   - 0分：自媒体/未知来源/营销号

2. 数据密度（0-2分）
   - 2分：含具体数字（金额、百分比、产能、规模、政策文号）
   - 1分：有定性描述但缺乏具体数据
   - 0分：无实质内容，纯观点/口号

3. 战略相关性（0-3分）
   - 3分：直接影响竞争格局/政策合规/投资决策/技术路线
   - 2分：行业趋势参考，有一定战略价值
   - 1分：一般资讯，战略价值有限
   - 0分：与战略决策完全无关

4. 时效性（0-1分）
   - 1分：7天内发布
   - 0.5分：7-30天内
   - 0分：更早

5. 独家性（0-2分）
   - 2分：独家政策解读/首发数据/重大战略宣布
   - 1分：常规报道
   - 0分：转载/群发通稿

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【摘要生成规则 — 必须严格遵守】
每条入选资讯的摘要必须包含：
- Who（主体）：涉及的关键企业/机构/政府部门名称
- What（动作/事件）：具体发生了什么
- Impact（影响/数据）：关键数据、政策文号、市场影响
- So What（战略含义）：对行业/企业的战略意义

禁止直接复制原文开头。风格要求：冷静、客观、信息密度高，不带营销感。字数150-250字。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【分类标签体系 — 必须严格执行】

category（一级，必选其一）：
- policy: 政策监管（国家部委/地方政府新政、标准修订、补贴/以旧换新、环保合规、双碳目标）
- market: 市场格局（头部企业战略动作、并购重组、产能扩张/收缩、出海布局、市占率变化、行业集中度）
- capital: 资本财务（上市企业财报、融资动态、股价异动、投资机构研报、IPO进展）
- technology: 技术材料（新技术商用、新材料突破、智能制造、装配式/木结构技术、负碳材料、AI+家居）
- supply-chain: 产业链/渠道（原材料价格、渠道变革、整装/电商/出海、上下游供需关系）

tags（必须包含）：
- 二级分类标签（至少1个）：人造板、全屋定制、木结构、智能家居、绿色建材、陶瓷卫浴、门窗厨卫、家具制造
- 情绪标签（必须1个）：正面、中性、风险
- 可附加1-2个精准关键词

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【行业聚焦方向】
核心关注以下产业领域：
- 人造板产业链：刨花板、胶合板、纤维板、OSB、饰面板、实木复合、ENF级、甲醛标准
- 定制家居：全屋定制、高定、整木定制、橱柜、衣柜、木门、整装
- 家具制造：软体家具、办公家具、智能家具
- 厨卫：卫浴洁具、厨房设备、集成灶
- 门窗：系统门窗、铝门窗、木门
- 陶瓷：瓷砖、岩板
- 智能家居：智能照明、智能安防、IoT家居、AI赋能
- 绿色建材：双碳、负碳、以旧换新、绿色建材应用比例
- 原材料：木材、胶粘剂、五金配件价格走势

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
资讯列表：
${itemsText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
请严格按照以下JSON数组格式输出，不要输出任何其他内容：
[
  {
    "index": 1,
    "category": "policy|market|capital|technology|supply-chain",
    "summary": "150-250字摘要，必须包含Who+What+Impact+So What",
    "score": 1-10,
    "tags": ["二级分类", "情绪标签", "关键词1", "关键词2"]
  }
]`

  try {
    const text = await callLongCat('', prompt, 4000)
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('AI 返回格式错误')

    let results: BatchAIResult[]
    try {
      results = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      // 尝试逐条提取 JSON 对象
      const objectMatches = jsonMatch[0].match(/\{\s*"index"\s*:\s*\d+[^}]*\}/g)
      if (objectMatches) {
        results = objectMatches.map((objStr) => {
          try {
            return JSON.parse(objStr)
          } catch {
            const indexMatch = objStr.match(/"index"\s*:\s*(\d+)/)
            const categoryMatch = objStr.match(/"category"\s*:\s*"([^"]*)"/)
            const summaryMatch = objStr.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/)
            const scoreMatch = objStr.match(/"score"\s*:\s*(\d+)/)
            const tagsMatch = objStr.match(/"tags"\s*:\s*\[([^\]]*)\]/)
            return {
              index: indexMatch ? parseInt(indexMatch[1], 10) : 0,
              category: categoryMatch ? categoryMatch[1] : 'market',
              summary: summaryMatch ? summaryMatch[1] : '',
              score: scoreMatch ? parseInt(scoreMatch[1], 10) : 5,
              tags: tagsMatch ? tagsMatch[1].split(',').map(t => t.trim().replace(/"/g, '')).filter(Boolean) : [],
            }
          }
        }).filter(Boolean) as BatchAIResult[]
      } else {
        throw parseError
      }
    }

    return results.map((r, idx) => {
      let category = r.category?.toLowerCase().trim() || 'market'
      if (!PRIMARY_CATEGORIES.includes(category)) category = 'market'

      let score = parseFloat(String(r.score))
      if (isNaN(score) || score < 1 || score > 10) score = 5

      const tags = Array.isArray(r.tags)
        ? r.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 5)
        : []

      // 确保tags包含二级分类和情绪标签
      const hasSecondary = SECONDARY_CATEGORIES.some(s => tags.includes(s))
      const hasSentiment = SENTIMENT_TAGS.some(s => tags.includes(s))

      if (!hasSecondary) {
        // 根据标题内容推断二级分类
        const title = items[idx]?.title || ''
        const content = items[idx]?.content || ''
        const text = title + content
        for (const sec of SECONDARY_CATEGORIES) {
          if (text.includes(sec)) {
            tags.unshift(sec)
            break
          }
        }
        if (!SECONDARY_CATEGORIES.some(s => tags.includes(s))) {
          tags.unshift('全屋定制') // 默认
        }
      }

      if (!hasSentiment) {
        tags.push('中性')
      }

      return {
        index: r.index || idx + 1,
        category,
        summary: r.summary?.slice(0, 250) || items[idx]?.title?.slice(0, 50) || '',
        score,
        tags: tags.slice(0, 5),
      }
    })
  } catch (error) {
    console.error('批量AI处理失败:', error)
    return items.map((_, idx) => ({
      index: idx + 1,
      category: 'market',
      summary: items[idx]?.title?.slice(0, 50) || '',
      score: 5,
      tags: ['全屋定制', '中性'],
    }))
  }
}

// ============================================================
// 2. 深度推荐理由生成（战略视角解读）
// ============================================================

export async function generateDeepReasons(
  items: { title: string; summary: string; category: string }[]
): Promise<string[]> {
  if (items.length === 0) return []

  const itemsText = items
    .map((item, i) => `${i + 1}. [${PRIMARY_LABELS[item.category] || item.category}] ${item.title}\n   摘要：${item.summary}`)
    .join('\n\n')

  const prompt = `你是一位家居建材行业战略顾问，为CEO和战略发展部提供决策支持。请为以下 ${items.length} 条精选资讯分别生成"战略解读"。

资讯列表：
${itemsText}

请严格按照以下JSON数组格式输出，每条解读80-120字：
[
  { "index": 1, "reason": "解读内容..." },
  { "index": 2, "reason": "解读内容..." }
]

要求：
- 不要泛泛而谈，要指出对高层决策的具体价值点
- 分析维度示例：影响采购/投资/产能布局决策、预示价格/竞争格局变化、涉及合规/政策风险、技术路线判断、渠道策略调整等
- 风格：冷静、专业、有洞察，像麦肯锡/BCG顾问给客户的briefing note
- 80-120字，简洁有力
- 禁止出现推销语气或品牌宣传口吻`

  try {
    const text = await callLongCat('', prompt, 2000)
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('AI 返回格式错误')

    const results: { index: number; reason: string }[] = JSON.parse(jsonMatch[0])
    return items.map((_, idx) => {
      const found = results.find((r) => r.index === idx + 1)
      return found?.reason?.slice(0, 120) || '行业战略资讯，建议关注'
    })
  } catch (error) {
    console.error('战略解读生成失败:', error)
    return items.map(() => '行业战略资讯，建议关注')
  }
}

// ============================================================
// 3. 分版块日报生成（投行Briefing风格）
// ============================================================

export async function generateDailyWithSections(
  items: { title: string; summary: string; category: string; tags: string[] }[]
): Promise<DailyWithSectionsResult> {
  if (items.length === 0) {
    return {
      title: '家居战略资讯日报',
      summary: '今日暂无重要战略资讯',
      editorNote: '',
      sections: [],
    }
  }

  const itemsText = items
    .map((item, i) => `${i + 1}. [${PRIMARY_LABELS[item.category] || item.category}] ${item.title}\n   ${item.summary}\n   标签：${item.tags.join(' | ')}`)
    .join('\n\n')

  const prompt = `你是顶级投行/咨询公司的行业研究总监。请根据以下今日精选战略资讯，生成一份面向CEO/投资决策者的Daily Briefing。

参考风格：高盛/麦肯锡行业日报，冷静、专业、信息密度高。

资讯列表：
${itemsText}

请严格按照以下JSON格式输出，不要输出任何其他内容：
{
  "title": "日报标题，15字以内，体现今日核心战略信号",
  "summary": "主编导语，80-100字，概括今日行业战略要点和关键趋势",
  "editorNote": "主编点评，30-50字，点出今日最值得关注的1个战略信号",
  "sections": [
    {
      "category": "policy",
      "title": "版块标题，如'政策监管'",
      "description": "版块导语，20-30字，概括该版块战略价值"
    }
  ]
}

要求：
- 只创建有实际资讯的版块，不要创造空版块
- 版块的 category 必须从以下选择：policy, market, capital, technology, supply-chain
- 版块按战略重要性排序（policy优先，其次capital/market，然后technology/supply-chain）
- title 要简洁有力，像投行研究部头版
- 如果今日没有某类资讯，不要硬凑版块`

  try {
    const text = await callLongCat('', prompt, 1500)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI 返回格式错误')

    const result = JSON.parse(jsonMatch[0])

    const sections: DailySectionPlan[] = []
    if (Array.isArray(result.sections)) {
      for (const s of result.sections) {
        const cat = s.category?.toLowerCase().trim()
        if (PRIMARY_CATEGORIES.includes(cat)) {
          sections.push({
            category: cat,
            title: s.title?.slice(0, 20) || PRIMARY_LABELS[cat] || cat,
            description: s.description?.slice(0, 50) || '',
          })
        }
      }
    }

    return {
      title: result.title?.slice(0, 30) || '家居战略资讯日报',
      summary: result.summary?.slice(0, 150) || '今日家居建材行业战略资讯汇总',
      editorNote: result.editorNote?.slice(0, 80) || '',
      sections,
    }
  } catch (error) {
    console.error('日报生成失败:', error)
    return {
      title: '家居战略资讯日报',
      summary: '今日家居建材行业战略资讯汇总',
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
  content: string,
  source?: string,
  publishedAt?: Date
): Promise<AIProcessResult> {
  const batch = await batchClassify([{ title, content, source, publishedAt }])
  const result = batch[0]

  if (!result) {
    return {
      category: 'market',
      summary: title.slice(0, 30),
      reason: '行业战略资讯',
      score: 5,
      tags: ['全屋定制', '中性'],
    }
  }

  let reason = '行业战略资讯'
  if (result.score >= 6) {
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
  items: { title: string; summary: string; category: string; tags: string[] }[]
): Promise<{ title: string; summary: string }> {
  const result = await generateDailyWithSections(items)
  return {
    title: result.title,
    summary: result.summary,
  }
}
