import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { prisma } from '../src/lib/prisma'
import { addManualItem, batchImportItems, IMPORT_JSON_EXAMPLE } from '../src/lib/crawler'

/**
 * 手动添加资讯脚本
 * 支持三种模式：
 * 1. 单条添加（交互式）
 * 2. 批量导入 JSON 文件
 * 3. 从命令行参数直接添加
 *
 * 用法：
 *   npm run add              # 交互式单条添加
 *   npm run add -- --file ./news.json   # 从JSON文件批量导入
 *   npm run add -- --title "xxx" --url "xxx" --source "xxx" --content "xxx"  # 命令行直接添加
 */

function printHelp() {
  console.log(`
用法: npm run add -- [选项]

选项:
  --file <路径>      从JSON文件批量导入资讯
  --title <标题>     资讯标题（命令行模式）
  --url <链接>       资讯链接（命令行模式）
  --source <来源>    资讯来源（命令行模式）
  --content <内容>   资讯正文（命令行模式）
  --example          显示JSON导入格式示例
  -h, --help         显示帮助信息

示例:
  npm run add                          # 交互式添加
  npm run add -- --file ./news.json    # 批量导入
  npm run add -- --example             # 查看JSON格式示例
`)
}

function showExample() {
  console.log('\nJSON 批量导入格式示例（保存为 .json 文件）:\n')
  console.log(IMPORT_JSON_EXAMPLE)
  console.log('\n将以上内容保存为文件后，执行:')
  console.log('  npm run add -- --file ./your-file.json')
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2)
  const result: Record<string, string> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true'
      result[key] = value
      if (value !== 'true') i++
    }
  }

  return result
}

// 交互式单条添加
async function interactiveAdd() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📝 手动添加单条资讯')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('(按 Ctrl+C 取消)\n')

  // 使用 readline 进行交互
  const readline = await import('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  function ask(question: string): Promise<string> {
    return new Promise((resolve) => {
      rl.question(question, (answer) => resolve(answer.trim()))
    })
  }

  try {
    const title = await ask('标题: ')
    if (!title) {
      console.log('❌ 标题不能为空')
      return
    }

    const url = await ask('链接: ')
    if (!url) {
      console.log('❌ 链接不能为空')
      return
    }

    const source = await ask('来源: ') || '手动添加'
    const content = await ask('正文/摘要: ') || title

    console.log('\n正在处理...')
    const success = await addManualItem({ title, url, source, content })

    if (success) {
      console.log('\n✓ 添加成功！')
    } else {
      console.log('\n⚠ 添加失败或已存在')
    }

    // 询问是否继续添加
    const cont = await ask('\n是否继续添加? (y/n): ')
    if (cont.toLowerCase() === 'y') {
      await interactiveAdd()
    }
  } finally {
    rl.close()
  }
}

// 从JSON文件批量导入
async function importFromFile(filePath: string) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📂 批量导入: ${filePath}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`)
    process.exit(1)
  }

  let data: unknown
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    data = JSON.parse(content)
  } catch (error) {
    console.error('❌ JSON 解析失败:', (error as Error).message)
    process.exit(1)
  }

  if (!Array.isArray(data)) {
    console.error('❌ JSON 文件必须是数组格式')
    process.exit(1)
  }

  // 验证数据格式
  const validItems = data.filter((item: any) => {
    if (!item.title || !item.url) {
      console.warn(`⚠ 跳过无效条目: ${JSON.stringify(item).slice(0, 80)}`)
      return false
    }
    return true
  })

  if (validItems.length === 0) {
    console.log('❌ 没有有效的资讯条目')
    process.exit(1)
  }

  console.log(`准备导入 ${validItems.length} 条资讯...\n`)

  const result = await batchImportItems(
    validItems.map((item: any) => ({
      title: item.title,
      url: item.url,
      source: item.source || '批量导入',
      content: item.content || item.title,
      imageUrl: item.imageUrl,
    }))
  )

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log('📊 导入完成')
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`  成功: ${result.added} 条`)
  console.log(`  跳过: ${result.skipped} 条`)
}

// 命令行直接添加单条
async function directAdd(args: Record<string, string>) {
  const { title, url, source, content } = args

  if (!title || !url) {
    console.error('❌ 缺少必要参数: --title 和 --url 为必填项')
    printHelp()
    process.exit(1)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📝 直接添加资讯')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const success = await addManualItem({
    title,
    url,
    source: source || '手动添加',
    content: content || title,
  })

  if (success) {
    console.log('\n✓ 添加成功！')
  } else {
    console.log('\n⚠ 添加失败或已存在')
  }
}

async function main() {
  const args = parseArgs()

  if (args.help || args.h) {
    printHelp()
    process.exit(0)
  }

  if (args.example) {
    showExample()
    process.exit(0)
  }

  if (args.file) {
    await importFromFile(args.file)
  } else if (args.title || args.url) {
    await directAdd(args)
  } else {
    await interactiveAdd()
  }
}

main()
  .catch((e) => {
    console.error('错误:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
