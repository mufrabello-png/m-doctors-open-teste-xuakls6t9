routerAdd(
  'GET',
  '/backend/v1/shifts',
  (e) => {
    try {
      const totalItems = $app.countRecords('plantoes')
      const records = $app.findRecordsByFilter(
        'plantoes',
        '',
        '-horarioInicioFormatado_data',
        500,
        0,
      )

      const items = records.map((shift) => {
        const pessoaNome = shift.getString('pessoaNome')
        return {
          id: shift.getString('idApi') || shift.id,
          idApi: shift.getString('idApi'),
          specialty: shift.getString('especialidadeNome') || 'Não informada',
          specialtyName: shift.getString('especialidadeNome'),
          location: shift.getString('instituicaoNome') || 'Local não informado',
          hospital: shift.getString('instituicaoNome'),
          date: shift.getString('horarioInicioFormatado_data'),
          endDate: shift.getString('horarioTerminoFormatado_data'),
          time: shift.getString('horarioProgramado'),
          doctorName: pessoaNome,
          pessoaNome,
          dayOfWeek: shift.getString('diaDaSemana'),
          type: shift.getString('tipoPlantaoNome'),
          value: shift.getString('valorFormatado'),
          status: pessoaNome && pessoaNome !== 'sem profissional' ? 'Atribuído' : 'Disponível',
          available: pessoaNome === 'sem profissional',
          closed: shift.getBool('fechado'),
          durationHours: shift.getFloat('duracaoEmHoras'),
        }
      })

      return e.json(200, {
        items,
        totalItems,
        returnedItems: items.length,
        source: 'plantoes',
      })
    } catch (err) {
      return e.json(500, {
        error: 'Erro ao carregar as escalas sincronizadas: ' + err.message,
      })
    }
  },
  $apis.requireAuth(),
)
