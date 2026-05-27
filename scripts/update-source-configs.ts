import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

const UPDATES = [
  {
    name: '九正建材网-行业资讯',
    url: 'https://news.jc001.cn/',
    config: JSON.stringify({
      listSelector: '.newsToday ul.list li',
      itemSelector: {
        title: 'a[title]',
        link: 'a[title]',
        date: '',
        summary: '',
      },
      detailSelector: {
        content: '.content-detail, .article-content, .news-content',
        filter: '.ad, .advertisement, .related-read, script, style',
      },
    }),
  },
  {
    name: '慧聪建材网-资讯',
    newName: '腾讯家居-资讯',
    url: 'https://www.jia360.com/',
    config: JSON.stringify({
      listSelector: 'li.txtover',
      itemSelector: {
        title: 'a',
        link: 'a',
        date: '',
        summary: '',
      },
      detailSelector: {
        content: '.article-content, .content, .news-content',
        filter: '.ad, .advertisement, .related-read, script, style',
      },
    }),
  },
  {
    name: '中国木业网-行业资讯',
    url: 'https://www.bmlink.com/news/',
    config: JSON.stringify({
      listSelector: 'div#news_list ul.m-list li, div.news_list ul.m-list li',
      itemSelector: {
        title: 'a',
        link: 'a',
        date: '',
        summary: '',
      },
      detailSelector: {
        content: '.content, .article-content, .news-detail',
        filter: '.ad, .advertisement, .related-read, script, style',
      },
    }),
  },
  {
    name: '中国陶瓷网-资讯',
    url: 'https://www.cerambath.com/news/',
    config: JSON.stringify({
      listSelector: 'ul.list-paddingleft-2 li',
      itemSelector: {
        title: 'a',
        link: 'a',
        date: '',
        summary: '',
      },
      detailSelector: {
        content: '.article-content, .content-detail, .news-content',
        filter: '.ad, .advertisement, .related-read, script, style',
      },
    }),
  },
  {
    name: '网易家居-行业新闻',
    url: 'https://home.163.com/special/latest/',
    config: JSON.stringify({
      listSelector: 'h4.f-toe',
      itemSelector: {
        title: 'a',
        link: 'a',
        date: '',
        summary: '',
      },
      detailSelector: {
        content: '.post-content, .article-content, .content',
        filter: '.ad, .advertisement, .related-read, script, style',
      },
    }),
  },
]

async function main() {
  for (const update of UPDATES) {
    const existing = await prisma.source.findFirst({
      where: { name: update.name },
    })

    if (!existing) {
      console.log(`❌ Not found: ${update.name}`)
      continue
    }

    const data: any = {
      url: update.url,
      config: update.config,
    }

    if ('newName' in update && update.newName) {
      data.name = update.newName
      console.log(`🔄 Renaming "${update.name}" → "${update.newName}"`)
    }

    await prisma.source.update({
      where: { id: existing.id },
      data,
    })

    console.log(`✅ Updated: ${update.name}`)
    console.log(`   URL: ${update.url}`)
  }

  // Verify
  const allSources = await prisma.source.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`\n📋 Active sources (${allSources.length}):`)
  for (const s of allSources) {
    console.log(`- ${s.name} → ${s.url}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
