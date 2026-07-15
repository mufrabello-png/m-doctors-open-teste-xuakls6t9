routerAdd(
  'POST',
  '/backend/v1/chat-orquestrador',
  (e) => {
    e.response.header().set('Content-Type', 'text/event-stream')
    e.response.header().set('Cache-Control', 'no-cache')

    const sendEvent = (event, data) => {
      $response.write(e, `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      $response.flush(e)
    }

    const sendError = (code, msg) => {
      sendEvent('error', { error: msg, code })
    }

    const body = e.requestInfo().body || {}
    const userId = e.auth?.id
    if (!userId) {
      sendError(401, 'auth required')
      return
    }
    if (!body.message?.trim()) {
      sendError(400, 'message is required')
      return
    }

    const message = body.message.trim()

    const openAiKey = $secrets.get('OPEN_AI')
    if (!openAiKey) {
      sendError(
        500,
        'A chave da API da OpenAI (OPEN_AI) não está configurada nos segredos do sistema.',
      )
      return
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
                description:
                  'Texto livre para buscar em médico, hospital, especialidade ou tipo de plantão.',
              },
              data_inicio: {
                type: 'string',
                description: 'Data inicial no formato YYYY-MM-DD ou DD/MM/YYYY.',
              },
              data_fim: {
                type: 'string',
                description: 'Data final no formato YYYY-MM-DD ou DD/MM/YYYY.',
              },
              instituicao: {
                type: 'string',
                description: 'Nome ou parte do nome do hospital/instituição.',
              },
              pessoa: {
                type: 'string',
                description: 'Nome ou parte do nome do médico.',
              },
              especialidade: {
                type: 'string',
                description: 'Especialidade médica.',
              },
              apenas_disponiveis: {
                type: 'boolean',
                description: 'Use true para plantões sem profissional atribuído.',
              },
              limite: {
                type: 'integer',
                description: 'Quantidade máxima de resultados detalhados, entre 1 e 500.',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'sync_periodo_plantoes',
          description:
            'Busca e sincroniza a escala de plantões na API Doctor ID para um período específico, caso a informação solicitada não esteja na base ou se o usuário explicitamente pedir atualização.',
          parameters: {
            type: 'object',
            properties: {
              data_inicio: {
                type: 'string',
                description: 'Data de início no formato DD/MM/YYYY',
              },
              data_fim: {
                type: 'string',
                description: 'Data de fim no formato DD/MM/YYYY',
              },
            },
            required: ['data_inicio', 'data_fim'],
          },
        },
      },
    ]

    const messages = [
      {
        role: 'system',
        content:
          'Você é o Oráculo de Escalas do Doctor ID. Responda em português claro, direto e factual. Para toda pergunta sobre plantões, escalas, médicos, hospitais, horários, disponibilidade, valores ou especialidades, consulte obrigatoriamente a função `get_plantoes` antes de responder. Extraia da pergunta os filtros de período, instituição, pessoa, especialidade e disponibilidade. Nunca diga apenas que está pesquisando: depois da consulta, entregue os resultados encontrados. Use exclusivamente os dados retornados pela função; não invente, complete ou suponha informações. Se houver zero resultados, diga quais filtros foram usados e informe que não houve correspondência. Se houver muitos resultados, informe o total encontrado e liste os mais relevantes, sem afirmar que a lista parcial é o total. Diferencie plantão disponível (pessoaNome igual a sem profissional) de plantão atribuído. Sempre informe data, horário, instituição, médico, especialidade e status quando existirem. Para perguntas ambíguas, faça uma pergunta curta de esclarecimento somente se não for possível pesquisar com segurança. Formate respostas com listas e destaque números, datas e horários em **negrito**.',
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
          tool_choice: {
            type: 'function',
            function: { name: 'get_plantoes' },
          },
        }),
        timeout: 30,
      })

      if (res.statusCode >= 400) {
        sendError(res.statusCode, res.json?.error?.message || 'Erro OpenAI')
        return
      }

      let responseMessage = res.json?.choices?.[0]?.message

      if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
        messages.push(responseMessage)

        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.function.name === 'sync_periodo_plantoes') {
            sendEvent('status', { message: 'Sincronizando plantões...' })
            try {
              const args = JSON.parse(toolCall.function.arguments)
              if (args.data_inicio && args.data_fim) {
                let token = ''
                try {
                  const conf = $app.findFirstRecordByData(
                    'configuracoes_sistema',
                    'chave',
                    'DUUID_TOKEN',
                  )
                  token = conf.getString('valor')
                } catch (_) {}
                if (!token) token = $secrets.get('DUUID_TOKEN') || ''

                if (token) {
                  const endpoint = `https://www.doctorid.com.br/api/shiftListing?tipoEscala=Semanal&horarioInicio=${args.data_inicio}&horarioTermino=${args.data_fim}&apresentarDadosDeAtribuicao=1&apresentarDadosEspecificosDaEquipe=true`
                  const resShift = $http.send({
                    url: endpoint,
                    method: 'GET',
                    headers: { DUUID: token, 'Content-Type': 'application/json' },
                    timeout: 45,
                  })
                  if (resShift.statusCode < 400) {
                    const extractPlantoes = (payload) => {
                      if (Array.isArray(payload?.plantoes)) return payload.plantoes
                      for (const key of [
                        'data',
                        'dados',
                        'result',
                        'resultado',
                        'value',
                        'valor',
                      ]) {
                        if (Array.isArray(payload?.[key]?.plantoes)) return payload[key].plantoes
                      }
                      return []
                    }
                    const doctorIdShifts = extractPlantoes(resShift.json)
                    $app
                      .logger()
                      .info('DoctorID chat sync response parsed', 'received', doctorIdShifts.length)
                    const parseBool = (v) => {
                      if (typeof v === 'boolean') return v
                      if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1'
                      if (typeof v === 'number') return v === 1
                      return false
                    }
                    const parseDateTime = (v) => {
                      if (!v || typeof v !== 'string') return { date: '', time: '', hourMinute: '' }
                      const parts = v.split(' ')
                      const d = parts[0]
                      const t = parts[1] || '00:00:00'
                      if (!d.includes('/')) return { date: '', time: '', hourMinute: '' }
                      const [day, monthStr, year] = d.split('/')
                      if (year && monthStr && day) {
                        return {
                          date: `${year}-${monthStr}-${day} 00:00:00.000Z`,
                          time: t,
                          hourMinute: t.substring(0, 5),
                        }
                      }
                      return { date: '', time: '', hourMinute: '' }
                    }

                    const cleanedShifts = []
                    for (const raw of doctorIdShifts) {
                      const idApi = String(raw.id || '')
                      if (!idApi) continue
                      let pessoaNome = raw.pessoaNome
                      if (!pessoaNome || String(pessoaNome).trim() === '')
                        pessoaNome = 'sem profissional'
                      let isSub = parseBool(raw.substituicao)
                      let substituicaoText = isSub ? 'PEDIDO DE SUBSTITUIÇÃO' : ''
                      const attrData = parseDateTime(raw.dataAtribuicaoFormatada)
                      const startData = parseDateTime(raw.horarioInicioFormatado)
                      const endData = parseDateTime(raw.horarioTerminoFormatado)
                      let horarioProgramado = ''
                      if (startData.hourMinute && endData.hourMinute) {
                        horarioProgramado = `${startData.hourMinute}-${endData.hourMinute}`
                      }

                      cleanedShifts.push({
                        idApi: idApi,
                        instituicaoNome: String(raw.instituicaoNome || ''),
                        pessoaNome: pessoaNome,
                        pessoaConselhoRegional: String(raw.pessoaConselhoRegional || ''),
                        especialidadeNome: String(raw.especialidadeNome || ''),
                        tipoPlantaoNome: String(raw.tipoPlantaoNome || ''),
                        valorFormatado: String(raw.valorFormatado || ''),
                        valorApuradoFormatado: String(raw.valorApuradoFormatado || ''),
                        periodicidade: String(raw.periodicidade || ''),
                        diaDaSemana: String(raw.diaDaSemana || ''),
                        pessoaNomeAtribuicao: String(raw.pessoaNomeAtribuicao || ''),
                        substituicao: substituicaoText,
                        pagamentoAVista: parseBool(raw.pagamentoAVista),
                        pagamentoAntecipado: parseBool(raw.pagamentoAntecipado),
                        valorPadrao: parseBool(raw.valorPadrao),
                        originalDaMaster: parseBool(raw.originalDaMaster),
                        fechado: parseBool(raw.fechado),
                        duracaoEmHoras: Number(raw.duracaoEmHoras) || 0,
                        duracaoApuradaEmHoras: Number(raw.duracaoApuradaEmHoras) || 0,
                        diurno: parseBool(raw.diurno),
                        isFinalDeSemana: parseBool(raw.isFinalDeSemana),
                        dataAtribuicao_data: attrData.date,
                        dataAtribuicao_hora: attrData.time,
                        horarioInicioFormatado_data: startData.date,
                        horarioTerminoFormatado_data: endData.date,
                        horarioProgramado: horarioProgramado,
                        tipoValidacaoPlantaoSemanalFormatado: String(
                          raw.tipoValidacaoPlantaoSemanalFormatado || '',
                        ),
                        vinculoNome: String(raw.vinculoNome || ''),
                      })
                    }

                    const plantoesCol = $app.findCollectionByNameOrId('plantoes')
                    let synced = 0
                    $app.runInTransaction((txApp) => {
                      for (const data of cleanedShifts) {
                        let record
                        try {
                          record = txApp.findFirstRecordByData('plantoes', 'idApi', data.idApi)
                        } catch (_) {
                          record = new Record(plantoesCol)
                        }
                        for (const key in data) {
                          if (data[key] !== undefined && data[key] !== null) {
                            record.set(key, data[key])
                          }
                        }
                        txApp.save(record)
                        synced++
                      }
                    })

                    messages.push({
                      tool_call_id: toolCall.id,
                      role: 'tool',
                      name: 'sync_periodo_plantoes',
                      content: `Sincronização concluída com sucesso. A API retornou ${cleanedShifts.length} registros válidos e ${synced} foram gravados para o período ${args.data_inicio} até ${args.data_fim}.`,
                    })
                  } else {
                    messages.push({
                      tool_call_id: toolCall.id,
                      role: 'tool',
                      name: 'sync_periodo_plantoes',
                      content: `Erro na API Doctor ID: ${resShift.statusCode}`,
                    })
                  }
                } else {
                  messages.push({
                    tool_call_id: toolCall.id,
                    role: 'tool',
                    name: 'sync_periodo_plantoes',
                    content: 'Erro: DUUID_TOKEN não configurado.',
                  })
                }
              }
            } catch (err) {
              messages.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                name: 'sync_periodo_plantoes',
                content: 'Erro interno ao sincronizar: ' + err.message,
              })
            }
          }

          if (toolCall.function.name === 'get_plantoes') {
            sendEvent('status', { message: 'Buscando informações na base local...' })
            let plantoesData = []
            try {
              const args = JSON.parse(toolCall.function.arguments || '{}')
              const normalizeDate = (value) => {
                const text = String(value || '').trim()
                if (!text) return ''
                if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
                  const [day, month, year] = text.split('/')
                  return year + '-' + month + '-' + day
                }
                return text.substring(0, 10)
              }
              const filtro = String(args.filtro || '')
                .trim()
                .toLowerCase()
              const instituicao = String(args.instituicao || '')
                .trim()
                .toLowerCase()
              const pessoa = String(args.pessoa || '')
                .trim()
                .toLowerCase()
              const especialidade = String(args.especialidade || '')
                .trim()
                .toLowerCase()
              const dataInicio = normalizeDate(args.data_inicio)
              const dataFim = normalizeDate(args.data_fim) || dataInicio
              const limite = Math.min(Math.max(Number(args.limite) || 200, 1), 500)
              const plantoes = $app.findRecordsByFilter(
                'plantoes',
                '',
                '-horarioInicioFormatado_data',
                5000,
                0,
              )
              const filtered = plantoes
                .map((p) => ({
                  idApi: p.getString('idApi'),
                  instituicaoNome: p.getString('instituicaoNome'),
                  pessoaNome: p.getString('pessoaNome'),
                  horarioProgramado: p.getString('horarioProgramado'),
                  dataInicio: p.getString('horarioInicioFormatado_data').substring(0, 10),
                  dataTermino: p.getString('horarioTerminoFormatado_data').substring(0, 10),
                  diaDaSemana: p.getString('diaDaSemana'),
                  especialidade: p.getString('especialidadeNome'),
                  tipoPlantaoNome: p.getString('tipoPlantaoNome'),
                  substituicao: p.getString('substituicao'),
                  valorFormatado: p.getString('valorFormatado'),
                  fechado: p.getBool('fechado'),
                  disponivel: p.getString('pessoaNome') === 'sem profissional',
                  duracaoEmHoras: p.getFloat('duracaoEmHoras'),
                }))
                .filter((item) => {
                  const searchable = Object.values(item).join(' ').toLowerCase()
                  const dateOk =
                    (!dataInicio || item.dataInicio >= dataInicio) &&
                    (!dataFim || item.dataInicio <= dataFim)
                  const freeOk = args.apenas_disponiveis !== true || item.disponivel
                  return (
                    dateOk &&
                    freeOk &&
                    (!filtro || searchable.includes(filtro)) &&
                    (!instituicao || item.instituicaoNome.toLowerCase().includes(instituicao)) &&
                    (!pessoa || item.pessoaNome.toLowerCase().includes(pessoa)) &&
                    (!especialidade || item.especialidade.toLowerCase().includes(especialidade))
                  )
                })
              plantoesData = {
                totalEncontrado: filtered.length,
                retornados: Math.min(filtered.length, limite),
                filtros: {
                  filtro,
                  data_inicio: dataInicio,
                  data_fim: dataFim,
                  instituicao,
                  pessoa,
                  especialidade,
                  apenas_disponiveis: args.apenas_disponiveis === true,
                },
                dados: filtered.slice(0, limite),
              }
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

        sendEvent('status', { message: 'Analisando os dados...' })

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
          sendError(res.statusCode, res.json?.error?.message || 'Erro OpenAI apos tool')
          return
        }
        answer =
          res.json?.choices?.[0]?.message?.content ||
          'Não foi possível gerar uma resposta coerente com os dados.'
      } else {
        answer = responseMessage?.content || 'Não foi possível processar a requisição.'
      }
    } catch (err) {
      sendError(500, 'Falha de comunicação ou timeout na API da OpenAI: ' + err.message)
      return
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

    sendEvent('done', { content: answer })
  },
  $apis.requireAuth(),
)
