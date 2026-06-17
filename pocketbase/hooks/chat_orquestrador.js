routerAdd(
  'POST',
  '/backend/v1/chat-orquestrador',
  (e) => {
    const body = e.requestInfo().body || {}
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')
    if (!body.message?.trim()) return e.badRequestError('message is required')

    const message = body.message.trim()

    // 1. Obter a chave de API da OpenAI
    const openAiKey = $secrets.get('OPEN_AI')
    if (!openAiKey) {
      return e.internalServerError(
        'A chave da API da OpenAI (OPEN_AI) não está configurada nos segredos do sistema.',
      )
    }

    // 2. Buscar dados reais das escalas e hospitais para contexto
    let shiftsData = []
    let hospitalsData = []

    try {
      const shifts = $app.findRecordsByFilter(
        'shifts',
        "status != 'cancelled'",
        '-start_time',
        100,
        0,
      )
      shiftsData = shifts.map((s) => ({
        doctor_name: s.getString('doctor_name'),
        location: s.getString('location'),
        start_time: s.getString('start_time'),
        end_time: s.getString('end_time'),
        status: s.getString('status'),
      }))
    } catch (err) {
      $app.logger().error('Erro ao buscar shifts para contexto', 'error', err.message)
    }

    try {
      const hospitals = $app.findRecordsByFilter('hospitals', 'ativo = true', 'nome', 100, 0)
      hospitalsData = hospitals.map((h) => ({
        nome: h.getString('nome'),
        endereco: h.getString('endereco'),
        cidade: h.getString('cidade'),
        estado: h.getString('estado'),
      }))
    } catch (err) {
      $app.logger().error('Erro ao buscar hospitais para contexto', 'error', err.message)
    }

    const contextJson = JSON.stringify({
      hospitals: hospitalsData,
      shifts: shiftsData,
    })

    // 3. Comunicação Direta com OpenAI
    let answer = ''
    try {
      const res = $http.send({
        url: 'https://api.openai.com/v1/chat/completions',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + openAiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                "Você é um assistente de escalas médicas inteligente. Responda à pergunta do usuário de forma clara, objetiva e em português, baseando-se EXCLUSIVAMENTE nos dados fornecidos abaixo em formato JSON. Não invente ou presuma informações. Se não souber ou a informação não estiver nos dados, diga claramente.\n\nREGRAS DE FORMATAÇÃO:\n- Coloque números, datas, e horários em **negrito**.\n- Use listas (- ou *) para enumerar múltiplos itens.\n- Se houver algum erro grave nos dados, inicie um parágrafo exatamente com a palavra 'ALERTA:'.\n\nDADOS REAIS DO SISTEMA EM JSON:\n" +
                contextJson,
            },
            {
              role: 'user',
              content: message,
            },
          ],
        }),
        timeout: 30,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        answer =
          res.json?.choices?.[0]?.message?.content ||
          'Não foi possível gerar uma resposta coerente com os dados.'
      } else {
        let errorMsg = 'Erro na comunicação com a API da OpenAI.'
        if (res.json?.error?.message) {
          errorMsg = res.json.error.message
        }
        return e.json(res.statusCode, { error: errorMsg })
      }
    } catch (err) {
      $app.logger().error('OpenAI API request failed', 'error', err.message)
      return e.internalServerError('Falha de comunicação ou timeout na API da OpenAI.')
    }

    // 4. Salvar log de histórico na base historico_consultas
    try {
      const histCol = $app.findCollectionByNameOrId('historico_consultas')
      const record = new Record(histCol)
      record.set('user_id', userId)
      record.set('pergunta', message)
      record.set('resposta', answer)
      $app.save(record)
    } catch (err) {
      $app.logger().error('Erro ao salvar historico_consultas', 'erro', err.message)
    }

    // 5. Retorno ao frontend
    return e.json(200, {
      content: answer,
    })
  },
  $apis.requireAuth(),
)
