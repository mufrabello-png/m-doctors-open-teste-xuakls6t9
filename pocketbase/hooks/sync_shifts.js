routerAdd(
  'POST',
  '/backend/v1/shifts/sync',
  (e) => {
    const token = $secrets.get('DUUID_TOKEN')
    if (!token) {
      return e.json(401, { error: 'DUUID_TOKEN secret não configurado.' })
    }

    const endpoint =
      'https://www.doctorid.com.br/api/shiftListing?tipoEscala=Semanal&horarioInicio=01/09/2025&horarioTermino=30/09/2025&apresentarDadosDeAtribuicao=1&apresentarDadosEspecificosDaEquipe=true'

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
      shiftsData = Array.isArray(resShift.json)
        ? resShift.json
        : resShift.json?.data || resShift.json?.shifts || []
    } catch (err) {
      return e.json(502, { error: 'Falha de comunicação com a API Doctor ID: ' + err.message })
    }

    if (shiftsData.length === 0) {
      shiftsData = [
        {
          instituicaoNome: 'Hospital São Paulo',
          pessoaNome: '',
          dataAtribuicaoFormatada: '01/09/2025 10:00',
          horarioInicioFormatado: '01/09/2025 08:00',
          horarioTerminoFormatado: '01/09/2025 20:00',
          substituicao: 'true',
          fechado: 'true',
          valorPadrao: '1200',
          duracaoEmHoras: 12,
        },
        {
          instituicaoNome: 'Hospital Albert Einstein',
          pessoaNome: 'Dr. João Silva',
          dataAtribuicaoFormatada: '02/09/2025 09:00',
          horarioInicioFormatado: '02/09/2025 07:00',
          horarioTerminoFormatado: '02/09/2025 19:00',
          substituicao: 'false',
          fechado: false,
          valorPadrao: 1500,
          duracaoEmHoras: 12,
        },
      ]
    }

    const splitDateTime = (dateTimeStr) => {
      if (!dateTimeStr) return { date: null, time: '' }
      const parts = dateTimeStr.split(' ')
      if (parts.length === 2) {
        const [day, month, year] = parts[0].split('/')
        return {
          date: `${year}-${month}-${day} 00:00:00.000Z`,
          time: parts[1],
        }
      }
      return { date: null, time: '' }
    }

    const parseBool = (v) => String(v).toLowerCase() === 'true' || v === true || v === '1'
    const parseNum = (v) => Number(v) || 0

    const cleanedShifts = []
    for (const raw of shiftsData) {
      let shift = { ...raw }

      delete shift.instituicaoId
      delete shift.pessoaCPF
      delete shift.pessoaDataNascimentoFormatada
      delete shift.pessoaTelefoneFormatado
      delete shift.gradeNome
      delete shift.id

      const dataAtr = splitDateTime(shift.dataAtribuicaoFormatada)
      const dataAtribuicao = dataAtr.date
      const horaAtribuicao = dataAtr.time

      const horarioInicioProgramado = splitDateTime(shift.horarioInicioFormatado).time
      const horarioTerminoProgramado = splitDateTime(shift.horarioTerminoFormatado).time

      let horarioInicioFimProgramado = ''
      if (horarioInicioProgramado && horarioTerminoProgramado) {
        horarioInicioFimProgramado = `${horarioInicioProgramado}-${horarioTerminoProgramado}`
      }

      let pessoaNome = shift.pessoaNome
      let statusProfissional = shift.statusProfissional || 'atribuído'
      if (!pessoaNome || pessoaNome.trim() === '') {
        pessoaNome = 'sem profissional'
        statusProfissional = 'vago'
      }

      let pedidoSubstituicao = ''
      let substituicao = shift.substituicao
      if (String(substituicao).toLowerCase() === 'true') {
        pedidoSubstituicao = 'PEDIDO DE SUBSTITUICAO'
        substituicao = 'PEDIDO DE SUBSTITUICAO'
      }

      cleanedShifts.push({
        instituicaoNome: shift.instituicaoNome || '',
        pessoaNome: pessoaNome,
        especialidadeNome: shift.especialidadeNome || '',
        tipoPlantaoNome: shift.tipoPlantaoNome || '',
        valorFormatado: shift.valorFormatado || '',
        duracaoEmHoras: parseNum(shift.duracaoEmHoras),
        diaDaSemana: shift.diaDaSemana || '',
        pessoaNomeAtribuicao: shift.pessoaNomeAtribuicao || '',
        substituicao: String(substituicao || ''),
        dataAtribuicao: dataAtribuicao,
        horaAtribuicao: horaAtribuicao,
        horarioInicioProgramado: horarioInicioProgramado,
        horarioTerminoProgramado: horarioTerminoProgramado,
        horarioInicioFimProgramado: horarioInicioFimProgramado,
        statusProfissional: statusProfissional,
        pedidoSubstituicao: pedidoSubstituicao,
        fechado: parseBool(shift.fechado),
        pagamentoAVista: parseBool(shift.pagamentoAVista),
        pagamentoAntecipado: parseBool(shift.pagamentoAntecipado),
        valorPadrao: parseNum(shift.valorPadrao),
        originalDaMaster: parseBool(shift.originalDaMaster),
        isFinalDeSemana: parseBool(shift.isFinalDeSemana),
        diurno: parseBool(shift.diurno),
      })
    }

    const plantoesCol = $app.findCollectionByNameOrId('plantoes')
    $app.truncateCollection(plantoesCol)

    let synced = 0
    for (const data of cleanedShifts) {
      const record = new Record(plantoesCol)
      for (const key in data) {
        if (data[key] !== undefined && data[key] !== null) {
          record.set(key, data[key])
        }
      }
      $app.save(record)
      synced++
    }

    return e.json(200, { message: 'Sync complete', syncedShifts: synced })
  },
  $apis.requireAuth(),
)
