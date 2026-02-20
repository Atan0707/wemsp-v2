import { FormEvent, useEffect, useMemo, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type ChatMessage = {
  id?: string
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt?: string
}

export function AssistantFloatingChat() {
  const [open, setOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        const existing = await fetch('/api/agent/conversations')
        if (!existing.ok) throw new Error('Unable to load conversations')
        const existingData = await existing.json()
        const latest = existingData?.conversations?.[0]

        if (latest?.id) {
          setConversationId(latest.id)
          const historyRes = await fetch(`/api/agent/conversations/${latest.id}`)
          if (historyRes.ok) {
            const historyData = await historyRes.json()
            const parsed = (historyData?.messages || []).filter((m: ChatMessage) => m.role !== 'SYSTEM')
            setMessages(parsed)
          }
        } else {
          const createdRes = await fetch('/api/agent/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'New chat' }),
          })

          if (!createdRes.ok) throw new Error('Unable to create conversation')
          const created = await createdRes.json()
          setConversationId(created?.conversation?.id || null)
        }
      } catch (error) {
        console.error(error)
      } finally {
        setIsBootstrapping(false)
      }
    }

    init()
  }, [])

  const greeting = useMemo(
    () => messages.length === 0,
    [messages.length]
  )

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const message = input.trim()
    if (!message || !conversationId || isSending) return

    setInput('')
    setIsSending(true)
    setMessages((prev) => [...prev, { role: 'USER', content: message }])

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationId,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send message')
      }

      setMessages((prev) => [...prev, { role: 'ASSISTANT', content: data.reply || 'No reply generated.' }])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ASSISTANT',
          content: error instanceof Error ? error.message : 'Something went wrong.',
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {open ? (
        <Card className="w-[360px] shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">WEMSP Assistant</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-[320px] overflow-y-auto rounded-md border p-3 space-y-2">
              {isBootstrapping ? (
                <div className="text-sm text-muted-foreground">Loading conversation...</div>
              ) : (
                <>
                  {greeting && (
                    <div className="rounded-md bg-muted p-2 text-sm">
                      Hi! Ask me about agreements, family members, or assets.
                    </div>
                  )}
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`rounded-md p-2 text-sm ${
                        message.role === 'USER'
                          ? 'ml-auto max-w-[85%] bg-primary text-primary-foreground'
                          : 'mr-auto max-w-[85%] bg-muted'
                      }`}
                    >
                      {message.content}
                    </div>
                  ))}
                </>
              )}
            </div>

            <form className="flex gap-2" onSubmit={onSubmit}>
              <Input
                disabled={isSending || isBootstrapping}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question..."
              />
              <Button type="submit" disabled={isSending || isBootstrapping || !input.trim()}>
                Send
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button className="rounded-full h-12 w-12 p-0 shadow-lg" onClick={() => setOpen(true)}>
          <MessageCircle className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
