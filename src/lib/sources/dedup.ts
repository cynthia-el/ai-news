import { RawItem } from './types'

/**
 * 多级去重引擎
 * 1. URL精确去重
 * 2. 标题规范化去重
 * 3. 标题相似度去重（包含关系 + 编辑距离）
 */

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\s\p{P}]/gu, '') // 去除空格和标点
    .trim()
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
    }
  }
  return matrix[b.length][a.length]
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshteinDistance(a, b) / maxLen
}

export interface DedupResult {
  unique: RawItem[]
  duplicates: { item: RawItem; originalIndex: number }[]
}

export function dedupItems(items: RawItem[]): DedupResult {
  const unique: RawItem[] = []
  const duplicates: { item: RawItem; originalIndex: number }[] = []

  const seenUrls = new Set<string>()
  const seenTitles: { normalized: string; original: string }[] = []

  for (const item of items) {
    // 1. URL精确去重
    const urlKey = item.url.split('?')[0].replace(/#.*$/, '').replace(/\/+$/, '')
    if (seenUrls.has(urlKey)) {
      const origIdx = unique.findIndex((u) => u.url.split('?')[0].replace(/#.*$/, '').replace(/\/+$/, '') === urlKey)
      duplicates.push({ item, originalIndex: origIdx >= 0 ? origIdx : 0 })
      continue
    }

    // 2. 标题规范化去重
    const normalized = normalizeTitle(item.title)
    if (normalized.length < 5) {
      // 标题太短，跳过相似度检查（可能是通用标题）
      seenUrls.add(urlKey)
      unique.push(item)
      continue
    }

    let isDuplicate = false
    let dupIndex = -1

    for (let i = 0; i < seenTitles.length; i++) {
      const seen = seenTitles[i]

      // 完全相同的规范化标题
      if (seen.normalized === normalized) {
        isDuplicate = true
        dupIndex = i
        break
      }

      // 包含关系（一个标题包含另一个的主要内容）
      if (normalized.length >= 10 && seen.normalized.length >= 10) {
        const short = normalized.length < seen.normalized.length ? normalized : seen.normalized
        const long = normalized.length < seen.normalized.length ? seen.normalized : normalized
        if (long.includes(short) && short.length >= long.length * 0.6) {
          isDuplicate = true
          dupIndex = i
          break
        }
      }

      // 编辑距离相似度（处理少量字差异的情况）
      if (normalized.length >= 8 && seen.normalized.length >= 8) {
        const sim = similarity(normalized, seen.normalized)
        if (sim >= 0.82) {
          isDuplicate = true
          dupIndex = i
          break
        }
      }
    }

    if (isDuplicate) {
      duplicates.push({ item, originalIndex: dupIndex })
    } else {
      seenUrls.add(urlKey)
      seenTitles.push({ normalized, original: item.title })
      unique.push(item)
    }
  }

  return { unique, duplicates }
}
