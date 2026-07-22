routerAdd(
  'POST',
  '/backend/v1/chat/stream',
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

      let plantoes = []
      try {
        plantoes = $app.findRecordsByFilter('plantoes', '', '-horarioInicioFormatado_data', 50, 0)
      } catch (_) {}

      let ctx = 'Data/hora atual (São Paulo): ' + fmtDate(spTime) + '\n'
      ctx += 'Amanhã: ' + fmtDate(tomorrow) + '\n\n'
      ctx += 'Plantões (' + plantoes.length + '):\n'
      for (const p of plantoes) {
        ctx += '- ' + (p.getString('pessoaNome') || 'N/A')
        ctx += ' | ' + (p.getString('instituicaoNome') || 'N/A')
        ctx += ' | ' + (p.getString('especialidadeNome') || 'N/A')
        ctx += ' | Início: ' + (p.getString('horarioInicioFormatado_data') || 'N/A')
        ctx += ' | Término: ' + (p.getString('horarioTerminoFormatado_data') || 'N/A')
        ctx += ' | Tipo: ' + (p.getString('tipoPlantaoNome') || 'N/A')
        ctx += '\n'
      }

      const enhancedMessage = body.message + '\n\n--- Contexto do Sistema ---\n' + ctx

      const conv = $ai.agent('doctor-assistant').getOrCreateConversation({
        user_id: userId,
        id: body.conversation_id || null,
      })

      const iter = $ai.agent('doctor-assistant').chat({
        user_id: userId,
        conversation_id: conv.id,
        message: enhancedMessage,
        stream: true,
      })

      e.response.header().set('Content-Type', 'text/event-stream')
      e.response.header().set('Cache-Control', 'no-cache')
      e.response.header().set('X-Conversation-Id', conv.id)

      $response.stream(e, iter)
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
