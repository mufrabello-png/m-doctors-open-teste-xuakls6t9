routerAdd(
  'POST',
  '/backend/v1/chat-orquestrador',
  (e) => {
    const body = e.requestInfo().body || {}
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')
    if (!body.message?.trim()) return e.badRequestError('message is required')

    const message = body.message.trim()

    // 1. Extração de parâmetros usando AI Gateway
    let params = {}
    try {
      const extractRes = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              "Você é um extrator de parâmetros de agendamento. Retorne APENAS um objeto JSON com as chaves: 'periodo', 'especialidade', 'instituicao', 'tipo_escala'. Se não identificar algum, o valor deve ser null. Não inclua nenhum outro texto.",
          },
          { role: 'user', content: message },
        ],
      })
      const text = extractRes.choices[0].message.content
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        params = JSON.parse(jsonMatch[0])
      }
    } catch (err) {
      if (err.status === 503) {
        return e.json(503, { error: 'Serviço AI temporariamente indisponível.' })
      }
      // Falhas de extração são toleradas para seguir sem filtros restritos
    }

    // 2. Integração Segura com API DoctorID via Secrets
    const urlBase =
      $secrets.get('URL_BASE_DOCTORID') ||
      $secrets.get('ENDPOINT_IDDOCTORS') ||
      'https://www.doctorid.com.br/api/shiftListing'
    const token = $secrets.get('TOKEN_DUUID') || $secrets.get('DOCTORID_API_TOKEN') || ''

    let apiData = null
    if (!token) {
      return e.badRequestError('Token da API DoctorID não configurado nos segredos (TOKEN_DUUID).')
    }

    try {
      const query = new URLSearchParams()
      if (params.periodo) query.append('periodo', params.periodo)
      if (params.especialidade) query.append('especialidade', params.especialidade)
      if (params.instituicao) query.append('instituicao', params.instituicao)
      if (params.tipo_escala) query.append('tipo_escala', params.tipo_escala)

      const qs = query.toString()
      const url = urlBase + (qs ? '?' + qs : '')

      const res = $http.send({
        url: url,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        apiData = res.json
      } else {
        // Retornar 400/401 direto para a UI não efetuar retry
        if (res.statusCode === 400 || res.statusCode === 401) {
          return e.json(res.statusCode, {
            error: 'Erro de autenticação ou requisição inválida na API DoctorID.',
          })
        }
        apiData = { erro: 'A API DoctorID retornou o status ' + res.statusCode }
      }
    } catch (err) {
      $app.logger().error('DoctorID API request failed', 'error', err.message)
      apiData = { erro: 'Falha de comunicação ou timeout na API DoctorID.' }
    }

    // 3. Orquestração e Resposta Final (AI Gateway)
    let answer = ''
    try {
      const answerRes = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              "Você é um assistente de escalas médicas do DoctorID. Formule uma resposta em português de forma clara e objetiva respondendo à pergunta do usuário, baseando-se EXCLUSIVAMENTE nos dados da API fornecidos.\n\nREGRAS DE FORMATAÇÃO:\n- Coloque números, datas, e horários em **negrito**.\n- Use listas (- ou *) para enumerar múltiplos itens.\n- Se houver algum erro grave nos dados, inicie um parágrafo exatamente com a palavra 'ALERTA:'.",
          },
          {
            role: 'user',
            content: `Pergunta do usuário: "${message}"\n\nDados da API: ${JSON.stringify(apiData)}`,
          },
        ],
      })
      answer = answerRes.choices[0].message.content
    } catch (err) {
      if (err.status === 503) {
        return e.json(503, { error: 'Serviço AI temporariamente indisponível.' })
      }
      answer = 'Desculpe, ocorreu um erro ao gerar a resposta baseada nos dados encontrados.'
    }

    // 4. Salvar log de histórico
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
