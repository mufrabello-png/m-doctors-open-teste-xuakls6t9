routerAdd(
  'POST',
  '/backend/v1/chat',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('auth required')
      if (!body.message?.trim()) return e.badRequestError('message is required')

      const now = new Date()
      const spTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
      const tomorrow = new Date(spTime)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const pad = (n) => String(n).padStart(2, '0')
      const fmtDate = (d) =>
        d.getFullYear() +
        '-' +
        pad(d.getMonth() + 1) +
        '-' +
        pad(d.getDate()) +
        ' ' +
        pad(d.getHours()) +
        ':' +
        pad(d.getMinutes())

      const isoToday =
        spTime.getFullYear() + '-' + pad(spTime.getMonth() + 1) + '-' + pad(spTime.getDate())

      const isoTomorrow =
        tomorrow.getFullYear() + '-' + pad(tomorrow.getMonth() + 1) + '-' + pad(tomorrow.getDate())

      const dateContext =
        'DATA/HORA ATUAL DO SISTEMA (São Paulo, UTC-3): ' +
        fmtDate(spTime) +
        '\n' +
        'Data ISO de hoje: ' +
        isoToday +
        '\n' +
        'Data ISO de amanhã: ' +
        isoTomorrow +
        '\n' +
        'Dia da semana: ' +
        [
          'Domingo',
          'Segunda-feira',
          'Terça-feira',
          'Quarta-feira',
          'Quinta-feira',
          'Sexta-feira',
          'Sábado',
        ][spTime.getDay()] +
        '\n\n' +
        'Use as ferramentas de busca (plantoes, hospitals, shifts) para responder à pergunta abaixo. NÃO há limite de registros — busque com filtros apropriados no banco de dados completo.\n\nIMPORTANTE: As ferramentas retornam resultados paginados (máximo 500 por página). Você DEVE paginar usando os parâmetros page e perPage até esgotar TODOS os resultados. NUNCA trunque ou omita registros. Liste TODOS os registros encontrados na resposta.'

      const enhancedMessage = dateContext + '\n\n--- Pergunta do Usuário ---\n' + body.message

      const conv = $ai.agent('chat-orquestrador').getOrCreateConversation({
        user_id: userId,
        id: body.conversation_id || null,
        title: body.conversation_id ? '' : (body.message || '').substring(0, 60),
      })

      const result = $ai.agent('chat-orquestrador').chat({
        user_id: userId,
        conversation_id: conv.id,
        message: enhancedMessage,
      })

      try {
        const histCol = $app.findCollectionByNameOrId('historico_consultas')
        const histRecord = new Record(histCol)
        histRecord.set('user_id', userId)
        histRecord.set('pergunta', body.message)
        histRecord.set('resposta', result.content || '')
        $app.save(histRecord)
      } catch (_) {}

      return e.json(200, {
        conversation_id: result.conversation_id,
        content: result.content,
        citations: result.citations,
        message_id: result.message_id,
      })
    } catch (err) {
      if (err instanceof SkipAiConfigError)
        return e.json(503, { error: 'AI temporariamente indisponível' })
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'Falha na requisição do agente' : err.message,
        })
      }
      if (err instanceof SkipAiError) {
        const status = err.status || 502
        return e.json(status, {
          error: status >= 500 ? 'AI temporariamente indisponível' : err.message,
        })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
