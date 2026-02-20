import { createFileRoute } from '@tanstack/react-router'
import { auth } from '@/lib/auth'
import { runAgentTurn } from '@/lib/agent'

interface ChatRequestBody {
  message?: string
  history?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

export const Route = createFileRoute('/api/agent/chat')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({ headers: request.headers })

        if (!session) {
          return new Response('Unauthorized', { status: 401 })
        }

        try {
          const body = (await request.json()) as ChatRequestBody

          if (!body.message || body.message.trim().length === 0) {
            return Response.json({ error: 'Message is required' }, { status: 400 })
          }

          const result = await runAgentTurn({
            userId: session.user.id,
            message: body.message.trim(),
            history: body.history || [],
          })

          return Response.json({
            reply: result.text,
            toolCalls: result.toolCalls,
          })
        } catch (error) {
          console.error('Agent chat error:', error)
          return Response.json({ error: 'Internal Server Error' }, { status: 500 })
        }
      },
    },
  },
})
