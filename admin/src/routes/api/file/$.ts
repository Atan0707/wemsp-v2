import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/file/$')({
  server: {
    handlers: {
      GET: async ({ params, request }: { params: { _splat: string }; request: Request }) => {
        const key = params._splat

        if (!key) {
          return new Response('No file path provided', { status: 400 })
        }

        const appBaseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000'
        const targetUrl = `${appBaseUrl.replace(/\/$/, '')}/api/file/${key}`

        try {
          const upstream = await fetch(targetUrl, {
            method: 'GET',
            headers: {
              // Pass range headers through for PDFs/media previews
              ...(request.headers.get('range')
                ? { range: request.headers.get('range') as string }
                : {}),
            },
          })

          return new Response(upstream.body, {
            status: upstream.status,
            headers: upstream.headers,
          })
        } catch (error) {
          console.error('Error proxying file request:', error)
          return new Response('Failed to fetch file', { status: 500 })
        }
      },
    },
  },
})
