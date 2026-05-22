// ============================================================
// 战略级分类体系：面向CEO/战略发展部的五维视角
// ============================================================

/** 一级分类：战略维度 */
export const PRIMARY_CATEGORIES = [
  'policy',
  'market',
  'capital',
  'technology',
  'supply-chain',
] as const

/** 一级分类中文标签 */
export const CATEGORY_MAP: Record<string, string> = {
  policy: '政策监管',
  market: '市场格局',
  capital: '资本财务',
  technology: '技术材料',
  'supply-chain': '产业链',
}

/** 分类元数据（用于UI展示） */
export const CATEGORY_META: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  policy: {
    label: '政策监管',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    desc: '国家部委新政、标准修订、环保合规、双碳目标',
  },
  market: {
    label: '市场格局',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    desc: '头部企业战略、并购重组、产能扩张、出海布局',
  },
  capital: {
    label: '资本财务',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    desc: '上市企业财报、融资动态、研报、IPO进展',
  },
  technology: {
    label: '技术材料',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    desc: '新技术商用、新材料突破、智能制造、AI+家居',
  },
  'supply-chain': {
    label: '产业链',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    desc: '原材料价格、渠道变革、整装/电商、上下游供需',
  },
}

/** 二级分类：细分领域 */
export const SECONDARY_CATEGORIES = [
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
export const SENTIMENT_TAGS = ['正面', '中性', '风险']

export const CATEGORY_KEYS = Object.keys(CATEGORY_META) as string[]

/** 旧分类兼容映射（用于数据迁移） */
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  'industry-news': 'market',
  'new-products': 'technology',
  'design-trends': 'market',
  policy: 'policy',
  materials: 'supply-chain',
  tips: 'market',
}
