# 家居建材AI资讯 Skill

家居建材行业AI智能资讯聚合平台。自动采集、智能分类、精选推荐。

## 安装

```bash
npm install
```

## 配置

在 `.env` 文件中配置：

```
ANTHROPIC_API_KEY=你的Anthropic API Key
DATABASE_URL=你的PostgreSQL连接字符串
```

## 使用

### 查询今日热点

```
今天家居行业有什么新动态？
```

### 获取日报

```
看一下今天的行业日报
```

### 搜索特定话题

```
最近有什么关于环保板材的资讯？
```

### 查看分类资讯

```
最近有什么新品发布？
最近的设计趋势是什么？
最近有什么政策法规？
```

## API 端点

### GET /api/public/items

获取资讯条目列表。

参数：
- `mode`: `selected` (精选) | `all` (全部)
- `category`: 分类筛选
  - `industry-news`: 行业动态
  - `new-products`: 新品发布
  - `design-trends`: 设计趋势
  - `policy`: 政策法规
  - `materials`: 原材料
  - `tips`: 实用技巧
- `since`: ISO-8601 格式日期，时间窗口
- `q`: 关键词搜索
- `page`: 页码
- `pageSize`: 每页数量

### GET /api/public/daily

获取今日日报。

### GET /api/public/daily/YYYY-MM-DD

获取指定日期日报。

### GET /api/public/dailies

获取有日报的日期列表。

参数：
- `take`: 数量，默认30

## 数据源

- 新浪家居
- 网易家居
- 腾讯家居
- 住建部官网
- 各品牌官网

## 技术栈

- Next.js 16
- TypeScript
- Prisma
- PostgreSQL
- Tailwind CSS
- Anthropic Claude API