routerAdd(
  'POST',
  '/backend/v1/chat-orquestrador',
  (e) => {
    const body = e.requestInfo().body || {}
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')
    if (!body.message?.trim()) return e.badRequestError('message is required')

    const message = body.message.trim()

    const openAiKey = $secrets.get('OPEN_AI')
    if (!openAiKey) {
      return e.internalServerError(
        'A chave da API da OpenAI (OPEN_AI) não está configurada nos segredos do sistema.',
      )
    }

    const tools = [
      {
        type: 'function',
        function: {
          name: 'get_plantoes',
          description:
            'Busca a lista de plantões (escalas médicas) armazenadas na base local do sistema.',
          parameters: {
            type: 'object',
            properties: {
              filtro: {
                type: 'string',
                description: 'Filtro opcional. Ex: nome do médico ou instituição.',
              },
            },
          },
        },
      },
    ]

    const messages = [
      {
        role: 'system',
        content:
          'Você é um assistente de escalas médicas. Ao ser questionado sobre plantões ou escalas, você DEVE priorizar a chamada da função `get_plantoes` para obter os dados do banco de dados local. Os dados retornados pela função são a sua ÚNICA "Source of Truth" (Fonte da Verdade). Não responda baseando-se em conhecimentos externos. Se não souber a resposta após buscar, diga claramente que não possui essa informação. Retorne números e horários em **negrito** e use listas para enumerar.',
      },
      {
        role: 'user',
        content: message,
      },
    ]

    let answer = ''
    try {
      let res = $http.send({
        url: 'https://api.openai.com/v1/chat/completions',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + openAiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          tools: tools,
          tool_choice: 'auto',
        }),
        timeout: 30,
      })

      if (res.statusCode >= 400) {
        return e.json(res.statusCode, { error: res.json?.error?.message || 'Erro OpenAI' })
      }

      let responseMessage = res.json?.choices?.[0]?.message

      if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
        messages.push(responseMessage)

        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.function.name === 'get_plantoes') {
            let plantoesData = []
            try {
              const plantoes = $app.findRecordsByFilter('plantoes', '', '-created', 100, 0)
              plantoesData = plantoes.map((p) => ({
                instituicaoNome: p.getString('instituicaoNome'),
                pessoaNome: p.getString('pessoaNome'),
                horarioProgramado: p.getString('horarioInicioFimProgramado'),
                diaDaSemana: p.getString('diaDaSemana'),
                statusProfissional: p.getString('statusProfissional'),
                pedidoSubstituicao: p.getString('pedidoSubstituicao'),
                valorFormatado: p.getString('valorFormatado'),
              }))
            } catch (err) {
              $app.logger().error('Erro ao buscar plantoes para ferramenta', 'error', err.message)
            }

            messages.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: 'get_plantoes',
              content: JSON.stringify(plantoesData),
            })
          }
        }

        res = $http.send({
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + openAiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: messages,
          }),
          timeout: 30,
        })

        if (res.statusCode >= 400) {
          return e.json(res.statusCode, {
            error: res.json?.error?.message || 'Erro OpenAI apos tool',
          })
        }
        answer =
          res.json?.choices?.[0]?.message?.content ||
          'Não foi possível gerar uma resposta coerente com os dados.'
      } else {
        answer = responseMessage?.content || 'Não foi possível processar a requisição.'
      }
    } catch (err) {
      return e.internalServerError('Falha de comunicação ou timeout na API da OpenAI.')
    }

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

    return e.json(200, {
      content: answer,
    })
  },
  $apis.requireAuth(),
)
