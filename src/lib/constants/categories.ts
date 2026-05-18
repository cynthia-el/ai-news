export const CATEGORY_MAP: Record<string, string> = {
  'industry-news': '行业动态',
  'new-products': '新品发布',
  'design-trends': '设计趋势',
  policy: '政策法规',
  materials: '原材料',
  tips: '实用技巧',
}

export const CATEGORY_META: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  'industry-news': { label: '行业动态', color: 'text-blue-600', bg: 'bg-blue-50', desc: '市场新闻、企业动态' },
  'new-products': { label: '新品发布', color: 'text-emerald-600', bg: 'bg-emerald-50', desc: '新产品、新技术' },
  'design-trends': { label: '设计趋势', color: 'text-violet-600', bg: 'bg-violet-50', desc: '装修风格、设计理念' },
  policy: { label: '政策法规', color: 'text-rose-600', bg: 'bg-rose-50', desc: '行业标准、政策文件' },
  materials: { label: '原材料', color: 'text-amber-600', bg: 'bg-amber-50', desc: '材料价格、新技术材料' },
  tips: { label: '实用技巧', color: 'text-slate-600', bg: 'bg-slate-50', desc: '行业知识、操作技巧' },
}

export const CATEGORY_KEYS = Object.keys(CATEGORY_META) as string[]
