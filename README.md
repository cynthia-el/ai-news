# 家居建材AI资讯

AI驱动的家居建材行业资讯聚合平台。自动采集行业信息，通过AI进行智能分类、摘要生成和评分，帮助从业者快速了解市场动态。

## 功能特性

- **多源采集**：支持页面爬虫 + RSS订阅，覆盖主流行业媒体
- **AI智能处理**：Claude 3.5 Sonnet 自动分类、生成摘要、评分、推荐理由
- **精选推荐**：AI评分 >= 7 分的资讯自动标记为精选
- **日报生成**：每日自动聚合精选内容，生成行业日报
- **管理后台**：资讯管理、日报管理、采集历史、数据看板
- **多端输出**：Web网站 + REST API + RSS订阅 + Agent Skill

## 技术栈

| 层级 | 技术 |
|-----|------|
| 前端 | Next.js 16 + TypeScript + Tailwind CSS |
| 后端 | Next.js API Routes |
| 数据库 | PostgreSQL + Prisma 7 |
| AI | Anthropic Claude 3.5 Sonnet |
| 爬虫 | Cheerio + Fetch API |

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 14+

### 1. 进入项目目录

```bash
cd AI资讯网站/my-app
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env`，并填入你的配置：

```env
DATABASE_URL="postgresql://用户名:密码@localhost:5432/ai_news?schema=public"
ANTHROPIC_API_KEY="sk-ant-..."
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_NAME="家居建材AI资讯"
```

### 4. 初始化数据库

```bash
# 生成Prisma客户端
npm run db:generate

# 执行数据库迁移
npm run db:migrate

# 导入种子数据
npm run db:seed
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000`

## 使用指南

### 信息采集（手动执行）

```bash
# 一键同步：爬取 -> AI处理 -> 存储 -> 生成日报
npm run sync

# 手动添加单条资讯（交互式）
npm run add

# 从JSON文件批量导入
npm run add -- --file ./example-import.json

# 查看JSON导入格式示例
npm run add -- --example
```

### 管理后台

访问 `http://localhost:3000/admin`

功能：
- **数据看板**：统计概览、分类分布、最近采集记录
- **资讯管理**：编辑/删除资讯、批量标记精选、分类调整
- **日报管理**：查看历史日报、删除日报
- **采集历史**：每次采集的执行记录和统计

### API 接口

| 接口 | 说明 |
|-----|------|
| `GET /api/public/items?mode=selected&page=1` | 获取资讯列表 |
| `GET /api/public/daily` | 获取今日日报 |
| `GET /api/public/daily/2026-05-15` | 获取指定日期日报 |
| `GET /api/public/dailies?take=30` | 获取日报日期列表 |
| `GET /feed.xml` | RSS精选订阅 |
| `GET /feed/all.xml` | RSS全部订阅 |

### 爬虫源配置

编辑 `src/lib/crawler.ts` 中的 `CRAWLER_CONFIGS` 和 `RSS_CONFIGS`：

```typescript
export const CRAWLER_CONFIGS: CrawlerConfig[] = [
  {
    name: '来源名称',
    baseUrl: 'https://example.com',
    listSelector: '.news-item',      // 列表项选择器
    itemSelector: {
      title: 'h3 a',                 // 标题选择器
      link: 'h3 a',                  // 链接选择器
      date: '.time',                 // 日期选择器（可选）
      summary: '.desc',              // 摘要选择器（可选）
    },
    detailSelector: {
      content: '.article-content',   // 详情页正文选择器
      filter: '.ad, script',         // 过滤广告
    },
  },
]
```

### 批量导入JSON格式

创建 `.json` 文件：

```json
[
  {
    "title": "资讯标题",
    "url": "https://example.com/news/1",
    "source": "来源名称",
    "content": "资讯正文或摘要"
  }
]
```

## 项目结构

```
my-app/
├── prisma/
│   ├── schema.prisma          # 数据模型
│   └── seed.ts                # 种子数据
├── scripts/
│   ├── sync.ts                # 手动同步脚本
│   └── manual-add.ts          # 手动添加脚本
├── skill/
│   └── SKILL.md               # Agent Skill文档
├── src/
│   ├── lib/
│   │   ├── prisma.ts          # Prisma客户端
│   │   ├── ai.ts              # AI处理模块
│   │   ├── crawler.ts         # 爬虫框架
│   │   └── rss.ts             # RSS生成
│   └── app/
│       ├── page.tsx           # 首页
│       ├── daily/page.tsx     # 日报页
│       ├── agent/page.tsx     # Agent接入页
│       ├── admin/             # 管理后台
│       │   ├── page.tsx       # 数据看板
│       │   ├── items/page.tsx # 资讯管理
│       │   ├── dailies/page.tsx # 日报管理
│       │   └── crawl-logs/page.tsx # 采集历史
│       ├── api/
│       │   ├── public/        # 公开API
│       │   └── admin/         # 管理API
│       └── feed.xml/route.ts  # RSS输出
└── README.md
```

## 部署

### Vercel部署（推荐前端）

```bash
npm i -g vercel
vercel
```

### 数据库部署

推荐使用 Railway、Supabase 或阿里云 PostgreSQL。

### 环境变量配置

生产环境必须配置：
- `DATABASE_URL` - PostgreSQL连接字符串
- `ANTHROPIC_API_KEY` - Anthropic API密钥
- `NEXT_PUBLIC_SITE_URL` - 网站域名

## 注意事项

1. **AI API费用**：使用Claude API会产生费用，请留意使用量
2. **爬虫频率**：建议不要频繁执行 `npm run sync`，避免对目标网站造成压力
3. **选择器维护**：目标网站改版后可能需要更新爬虫选择器
4. **RSS优先**：RSS订阅比页面爬虫更稳定，优先配置RSS源

## 许可证

MIT
