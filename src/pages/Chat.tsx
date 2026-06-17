import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Send, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: number
  text: string
  sender: 'ai' | 'user'
  time: string
}

const initialMessages: Message[] = [
  {
    id: 1,
    text: 'Olá! Sou o assistente inteligente M Doctors. Como posso ajudar com suas escalas hoje?',
    sender: 'ai',
    time: '09:00',
  },
  {
    id: 2,
    text: 'Gostaria de saber quem está no plantão da UTI hoje à noite.',
    sender: 'user',
    time: '09:02',
  },
  {
    id: 3,
    text: 'Hoje à noite, o plantão da UTI será coberto pelo Dr. Roberto Santos das 19h às 07h. Deseja enviar uma mensagem para ele?',
    sender: 'ai',
    time: '09:02',
  },
]

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg: Message = {
      id: Date.now(),
      text: input,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')

    // Mock AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: 'Processando sua solicitação... Essa funcionalidade será conectada ao banco de dados em breve.',
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    }, 1000)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full max-w-4xl mx-auto">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tight">Chat Inteligente</h2>
        <p className="text-muted-foreground">
          Assistente operacional para consultas rápidas sobre plantões.
        </p>
      </div>

      <Card className="flex-1 flex flex-col border-0 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-3 max-w-[85%]',
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : '',
              )}
            >
              <Avatar className="h-8 w-8 mt-1 border border-border shrink-0">
                {msg.sender === 'ai' ? (
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
                  msg.sender === 'user' ? 'items-end' : 'items-start',
                )}
              >
                <div
                  className={cn(
                    'rounded-2xl px-4 py-2.5 text-sm md:text-base',
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted text-foreground rounded-tl-sm border border-border/50',
                  )}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-muted-foreground px-1">{msg.time}</span>
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
              placeholder="Digite sua dúvida sobre a escala..."
              className="h-12 pl-4 pr-12 rounded-full border-border/50 bg-white focus-visible:ring-primary shadow-sm"
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-1 top-1 h-10 w-10 rounded-full hover:scale-105 transition-transform"
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
