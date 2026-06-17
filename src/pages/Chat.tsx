import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Send, Bot, User, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { streamAgentChat, type DisplayMessage } from '@/lib/skipAi'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'

export default function Chat() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Olá! Sou o Assistente DoctorID. Como posso ajudar com suas escalas hoje?',
      created: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return
      try {
        const history = await pb.collection('historico_consultas').getFullList({
          sort: 'created',
        })
        if (history.length > 0) {
          const loaded: DisplayMessage[] = [
            {
              id: 'welcome',
              role: 'assistant',
              content: 'Olá! Sou o Assistente DoctorID. Como posso ajudar com suas escalas hoje?',
              created: new Date().toISOString(),
            },
          ]
          history.forEach((h) => {
            loaded.push({
              id: h.id + '_q',
              role: 'user',
              content: h.pergunta,
              created: h.created,
            })
            if (h.resposta) {
              loaded.push({
                id: h.id + '_a',
                role: 'assistant',
                content: h.resposta,
                created: h.created,
              })
            }
          })
          setMessages(loaded)
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadHistory()
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const res = await pb.send('/backend/v1/shifts/sync', { method: 'POST' })
      toast({
        title: 'Sincronização concluída',
        description: `${res.synced} escalas integradas à inteligência com sucesso.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro na sincronização',
        description: err.message || 'Não foi possível sincronizar as escalas.',
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userText = input.trim()
    setInput('')

    const userMsg: DisplayMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      created: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    const controller = new AbortController()
    abortControllerRef.current = controller

    const assistantMsgId = (Date.now() + 1).toString()

    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        created: new Date().toISOString(),
      },
    ])

    try {
      const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/ask-doctor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token },
        body: JSON.stringify({ message: userText, conversation_id: conversationId }),
        signal: controller.signal,
      })

      const result = await streamAgentChat(res, {
        onChunk: (delta, full) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, content: full } : m)),
          )
        },
        signal: controller.signal,
      })

      setConversationId(res.headers.get('X-Conversation-Id') ?? result.conversation_id)

      if (user) {
        pb.collection('historico_consultas')
          .create({
            user_id: user.id,
            pergunta: userText,
            resposta: result.content,
          })
          .catch(console.error)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      toast({
        title: 'Erro de comunicação',
        description: err.message || 'Não foi possível conectar ao assistente. Tente novamente.',
        variant: 'destructive',
      })
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId && !m.content
            ? { ...m, content: 'Desculpe, ocorreu um erro ao processar sua solicitação.' }
            : m,
        ),
      )
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full max-w-4xl mx-auto">
      <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Assistente IA</h2>
          <p className="text-muted-foreground">
            Tire dúvidas em linguagem natural sobre escalas e plantões.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
          className="shadow-sm"
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sincronizar Escalas
        </Button>
      </div>

      <Card className="flex-1 flex flex-col border-0 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-3 max-w-[85%]',
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : '',
              )}
            >
              <Avatar className="h-8 w-8 mt-1 border border-border shrink-0">
                {msg.role === 'assistant' ? (
                  <>
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </>
                ) : (
                  <>
                    <AvatarImage src="https://img.usecurling.com/ppl/thumbnail?gender=female&seed=2" />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </>
                )}
              </Avatar>
              <div
                className={cn(
                  'flex flex-col gap-1',
                  msg.role === 'user' ? 'items-end' : 'items-start',
                )}
              >
                <div
                  className={cn(
                    'rounded-2xl px-4 py-2.5 text-sm md:text-base whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted text-foreground rounded-tl-sm border border-border/50',
                  )}
                >
                  {msg.content ||
                    (msg.role === 'assistant' &&
                    isLoading &&
                    msg.id === messages[messages.length - 1].id ? (
                      <span className="animate-pulse flex items-center h-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </span>
                    ) : (
                      ''
                    ))}
                </div>
                <span className="text-[10px] text-muted-foreground px-1">
                  {formatTime(msg.created)}
                </span>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border">
          <form onSubmit={handleSend} className="flex gap-2 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre plantões e médicos da escala..."
              className="h-12 pl-4 pr-12 rounded-full border-border/50 bg-white focus-visible:ring-primary shadow-sm"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-1 top-1 h-10 w-10 rounded-full hover:scale-105 transition-transform"
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
