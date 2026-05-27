import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

const NEW_SOURCES = [
  {
    name: '九正建材网-行业资讯',
    type: 'WEB',
    url: 'https://news.jc001.cn/',
    config: JSON.stringify({
      listSelector: '.news-list .item, .list-item, .news-item',
      itemSelector: {
        title: 'a, .title, h3',
        link: 'a',
        date: '.time, .date, span',
        summary: '.summary, .desc, p',
      },
      detailSelector: {
        content: '.content-detail, .article-content, .news-content',
        filter: '.ad, .advertisement, .related-read, script, style',
      },
    }),
    category: 'supply-chain',
    priority: 8,
  },
  {
    name: '慧聪建材网-资讯',
    type: 'WEB',
    url: 'https://info.hc360.com/list/zxxw.shtml',
    config: JSON.stringify({
      listSelector: '.list-item, .news-list li, .item',
      itemSelector: {
        title: 'a, .title',
        link: 'a',
        date: '.time, .date',
        summary: '.summary, .intro',
      },
      detailSelector: {
        content: '.content-detail, .article-content',
        filter: '.ad, .advertisement, .related-read, script, style',
      },
    }),
    category: 'market',
    priority: 7,
  },
  {
    name: '中国木业网-行业资讯',
    type: 'WEB',
    url: 'https://www.bmlink.com/news/',
    config: JSON.stringify({
      listSelector: '.news-list li, .list li, .item',
      itemSelector: {
        title: 'a, .title',
        link: 'a',
        date: '.time, .date',
        summary: '.summary, .intro, .des',
      },
      detailSelector: {
        content: '.content, .article-content, .news-detail',
        filter: '.ad, .advertisement, .related-read, script, style',
      },
    }),
    category: 'supply-chain',
    priority: 7,
  },
  {
    name: '中国陶瓷网-资讯',
    type: 'WEB',
    url: 'https://www.cerambath.com/news/',
    config: JSON.stringify({
      listSelector: '.news-list li, .list-item, .item',
      itemSelector: {
        title: 'a, .title, h3',
        link: 'a',
        date: '.time, .date',
        summary: '.summary, .intro',
      },
      detailSelector: {
        content: '.article-content, .content-detail, .news-content',
        filter: '.ad, .advertisement, .related-read, script, style',
      },
    }),
    category: 'technology',
    priority: 6,
  },
  {
    name: '网易家居-行业新闻',
    type: 'WEB',
    url: 'https://home.163.com/news/',
    config: JSON.stringify({
      listSelector: '.news-list li, .item, .news-item',
      itemSelector: {
        title: 'a, h3, .title',
        link: 'a',
        date: '.time, .date',
        summary: '.summary, .intro, .des',
      },
      detailSelector: {
        content: '.post-content, .article-content, .content',
        filter: '.ad, .advertisement, .related-read, script, style',
      },
    }),
    category: 'market',
    priority: 8,
  },
]

async function main() {
  console.log('Adding new sources...')

  for (const source of NEW_SOURCES) {
    const exists = await prisma.source.findFirst({
      where: { name: source.name },
    })
    if (exists) {
      console.log(`Skipped (exists): ${source.name}`)
      continue
    }

    await prisma.source.create({
      data: {
        name: source.name,
        type: source.type,
        url: source.url,
        config: source.config,
        category: source.category,
        priority: source.priority,
        isActive: true,
      },
    })
    console.log(`Added: ${source.name}`)
  }

  const allSources = await prisma.source.findMany({
    orderBy: { createdAt: 'asc' },
  })
  console.log(`\nTotal sources: ${allSources.length}`)
  for (const s of allSources) {
    console.log(`- ${s.name} (${s.type}, active=${s.isActive})`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
