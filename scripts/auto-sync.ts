import 'dotenv/config'
import { spawn } from 'child_process'
import path from 'path'

/**
 * 自动同步入口
 * 用于服务器定时任务（cron / Vercel Cron）
 * 用法：ENABLE_AUTO_SYNC=true tsx scripts/auto-sync.ts
 */

const enabled = process.env.ENABLE_AUTO_SYNC === 'true'

if (!enabled) {
  console.log('自动同步未启用。设置环境变量 ENABLE_AUTO_SYNC=true 以开启。')
  process.exit(0)
}

const syncScript = path.resolve(__dirname, 'sync.ts')

console.log(`[AutoSync] ${new Date().toLocaleString('zh-CN')} 启动自动同步`)

const child = spawn('npx', ['tsx', syncScript], {
  stdio: 'inherit',
  shell: true,
})

child.on('close', (code) => {
  console.log(`[AutoSync] 同步结束，退出码: ${code}`)
  process.exit(code ?? 0)
})
