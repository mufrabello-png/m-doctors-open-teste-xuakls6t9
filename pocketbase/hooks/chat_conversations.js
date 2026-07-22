routerAdd(
  'GET',
  '/backend/v1/chat/conversations',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('auth required')
      const limit = parseInt(e.requestInfo().query?.limit || '20', 10) || 20
      const result = $ai
        .agent('doctor-assistant')
        .listConversations({ user_id: userId, limit: limit })
      return e.json(200, result)
    } catch (err) {
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, { error: status >= 500 ? 'Falha ao listar conversas' : err.message })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
