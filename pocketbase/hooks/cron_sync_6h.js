cronAdd('sync_6h', '0 */6 * * *', () => {
  let token = ''
  try {
    const conf = $app.findFirstRecordByData('configuracoes_sistema', 'chave', 'DUUID_TOKEN')
    token = conf.getString('valor')
  } catch (_) {}

  if (!token) {
    token = $secrets.get('DUUID_TOKEN') || ''
  }

  if (!token) {
    $app.logger().error('cron_sync_6h failed', 'error', 'DUUID_TOKEN não configurado.')
    return
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
      timeout: 30,
    })

    if (resShift.statusCode >= 400) {
      $app.logger().error('cron_sync_6h api failed', 'status', resShift.statusCode)
      return
    }

    shiftsData = resShift.json?.plantoes || []

    if (!Array.isArray(shiftsData)) {
      $app
        .logger()
        .error(
          'cron_sync_6h invalid format',
          'body',
          resShift.body ? new TextDecoder().decode(resShift.body) : '',
        )
      return
    }
  } catch (err) {
    $app.logger().error('cron_sync_6h fetch failed', 'error', err.message)
    return
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

  const removeAccents = (s) => {
    if (!s) return ''
    const accented = 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ'
    const unaccented = 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
    let result = String(s)
    for (let i = 0; i < accented.length; i++) {
      result = result.split(accented[i]).join(unaccented[i])
    }
    return result
  }

  const normalizeVacant = (s) => {
    if (!s) return false
    const n = removeAccents(String(s)).toLowerCase().trim()
    return n === 'sem profissional' || n === 'sem proficional'
  }

  const cleanedShifts = []
  for (const raw of shiftsData) {
    const idApi = String(raw.id || '')
    if (!idApi) continue

    let pessoaNome = raw.pessoaNome
    if (!pessoaNome || String(pessoaNome).trim() === '') {
      pessoaNome = 'sem profissional'
    } else if (normalizeVacant(pessoaNome)) {
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
      pessoaNomeAtribuicao: normalizeVacant(raw.pessoaNomeAtribuicao)
        ? 'sem profissional'
        : String(raw.pessoaNomeAtribuicao || ''),
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
      tipoValidacaoPlantaoSemanalFormatado: String(raw.tipoValidacaoPlantaoSemanalFormatado || ''),
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

      try {
        txApp.save(record)
        synced++
      } catch (err) {
        $app
          .logger()
          .error('cron_sync_6h record save failed', 'idApi', data.idApi, 'error', err.message)
      }
    }
  })

  $app.logger().info('cron_sync_6h finished', 'synced', synced)
})
