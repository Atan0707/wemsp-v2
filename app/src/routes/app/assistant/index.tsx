import { FormEvent, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export const Route = createFileRoute('/app/assistant/')({
  component: AssistantRoute,
})

function AssistantRoute() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hi, I am your WEMSP assistant. Ask me how the app works, or ask me to list your agreements, assets, or family members.',
    },
  ])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  const history = useMemo(() => messages.slice(0, -1), [messages])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const message = input.trim()
    if (!message || isSending) return

    setInput('')
    setIsSending(true)
    setMessages((prev) => [...prev, { role: 'user', content: message }])

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history,
          message,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send message')
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || 'No reply generated.' }])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Something went wrong.',
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Assistant (LangChain Starter)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-h-[500px] space-y-2 overflow-y-auto rounded-lg border p-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-md p-3 text-sm ${
                  message.role === 'user'
                    ? 'ml-auto max-w-[85%] bg-primary text-primary-foreground'
                    : 'mr-auto max-w-[85%] bg-muted'
                }`}
              >
                {message.content}
              </div>
            ))}
          </div>

          <form className="flex gap-2" onSubmit={onSubmit}>
            <Input
              disabled={isSending}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about WEMSP..."
              value={input}
            />
            <Button disabled={isSending || !input.trim()} type="submit">
              {isSending ? 'Sending...' : 'Send'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
