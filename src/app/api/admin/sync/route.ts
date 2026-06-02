import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * 触发 GitHub Actions 执行同步
 * Vercel Hobby 函数只有 10 秒超时，无法完成完整同步
 * 因此通过 GitHub API 触发 workflow_dispatch 在 GitHub Actions 中执行
 */
export async function POST(request: NextRequest) {
  try {
    const githubToken = process.env.GITHUB_TOKEN
    const repoOwner = process.env.VERCEL_GIT_REPO_OWNER
    const repoSlug = process.env.VERCEL_GIT_REPO_SLUG

    if (!githubToken) {
      return Response.json(
        { error: 'GITHUB_TOKEN 未配置，请前往 Vercel 项目设置添加环境变量' },
        { status: 500 }
      )
    }

    if (!repoOwner || !repoSlug) {
      return Response.json(
        { error: '无法获取仓库信息，请检查部署配置' },
        { status: 500 }
      )
    }

    // 创建运行中日志（GitHub Actions 会更新它）
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
      console.error('[Sync] GitHub API error:', res.status, errorText)

      // 标记失败
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
      message: '同步任务已提交到 GitHub Actions 后台执行，请稍候刷新查看结果',
    })
  } catch (error) {
    const message = (error as Error).message
    console.error('[Sync] Error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
