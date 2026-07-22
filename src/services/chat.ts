import pb from '@/lib/pocketbase/client'
import type { AgentMessage } from '@/lib/skipAi'

export interface ChatResponse {
  conversation_id: string
  content: string
  citations?: unknown[]
  message_id: string
}

export interface Conversation {
  id: string
  title?: string
  created: string
  updated: string
}

export interface DisplayableMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: unknown[]
  created?: string
}

export interface HistoricoRecord {
  id: string
  user_id: string
  conversation_id: string
  pergunta: string
  resposta: string
  created: string
  updated: string
}

export const sendChat = (message: string, conversationId?: string) =>
  pb.send('/backend/v1/chat', {
    method: 'POST',
    body: JSON.stringify({ message, conversation_id: conversationId || null }),
    headers: { 'Content-Type': 'application/json' },
  }) as Promise<ChatResponse>

export const streamChatUrl = `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/chat/stream`

export const getConversations = (limit = 20) =>
  pb.send(`/backend/v1/chat/conversations?limit=${limit}`, { method: 'GET' }) as Promise<
    Conversation[] | { items: Conversation[] }
  >

export const getMessages = (conversationId: string) =>
  pb.send(`/backend/v1/chat/conversations/${conversationId}/messages`, {
    method: 'GET',
  }) as Promise<{ messages: AgentMessage[] }>

export const saveHistorico = (
  userId: string,
  conversationId: string,
  pergunta: string,
  resposta: string,
) =>
  pb.collection('historico_consultas').create({
    user_id: userId,
    conversation_id: conversationId,
    pergunta,
    resposta,
  }) as Promise<HistoricoRecord>

export const getHistoricoByConversation = (conversationId: string) =>
  pb.collection('historico_consultas').getFullList({
    filter: `conversation_id = "${conversationId}"`,
    sort: 'created',
  }) as Promise<HistoricoRecord[]>
