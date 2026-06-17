import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import {
  Send,
  Bot,
  User,
  Loader2,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { useLocation } from 'react-router-dom'

export interface DisplayMessage {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: string
  created: string
  onRetry?: () => void
}

const DUMMY_QUESTIONS = [
  'Quais são os meus próximos plantões?',
  'Quem está escalado para a UTI pediátrica amanhã?',
  'Quais plantões estão disponíveis no final de semana?',
]

const MAX_RETRIES = 3
const RETRY_DELAYS = [2000, 4000, 8000]

const formatInline = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

const renderMarkdown = (text: string) => {
  const blocks = text.split('\n\n').filter(Boolean)
  return blocks.map((block, i) => {
    if (block.trim().toUpperCase().startsWith('ALERTA:')) {
      return (
        <Alert
          key={i}
          variant="destructive"
          className="my-2 bg-destructive/10 text-destructive border-destructive/20 p-3"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="ml-2 font-bold">Alerta</AlertTitle>
          <AlertDescription className="ml-2 mt-1 block">
            {formatInline(block.replace(/^ALERTA:\s*/i, ''))}
          </AlertDescription>
        </Alert>
      )
    }

    const lines = block.split('\n')
    if (lines.length > 0 && lines.every((line) => line.trim().match(/^[-*]\s/))) {
      return (
        <ul key={i} className="list-disc pl-5 my-2 space-y-1">
          {lines.map((line, j) => (
            <li key={j}>{formatInline(line.replace(/^[-*]\s*/, ''))}</li>
          ))}
        </ul>
      )
    }

    return (
      <p key={i} className="my-2 leading-relaxed">
        {formatInline(block)}
      </p>
    )
  })
}

export default function Chat() {
  const { user } = useAuth()
  const location = useLocation()
  const initialMessage = location.state?.initialMessage as string | undefined
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return
      try {
        const history = await pb.collection('historico_consultas').getList(1, 50, {
          sort: '-created',
        })
        const loaded: DisplayMessage[] = []
        history.items.reverse().forEach((h) => {
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
      } catch (err) {
        console.error(err)
      } finally {
        setIsInitialLoad(false)
      }
    }
    loadHistory()
  }, [user])

  useEffect(() => {
    if (initialMessage && !isInitialLoad) {
      setInput(initialMessage)
      window.history.replaceState({}, document.title)
    }
  }, [initialMessage, isInitialLoad])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

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
        description: `${res.syncedShifts || 0} escalas integradas à inteligência com sucesso.`,
      })
    } catch (err: any) {
      const isAuthError = err.status === 401 || err.status === 403
      const errMsg = isAuthError
        ? 'Token DUUID expirado ou inválido. Atualize o DUUID_TOKEN.'
        : err.response?.error || err.message || 'Não foi possível sincronizar os dados.'
      toast({
        title: isAuthError ? 'Autenticação Necessária' : 'Erro na sincronização',
        description: errMsg,
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/doctor-id/test-connection`,
        {
          headers: { Authorization: pb.authStore.token },
        },
      )
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          toast({
            title: 'Erro de Autenticação',
            description:
              'Token DUUID expirado ou inválido. Por favor, atualize o segredo DUUID_TOKEN.',
            variant: 'destructive',
          })
        } else {
          throw new Error(data.error || 'Falha ao testar conexão.')
        }
      } else {
        toast({
          title: 'Conexão Bem Sucedida',
          description: 'A API Doctor ID está acessível e respondendo corretamente.',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro de Conexão',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsTesting(false)
    }
  }

  const fetchWithRetry = async (
    text: string,
    signal: AbortSignal,
    retryCount = 0,
  ): Promise<any> => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/chat-orquestrador`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token },
          body: JSON.stringify({ message: text }),
          signal,
        },
      )

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))

        // Não re-tentar erros do cliente (ex: autenticação, chaves inválidas, rate limits da OpenAI)
        if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 429) {
          throw new Error(
            errorData.error || 'Erro de autenticação, limite de uso ou requisição inválida.',
          )
        }

        // Retry para OpenAI 502, 503, etc Errors
        if (res.status >= 500 && res.status <= 504) {
          if (retryCount < MAX_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[retryCount]))
            if (signal.aborted) throw new Error('Aborted')
            return fetchWithRetry(text, signal, retryCount + 1)
          }
        }

        throw new Error(
          errorData.error ||
            'Serviço temporariamente indisponível. Tente novamente em alguns instantes.',
        )
      }

      return res.json()
    } catch (err: any) {
      if (err.name === 'TypeError' || err.message === 'Failed to fetch') {
        if (retryCount < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[retryCount]))
          if (signal.aborted) throw new Error('Aborted')
          return fetchWithRetry(text, signal, retryCount + 1)
        }
        throw new Error(
          'Serviço temporariamente indisponível. Tente novamente em alguns instantes.',
        )
      }
      throw err
    }
  }

  const handleSend = async (eOrText?: React.FormEvent | string) => {
    if (eOrText && typeof eOrText !== 'string') {
      eOrText.preventDefault()
    }

    const text = typeof eOrText === 'string' ? eOrText : input

    if (!text.trim() || isLoading) return

    setInput('')
    setIsLoading(true)

    const userMsgId = Date.now().toString()
    const userMsg: DisplayMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      created: new Date().toISOString(),
    }

    // Remove eventuais mensagens de erro anteriores para manter limpo
    setMessages((prev) => [...prev.filter((m) => m.role !== 'error'), userMsg])

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const data = await fetchWithRetry(text, controller.signal)

      const assistantMsg: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        created: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: any) {
      if (err.message === 'Aborted') return

      const errorMsg: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        role: 'error',
        content: err.message,
        created: new Date().toISOString(),
        onRetry: () => handleSend(text),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full max-w-4xl mx-auto">
      <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Assistente Inteligente</h2>
          <p className="text-muted-foreground">
            Tire dúvidas em linguagem natural sobre escalas, horários e médicos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={isTesting || isSyncing}
            className="shadow-sm"
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Testar Conexão
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing || isTesting}
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
      </div>

      <Card className="flex-1 flex flex-col border-0 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm relative">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isInitialLoad && (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
            </div>
          )}

          {!isInitialLoad && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-xl font-semibold">Como posso ajudar?</h3>
                <p className="text-muted-foreground">
                  Sou seu assistente virtual para escalas médicas. Pergunte sobre horários,
                  especialidades ou disponibilidade de plantões.
                </p>
              </div>
              <div className="grid gap-3 w-full max-w-md mt-4">
                {DUMMY_QUESTIONS.map((q, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="justify-start h-auto py-3 px-4 text-left whitespace-normal hover:bg-primary/5 transition-colors"
                    onClick={() => handleSend(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {!isInitialLoad &&
            messages.map((msg) => {
              if (msg.role === 'error') {
                return (
                  <div
                    key={msg.id}
                    className="flex gap-3 max-w-[85%] animate-in fade-in duration-300"
                  >
                    <Avatar className="h-8 w-8 mt-1 border border-destructive/20 shrink-0">
                      <AvatarFallback className="bg-destructive/10 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-2 items-start w-full">
                      <div className="bg-destructive/10 text-destructive rounded-2xl rounded-tl-sm border border-destructive/20 px-4 py-2.5 text-sm md:text-base">
                        {msg.content}
                      </div>
                      {msg.onRetry && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={msg.onRetry}
                          className="text-xs h-8 hover:bg-destructive/5"
                        >
                          <RefreshCw className="w-3 h-3 mr-2" />
                          Tentar novamente
                        </Button>
                      )}
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-3 max-w-[85%] animate-in fade-in duration-300',
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
                      {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                    </div>
                    <span className="text-[10px] text-muted-foreground px-1">
                      {formatTime(msg.created)}
                    </span>
                  </div>
                </div>
              )
            })}

          {isLoading && (
            <div className="flex gap-3 max-w-[85%] animate-in fade-in duration-300">
              <Avatar className="h-8 w-8 mt-1 border border-border shrink-0">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1 items-start">
                <div className="bg-muted text-foreground rounded-2xl rounded-tl-sm border border-border/50 px-4 py-4 flex items-center gap-1.5 h-11">
                  <span
                    className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border">
          <form onSubmit={handleSend} className="flex gap-2 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre escalas, plantões ou médicos"
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
