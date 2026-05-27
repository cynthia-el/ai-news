import { NextRequest } from 'next/server'
import { runSync } from '@/lib/sync'

export async function POST(request: NextRequest) {
  try {
    const result = await runSync()
    return Response.json(result)
  } catch (error) {
    const message = (error as Error).message
    return Response.json({ error: message }, { status: 500 })
  }
}
