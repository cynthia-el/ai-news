import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const CRON_SECRET = process.env.CRON_SECRET

function authorize(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${CRON_SECRET}`) return true
  if (!CRON_SECRET) {
    console.warn('[Cron] CRON_SECRET 未设置，允许无认证请求（仅用于开发调试）')
    return true
  }
  return false
}

/**
 * Cron 定时同步入口
 * Vercel Hobby 函数只有 10 秒超时，无法完成完整同步
 * 因此通过 GitHub API 触发 workflow_dispatch 在 GitHub Actions 中执行
 */
export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const githubToken = process.env.GITHUB_TOKEN
    const repoOwner = process.env.VERCEL_GIT_REPO_OWNER
    const repoSlug = process.env.VERCEL_GIT_REPO_SLUG

    if (!githubToken) {
      console.error('[Cron] GITHUB_TOKEN 未配置')
      return Response.json(
        { error: 'GITHUB_TOKEN 未配置' },
        { status: 500 }
      )
    }

    if (!repoOwner || !repoSlug) {
      console.error('[Cron] 无法获取仓库信息')
      return Response.json(
        { error: '无法获取仓库信息' },
        { status: 500 }
      )
    }

    // 创建运行中日志
    const crawlLog = await prisma.crawlLog.create({
      data: { status: 'running', startedAt: new Date() },
    })

    // 触发 GitHub Actions workflow
    const res = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoSlug}/actions/workflows/sync.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${githubToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' }),
      }
    )

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[Cron] GitHub API error:', res.status, errorText)

      await prisma.crawlLog.update({
        where: { id: crawlLog.id },
        data: { status: 'failed', endedAt: new Date(), errorMessage: `GitHub API ${res.status}: ${errorText}` },
      })

      return Response.json(
        { error: `触发 GitHub Actions 失败: ${res.status}` },
        { status: 500 }
      )
    }

    return Response.json({
      accepted: true,
      logId: crawlLog.id,
      message: '定时同步任务已提交到 GitHub Actions 后台执行',
    })
  } catch (error) {
    const message = (error as Error).message
    console.error('[Cron] Error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
