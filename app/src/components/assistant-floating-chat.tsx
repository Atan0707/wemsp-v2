import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Loader2, MessageCircle, Plus, SendHorizontal, Sparkles, User2, X } from 'lucide-react'
import type { FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import { useLanguage } from '@/lib/i18n/context'

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
const readPersistedState = (key: string) => {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as { open?: boolean; conversationId?: string }) : null
  } catch {
    return null
  }
}

export function AssistantFloatingChat() {
  const { language, t } = useLanguage()
  const { data: sessionData } = authClient.useSession()
  const userId = sessionData?.user.id

  const [open, setOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Array<ConversationSummary>>([])
  const [messages, setMessages] = useState<Array<ChatMessage>>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)

  const persistState = useCallback(
    (patch: Partial<{ open: boolean; conversationId: string | null }>) => {
      if (!userId || typeof window === 'undefined') return

      const key = getStorageKey(userId)
      const current = readPersistedState(key) || {}
      const next = { ...current, ...patch }
      window.localStorage.setItem(key, JSON.stringify(next))
    },
    [userId]
  )

  const fetchConversations = useCallback(async () => {
    const response = await fetch('/api/agent/conversations')
    if (!response.ok) throw new Error('Unable to load conversations')

    const data = (await response.json()) as { conversations?: Array<ConversationSummary> }
    const list = data.conversations || []
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
    setIsCreatingConversation(true)
    try {
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
    } finally {
      setIsCreatingConversation(false)
    }
  }, [fetchConversations, persistState])

  useEffect(() => {
    if (!userId) return

    const init = async () => {
      try {
        const list = await fetchConversations()

        const saved = readPersistedState(getStorageKey(userId))

        if (saved && typeof saved.open === 'boolean') {
          setOpen(saved.open)
        }

        const savedConversationId = saved?.conversationId
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

  useEffect(() => {
    if (!open || !messagesContainerRef.current) return
    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
  }, [messages, open, isBootstrapping, conversationId])

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

  const onCreateConversation = async () => {
    try {
      await createNewConversation()
    } catch (error) {
      console.error(error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'ASSISTANT',
          content: t('assistantChat.errors.createConversation'),
        },
      ])
    }
  }

  const greeting = useMemo(() => messages.length === 0 && !isBootstrapping, [messages.length, isBootstrapping])
  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === conversationId) || null,
    [conversationId, conversations]
  )
  const quickPrompts = [
    t('assistantChat.quickPrompts.agreementStatus'),
    t('assistantChat.quickPrompts.familySummary'),
    t('assistantChat.quickPrompts.assetsReview'),
  ]
  const getConversationLabel = useCallback(
    (title: string | null | undefined) => {
      if (!title || title === 'New chat') return t('assistantChat.newChatFallback')
      return title
    },
    [t]
  )
  const conversationWord =
    conversations.length === 1
      ? t('assistantChat.conversationSingular')
      : t('assistantChat.conversationPlural')
  const isInputDisabled = isSending || isBootstrapping || isCreatingConversation

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
        body: JSON.stringify({ message, conversationId, language }),
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
    <div className="fixed bottom-3 right-3 z-50 sm:bottom-5 sm:right-5">
      {open ? (
        <Card className="w-[calc(100vw-1.5rem)] max-w-[420px] overflow-hidden border-border/70 shadow-2xl">
          <CardHeader className="space-y-3 border-b border-border/70 bg-gradient-to-r from-sky-50 via-background to-emerald-50 pb-3 dark:from-sky-950/30 dark:to-emerald-950/20">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <CardTitle className="text-base font-semibold leading-none">{t('assistantChat.title')}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {getConversationLabel(selectedConversation?.title)} • {conversations.length} {conversationWord}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onToggleOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-9 flex-1 rounded-xl border border-border/70 bg-background/90 px-3 text-sm shadow-sm"
                value={conversationId ?? ''}
                onChange={(e) => onSelectConversation(e.target.value)}
                disabled={isBootstrapping || isCreatingConversation}
              >
                {conversations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {getConversationLabel(c.title).slice(0, 40)} ({c.messageCount})
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl px-3"
                onClick={onCreateConversation}
                disabled={isBootstrapping || isSending || isCreatingConversation}
              >
                {isCreatingConversation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div
              ref={messagesContainerRef}
              className="h-[360px] overflow-y-auto bg-muted/25 p-3 sm:h-[400px]"
            >
              {isBootstrapping ? (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('assistantChat.loadingConversation')}
                </div>
              ) : (
                <div className="space-y-3">
                  {greeting && (
                    <div className="rounded-2xl border border-dashed border-primary/30 bg-background/90 p-3 text-sm shadow-sm">
                      <p className="font-medium text-foreground">{t('assistantChat.greetingTitle')}</p>
                      <p className="mt-1 text-muted-foreground">{t('assistantChat.greetingDescription')}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {quickPrompts.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
                            onClick={() => setInput(prompt)}
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`flex ${message.role === 'USER' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`flex max-w-[90%] items-start gap-2 ${
                          message.role === 'USER' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${
                            message.role === 'USER' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {message.role === 'USER' ? (
                            <User2 className="h-3.5 w-3.5" />
                          ) : (
                            <Bot className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div
                          className={`rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
                            message.role === 'USER'
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border/70 bg-background'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isSending && (
                    <div className="flex justify-start">
                      <div className="flex max-w-[70%] items-start gap-2">
                        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Bot className="h-3.5 w-3.5" />
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm">
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {t('assistantChat.thinking')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <form className="space-y-2 border-t border-border/70 bg-background p-3" onSubmit={onSubmit}>
              <div className="flex gap-2">
                <Input
                  disabled={isInputDisabled}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('assistantChat.inputPlaceholder')}
                  className="h-10 rounded-xl"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10 rounded-xl"
                  disabled={isInputDisabled || !input.trim()}
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('assistantChat.enterHint')}</p>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button
          className="relative h-14 w-14 rounded-2xl p-0 shadow-lg ring-4 ring-primary/15 transition-transform hover:scale-[1.03]"
          onClick={() => onToggleOpen(true)}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="absolute -right-1.5 -top-1.5 rounded-full bg-background px-1.5 py-0.5 text-[10px] font-semibold text-primary shadow">
            AI
          </span>
        </Button>
      )}
    </div>
  )
}
