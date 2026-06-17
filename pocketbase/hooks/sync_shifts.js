routerAdd(
  'POST',
  '/backend/v1/shifts/sync',
  (e) => {
    let token = ''
    try {
      const conf = $app.findFirstRecordByData('configuracoes_sistema', 'chave', 'DUUID_TOKEN')
      token = conf.getString('valor')
    } catch (_) {
      token = $secrets.get('DUUID_TOKEN') || ''
    }

    if (!token) {
      return e.json(401, { error: 'DUUID_TOKEN secret não configurado.' })
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

      if (!resShift.json || !Array.isArray(resShift.json.plantoes)) {
        $app
          .logger()
          .error(
            'plantoes key missing from API response',
            'body',
            resShift.body ? new TextDecoder().decode(resShift.body) : '',
          )
        return e.json(502, {
          error: 'Formato de resposta inválido da API Doctor ID. Chave plantoes não encontrada.',
        })
      }

      shiftsData = resShift.json.plantoes
    } catch (err) {
      return e.json(502, { error: 'Falha de comunicação com a API Doctor ID: ' + err.message })
    }

    const parseBool = (v) => {
      if (typeof v === 'boolean') return v
      if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1'
      if (typeof v === 'number') return v === 1
      return false
    }

    const parseDate = (v) => {
      if (!v || typeof v !== 'string') return ''
      const parts = v.split(' ')
      const datePart = parts[0]
      const timePart = parts[1] || '00:00:00'

      if (!datePart.includes('/')) return ''
      const [day, monthStr, year] = datePart.split('/')
      if (year && monthStr && day) {
        return `${year}-${monthStr}-${day} ${timePart}.000Z`
      }
      return ''
    }

    const cleanedShifts = []
    for (const raw of shiftsData) {
      const idApi = String(raw.id || '')
      if (!idApi) continue

      let pessoaNome = raw.pessoaNome
      if (!pessoaNome || String(pessoaNome).trim() === '') {
        pessoaNome = 'sem profissional escalado'
      }

      cleanedShifts.push({
        idApi: idApi,
        instituicaoNome: String(raw.instituicaoNome || ''),
        instituicaoId: String(raw.instituicaoId || ''),
        pessoaNome: pessoaNome,
        pessoaCPF: String(raw.pessoaCPF || ''),
        pessoaDataNascimentoFormatada: String(raw.pessoaDataNascimentoFormatada || ''),
        pessoaConselhoRegional: String(raw.pessoaConselhoRegional || ''),
        pessoaTelefoneFormatado: String(raw.pessoaTelefoneFormatado || ''),
        especialidadeNome: String(raw.especialidadeNome || ''),
        gradeNome: String(raw.gradeNome || ''),
        tipoPlantaoNome: String(raw.tipoPlantaoNome || ''),
        valorFormatado: String(raw.valorFormatado || ''),
        valorApuradoFormatado: String(raw.valorApuradoFormatado || ''),
        periodicidade: String(raw.periodicidade || ''),
        diaDaSemana: String(raw.diaDaSemana || ''),
        pessoaNomeAtribuicao: String(raw.pessoaNomeAtribuicao || ''),
        substituicao: parseBool(raw.substituicao),
        pagamentoAVista: parseBool(raw.pagamentoAVista),
        pagamentoAntecipado: parseBool(raw.pagamentoAntecipado),
        valorPadrao: parseBool(raw.valorPadrao),
        originalDaMaster: parseBool(raw.originalDaMaster),
        fechado: parseBool(raw.fechado),
        duracaoEmHoras: Number(raw.duracaoEmHoras) || 0,
        duracaoApuradaEmHoras: Number(raw.duracaoApuradaEmHoras) || 0,
        diurno: parseBool(raw.diurno),
        isFinalDeSemana: parseBool(raw.isFinalDeSemana),
        dataAtribuicaoFormatada: parseDate(raw.dataAtribuicaoFormatada),
        horarioInicioApuradoFormatado: parseDate(raw.horarioInicioApuradoFormatado),
        horarioTerminoApuradoFormatado: parseDate(raw.horarioTerminoApuradoFormatado),
        horarioInicioFormatado: parseDate(raw.horarioInicioFormatado),
        horarioTerminoFormatado: parseDate(raw.horarioTerminoFormatado),
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
