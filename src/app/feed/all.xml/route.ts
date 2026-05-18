import { generateRSS } from '@/lib/rss'

export async function GET() {
  const rss = await generateRSS('all')

  return new Response(rss, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
    },
  })
}
