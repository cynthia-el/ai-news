import 'dotenv/config'

async function main() {
  const githubToken = process.env.GITHUB_TOKEN
  const repoOwner = process.env.VERCEL_GIT_REPO_OWNER || 'cynthia-el'
  const repoSlug = process.env.VERCEL_GIT_REPO_SLUG || 'ai-news'

  if (!githubToken) {
    console.error('GITHUB_TOKEN 未配置')
    process.exit(1)
  }

  console.log('🚀 触发 Cloudflare Pages 部署...\n')

  const res = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoSlug}/actions/workflows/deploy-pages.yml/dispatches`,
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

  if (res.ok) {
    console.log('✅ 已触发 deploy-pages workflow')
    console.log('   请前往 GitHub → Actions → Deploy Static Site to Cloudflare Pages 查看进度')
  } else {
    const text = await res.text()
    console.error(`❌ 触发失败: ${res.status} ${text}`)
    process.exit(1)
  }
}

main().catch(console.error)
