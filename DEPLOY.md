# Vercel 部署指南

## 前置准备

1. **GitHub 账号**：https://github.com/
2. **Vercel 账号**：https://vercel.com/（可用 GitHub 直接登录）
3. **Neon 账号**：https://neon.tech/（免费 PostgreSQL 数据库）
4. **LongCat API Key**：https://longcat.chat（AI处理必需，完全免费）

---

## 第一步：创建 GitHub 仓库

### 方式A：命令行（推荐）

```bash
# 进入项目目录
cd "C:/Users/Dell/Desktop/AI资讯网站/my-app"

# 初始化 git（如果还没做）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit"

# 在 GitHub 上创建一个新仓库（不要勾选 README、.gitignore、license）
# 然后关联并推送：
git remote add origin https://github.com/你的用户名/ai-news-aggregator.git
git branch -M main
git push -u origin main
```

### 方式B：GitHub Desktop（图形界面）

1. 打开 GitHub Desktop
2. File -> Add local repository
3. 选择 `C:/Users/Dell/Desktop/AI资讯网站/my-app`
4. 填写 Summary: "Initial commit"，点击 Commit to main
5. 点击 Publish repository，选择 Public

---

## 第二步：创建 Neon 数据库

1. 访问 https://neon.tech 注册/登录
2. 点击 **New Project**
3. 项目名称：`ai-news-aggregator`
4. 区域选择：建议选 `Asia Pacific (Singapore)` 或最接近你的区域
5. 数据库名称：`ai_news`
6. 创建后，点击左侧 **Connection Details**
7. 复制 **Connection string**（格式如：`postgresql://xxx@xxx.neon.tech/ai_news?sslmode=require`）
8. **保存好这个连接字符串**，后面会用到

---

## 第三步：部署到 Vercel

### 方式A：Vercel Dashboard（推荐）

1. 访问 https://vercel.com 用 GitHub 登录
2. 点击 **Add New... -> Project**
3. 在列表中找到 `ai-news-aggregator`，点击 **Import**
4. **Project Name**：`ai-news-aggregator`
5. **Framework Preset**：应该自动识别为 Next.js
6. **Build Command**：保持默认（或改为 `prisma generate && prisma migrate deploy && next build`）
7. 展开 **Environment Variables**，添加以下变量：

| 变量名 | 值 |
|--------|-----|
| `DATABASE_URL` | 从 Neon 复制的连接字符串 |
| `LONGCAT_API_KEY` | 你的 LongCat API Key（https://longcat.chat/platform/api_keys） |
| `NEXT_PUBLIC_SITE_URL` | `https://你的项目名.vercel.app` |
| `NEXT_PUBLIC_SITE_NAME` | `家居建材AI资讯` |
| `CRON_SECRET` | 随机字符串（如用命令 `node -e "console.log(crypto.randomUUID())"` 生成） |

8. 点击 **Deploy**

### 方式B：Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

部署过程中会提示你输入环境变量。

---

## 第四步：初始化数据库

Vercel 首次部署时，`prisma migrate deploy` 会自动运行，但**不会执行 seed**。你需要手动初始化数据：

### 方式A：Vercel Shell（最简单）

1. 在 Vercel Dashboard 进入你的项目
2. 点击顶部 **Runtime Logs** 旁边的 **Shell**
3. 运行以下命令：

```bash
npx prisma db seed
```

### 方式B：本地连接远程数据库执行

```bash
# 设置环境变量为远程数据库
$env:DATABASE_URL="postgresql://xxx@xxx.neon.tech/ai_news?sslmode=require"

# 执行 seed
npx prisma db seed
```

---

## 第五步：配置 Cron 定时任务

项目已配置每天凌晨 2 点自动执行同步（`vercel.json` 中的 `crons`）。

**免费版限制**：Vercel Hobby 计划每天最多执行 1 次 Cron Job（已满足需求）。

如需手动触发同步，可以访问：

```
https://你的项目名.vercel.app/api/cron/sync
```

**注意**：访问时需要带上 `Authorization: Bearer 你的CRON_SECRET` header。

---

## 第六步：访问网站

- **前台**：`https://你的项目名.vercel.app`
- **管理后台**：`https://你的项目名.vercel.app/admin`
- **RSS订阅**：`https://你的项目名.vercel.app/feed.xml`

---

## RSSHub 部署（可选）

RSSHub 是 Node.js 应用，**无法部署到 Cloudflare**，但可以一键部署到 Vercel：

1. 访问 https://github.com/DIYgod/RSSHub
2. 点击 README 中的 **Deploy to Vercel** 按钮
3. 用同一个 Vercel 账号部署
4. 部署完成后，你会得到一个 `https://rsshub-xxx.vercel.app` 的地址
5. 在你的项目管理后台添加信源时，RSSHub 地址可以作为中转：
   - 例如：`https://rsshub-xxx.vercel.app/wechat/mp/公众号ID`

---

## 费用说明

| 服务 | 免费额度 | 预估月费用 |
|------|---------|-----------|
| **Vercel** | 每月 100GB 流量、10秒函数执行时长 | 免费（个人站足够） |
| **Neon** | 每月 500MB 存储、190 小时计算 | 免费（足够） |
| **LongCat API** | 每天 5000万 token 免费额度 | 免费（完全够用） |

---

## 常见问题

### Q1: 部署后页面显示 500 错误？
检查 Vercel 的 Runtime Logs，通常是 `DATABASE_URL` 配置错误。

### Q2: 数据库迁移失败？
确保 `DATABASE_URL` 中的数据库名（如 `ai_news`）已在 Neon 中创建。

### Q3: 如何手动触发同步？
```bash
curl -H "Authorization: Bearer 你的CRON_SECRET" \
  https://你的项目名.vercel.app/api/cron/sync
```

### Q4: 采集的资讯太少？
在管理后台 `/admin/sources` 添加更多信源，推荐使用 Google News RSS：
- `https://news.google.com/rss/search?q=建材+家居&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`
