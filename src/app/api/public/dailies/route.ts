import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const take = parseInt(searchParams.get('take') || '30')

  const dailies = await prisma.daily.findMany({
    orderBy: { date: 'desc' },
    take,
    select: {
      date: true,
      title: true,
      summary: true,
    },
  })

  const response = Response.json({ dailies })
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  return response
}
