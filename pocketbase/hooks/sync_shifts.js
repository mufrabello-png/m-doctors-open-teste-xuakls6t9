routerAdd(
  'POST',
  '/backend/v1/shifts/sync',
  (e) => {
    let token = ''
    try {
      const conf = $app.findFirstRecordByData('configuracoes_sistema', 'chave', 'DUUID_TOKEN')
      token = conf.getString('valor')
    } catch (_) {}

    if (!token) {
      token = $secrets.get('DUUID_TOKEN') || ''
    }

    if (!token) {
      return e.json(401, { error: 'DUUID_TOKEN não configurado.' })
    }

    const spTime = new Date(new Date().getTime() - 3 * 3600 * 1000)
    const yyyy = spTime.getUTCFullYear()
    const month = spTime.getUTCMonth()
    const mm = String(month + 1).padStart(2, '0')
    const lastDay = new Date(Date.UTC(yyyy, month + 1, 0)).getUTCDate()

    const horarioInicio = `01/${mm}/${yyyy}`
    const horarioTermino = `${String(lastDay).padStart(2, '0')}/${mm}/${yyyy}`

    const endpoint = `https://www.doctorid.com.br/api/shiftListing?tipoEscala=Semanal&horarioInicio=${horarioInicio}&horarioTermino=${horarioTermino}&apresentarDadosDeAtribuicao=1&apresentarDadosEspecificosDaEquipe=true`

    let shiftsData = []

    try {
      const resShift = $http.send({
        url: endpoint,
        method: 'GET',
        headers: { DUUID: token, 'Content-Type': 'application/json' },
        timeout: 15,
      })

      if (resShift.statusCode === 401 || resShift.statusCode === 403) {
        return e.json(401, {
          error: 'Token expirado ou inválido. Por favor, atualize o DUUID_TOKEN.',
        })
      }

      if (resShift.statusCode >= 400) {
        return e.json(502, {
          error: 'A API Doctor ID (Escalas) está inacessível. Status: ' + resShift.statusCode,
        })
      }

      shiftsData = resShift.json?.plantoes || []

      if (!Array.isArray(shiftsData)) {
        $app
          .logger()
          .error(
            'plantoes key missing or invalid from API response',
            'body',
            resShift.body ? new TextDecoder().decode(resShift.body) : '',
          )
        return e.json(502, {
          error: 'Formato de resposta inválido da API Doctor ID. Chave plantoes não encontrada.',
        })
      }
    } catch (err) {
      return e.json(502, { error: 'Falha de comunicação com a API Doctor ID: ' + err.message })
    }

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
    for (const raw of shiftsData) {
      const idApi = String(raw.id || '')
      if (!idApi) continue

      let pessoaNome = raw.pessoaNome
      if (!pessoaNome || String(pessoaNome).trim() === '') {
        pessoaNome = 'sem profissional'
      }

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
    let errors = []

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

        try {
          txApp.save(record)
          synced++
        } catch (err) {
          errors.push({ error: err.message, idApi: data.idApi })
        }
      }
    })

    if (errors.length > 0 && synced === 0) {
      return e.json(400, { error: 'Validation failed for all records', details: errors })
    }

    return e.json(200, {
      message: 'Sync complete',
      syncedShifts: synced,
      errors: errors.length > 0 ? errors : undefined,
    })
  },
  $apis.requireAuth(),
)
