import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'

type ChatMessage = {
  id?: string
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt?: string
}

type ConversationSummary = {
  id: string
  title: string | null
  updatedAt: string
  messageCount: number
}

const getStorageKey = (userId: string) => `wemsp-assistant:${userId}:ui-state`

export function AssistantFloatingChat() {
  const { data: sessionData } = authClient.useSession()
  const userId = sessionData?.user?.id

  const [open, setOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  const persistState = useCallback(
    (patch: Partial<{ open: boolean; conversationId: string | null }>) => {
      if (!userId || typeof window === 'undefined') return

      const key = getStorageKey(userId)
      const currentRaw = window.localStorage.getItem(key)
      const current = currentRaw ? JSON.parse(currentRaw) : {}
      const next = { ...current, ...patch }
      window.localStorage.setItem(key, JSON.stringify(next))
    },
    [userId]
  )

  const fetchConversations = useCallback(async () => {
    const response = await fetch('/api/agent/conversations')
    if (!response.ok) throw new Error('Unable to load conversations')

    const data = await response.json()
    const list = (data?.conversations || []) as ConversationSummary[]
    setConversations(list)
    return list
  }, [])

  const loadConversationMessages = useCallback(async (id: string) => {
    const historyRes = await fetch(`/api/agent/conversations/${id}`)
    if (!historyRes.ok) throw new Error('Unable to load conversation history')

    const historyData = await historyRes.json()
    const parsed = (historyData?.messages || []).filter((m: ChatMessage) => m.role !== 'SYSTEM')
    setMessages(parsed)
  }, [])

  const createNewConversation = useCallback(async () => {
    const createdRes = await fetch('/api/agent/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New chat' }),
    })

    if (!createdRes.ok) throw new Error('Unable to create conversation')

    const created = await createdRes.json()
    const id = created?.conversation?.id as string | undefined

    if (!id) throw new Error('Conversation id missing')

    await fetchConversations()
    setConversationId(id)
    setMessages([])
    persistState({ conversationId: id })
    return id
  }, [fetchConversations, persistState])

  useEffect(() => {
    if (!userId) return

    const init = async () => {
      try {
        const list = await fetchConversations()

        const savedRaw = typeof window !== 'undefined' ? window.localStorage.getItem(getStorageKey(userId)) : null
        const saved = savedRaw ? JSON.parse(savedRaw) : null

        if (saved && typeof saved.open === 'boolean') {
          setOpen(saved.open)
        }

        const savedConversationId = saved?.conversationId as string | undefined
        const targetId =
          savedConversationId && list.some((item) => item.id === savedConversationId)
            ? savedConversationId
            : list[0]?.id

        if (targetId) {
          setConversationId(targetId)
          await loadConversationMessages(targetId)
          persistState({ conversationId: targetId })
        } else {
          await createNewConversation()
        }
      } catch (error) {
        console.error(error)
      } finally {
        setIsBootstrapping(false)
      }
    }

    init()
  }, [createNewConversation, fetchConversations, loadConversationMessages, persistState, userId])

  const onSelectConversation = async (id: string) => {
    if (!id || id === conversationId) return

    setConversationId(id)
    persistState({ conversationId: id })
    await loadConversationMessages(id)
  }

  const onToggleOpen = (next: boolean) => {
    setOpen(next)
    persistState({ open: next })
  }

  const greeting = useMemo(() => messages.length === 0 && !isBootstrapping, [messages.length, isBootstrapping])

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
        body: JSON.stringify({ message, conversationId }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to send message')

      setMessages((prev) => [...prev, { role: 'ASSISTANT', content: data.reply || 'No reply generated.' }])
      await fetchConversations()
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'ASSISTANT', content: error instanceof Error ? error.message : 'Something went wrong.' },
      ])
    } finally {
      setIsSending(false)
    }
  }

  if (!userId) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <Card className="w-[380px] shadow-2xl">
          <CardHeader className="pb-3">
            <div className="mb-2 flex items-center justify-between">
              <CardTitle className="text-base">WEMSP Assistant</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => onToggleOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <select
                className="h-9 flex-1 rounded-md border bg-background px-2 text-sm"
                value={conversationId ?? ''}
                onChange={(e) => onSelectConversation(e.target.value)}
                disabled={isBootstrapping}
              >
                {conversations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c.title || 'Untitled chat').slice(0, 40)}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={createNewConversation}
                disabled={isBootstrapping || isSending}
              >
                New
              </Button>
            </div>
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
        <Button className="rounded-full h-12 w-12 p-0 shadow-lg" onClick={() => onToggleOpen(true)}>
          <MessageCircle className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
