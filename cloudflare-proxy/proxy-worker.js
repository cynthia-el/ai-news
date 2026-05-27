export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    const targetHost = env.TARGET_HOST
    if (!targetHost) {
      return new Response(
        'TARGET_HOST not configured. Please set TARGET_HOST in Cloudflare Dashboard → Workers → ai-news-proxy → Settings → Variables.\n\nExample: your-app.vercel.app',
        { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } }
      )
    }

    url.hostname = targetHost
    url.protocol = 'https'

    const response = await fetch(url.toString(), request)

    const contentType = response.headers.get('content-type') || ''
    const isStatic =
      contentType.includes('css') ||
      contentType.includes('javascript') ||
      contentType.includes('image') ||
      url.pathname.startsWith('/_next/static/')

    if (isStatic) {
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    }

    return response
  },
}
