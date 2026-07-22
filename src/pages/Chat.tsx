import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Plus, MessageSquare, Loader2, Bot, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { streamAgentChat, displayableMessages } from '@/lib/skipAi'
import pb from '@/lib/pocketbase/client'
import {
  getConversations,
  getMessages,
  streamChatUrl,
  type Conversation,
  type DisplayableMessage,
} from '@/services/chat'

function formatConversationDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  if (diffHours < 24) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffDays < 48) return 'Ontem'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConvId, setCurrentConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DisplayableMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [loadingConv, setLoadingConv] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadConversations = useCallback(async () => {
    setLoadingConv(true)
    try {
      const res = await getConversations()
      const list = Array.isArray(res) ? res : (res as { items: Conversation[] }).items || []
      setConversations(list)
    } catch (err) {
      console.error('[Chat] Failed to load conversations:', err)
      setConversations([])
    } finally {
      setLoadingConv(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true)
    try {
      const res = await getMessages(convId)
      const msgs = displayableMessages(res.messages || [])
      setMessages(msgs as DisplayableMessage[])
    } catch (err) {
      console.error(`[Chat] Failed to load messages for conversation ${convId}:`, err)
      setMessages([])
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  useEffect(() => {
    if (currentConvId) loadMessages(currentConvId)
    else setMessages([])
  }, [currentConvId, loadMessages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    const userMsg: DisplayableMessage = { id: `u-${Date.now()}`, role: 'user', content: text }
    const assistantMsg: DisplayableMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: '',
    }
    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setIsStreaming(true)
    const controller = new AbortController()
    abortRef.current = controller
    let headerConvId: string | null = null
    try {
      const res = await fetch(streamChatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token || '' },
        body: JSON.stringify({ message: text, conversation_id: currentConvId }),
        signal: controller.signal,
      })
      headerConvId = res.headers.get('X-Conversation-Id')
      const result = await streamAgentChat(res, {
        onChunk: (_delta, full) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: full } : m)),
          )
        },
        signal: controller.signal,
      })
      if (result.content) {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: result.content } : m)),
        )
      }
      const resolvedConvId = result.conversation_id || headerConvId
      if (!currentConvId && resolvedConvId) {
        setCurrentConvId(resolvedConvId)
      }
      loadConversations()
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('[Chat] Failed to send message:', err)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: 'Erro ao processar a mensagem. Tente novamente.' }
              : m,
          ),
        )
        if (!currentConvId && headerConvId) {
          setCurrentConvId(headerConvId)
        }
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }

  const handleNewChat = () => {
    if (isStreaming) {
      abortRef.current?.abort()
    }
    setCurrentConvId(null)
    setMessages([])
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <div className="hidden md:flex w-64 flex-col border-r bg-muted/30 shrink-0">
        <div className="p-3">
          <Button onClick={handleNewChat} className="w-full" variant="outline">
            <Plus className="h-4 w-4 mr-2" /> Nova Conversa
          </Button>
        </div>
        <ScrollArea className="flex-1 px-2">
          {loadingConv ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma conversa ainda</p>
          ) : (
            <div className="space-y-1 pb-2">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCurrentConvId(c.id)}
                  className={cn(
                    'w-full flex flex-col gap-1 rounded-lg px-3 py-2 text-sm text-left transition-colors hover:bg-muted',
                    currentConvId === c.id && 'bg-muted',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1 font-medium">
                      {c.title || 'Nova conversa'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 pl-6 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatConversationDate(c.updated || c.created)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              <div className="rounded-full bg-primary/10 p-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground text-lg font-medium">Assistente DoctorID</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Pergunte sobre escalas, plantões, horários e muito mais. O assistente tem
                consciência temporal em tempo real.
              </p>
            </div>
          ) : loadingMsgs ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={cn('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {m.role === 'assistant' && (
                  <div className="rounded-full bg-primary/10 p-2 shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[75%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words',
                    m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted',
                  )}
                >
                  {m.content || (isStreaming && m.role === 'assistant' ? '...' : '')}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t p-4 shrink-0">
          <div className="flex gap-2 max-w-3xl mx-auto items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              className="resize-none min-h-[44px] max-h-32"
              rows={1}
              disabled={isStreaming}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              size="icon"
              className="shrink-0 h-[44px] w-[44px]"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
