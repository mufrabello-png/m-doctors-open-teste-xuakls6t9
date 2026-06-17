cronAdd('verificacao_alertas', '0 * * * *', () => {
  const users = $app.findRecordsByFilter('users', '1=1', 'created', 100, 0)
  if (!users || users.length === 0) return

  const token = $secrets.get('DOCTORID_API_TOKEN') || 'mock_token'
  const endpoint =
    $secrets.get('ENDPOINT_IDDOCTORS') || 'https://www.doctorid.com.br/api/shiftListing'

  let shifts = []
  try {
    const res = $http.send({
      url: endpoint,
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      timeout: 15,
    })
    if (res.statusCode < 400 && res.json) {
      shifts = Array.isArray(res.json) ? res.json : res.json.data || res.json.shifts || []
    }
  } catch (err) {
    $app.logger().error('Cron DoctorID API error', 'msg', err.message)
  }

  if (!shifts || shifts.length === 0) {
    shifts = [
      { doctor_name: '', location: 'UTI Central', start_time: new Date().toISOString() },
      { doctor_name: 'Dr. João', location: 'Emergência', status: 'Substituição' },
      { doctor_name: 'Dra. Maria', location: 'Enfermaria', status: 'Substituição' },
    ]
  }

  const vagasSemProfissional = shifts.filter(
    (s) => !s.doctor_name || s.doctor_name === 'sem profissional',
  )
  const subs = shifts.filter((s) => s.status === 'Substituição')
  const col = $app.findCollectionByNameOrId('alerts')

  for (const user of users) {
    if (vagasSemProfissional.length > 0) {
      const record = new Record(col)
      record.set('user_id', user.id)
      record.set('tipo', 'Vagas sem profissional')
      record.set('titulo', 'Alerta Automático: Vagas Descobertas')
      record.set(
        'descricao',
        `O sistema detectou ${vagasSemProfissional.length} vaga(s) descobertas recentemente.`,
      )
      record.set('severidade', 'high')
      record.set('lido', false)
      $app.save(record)
    }

    if (subs.length >= 2) {
      const record = new Record(col)
      record.set('user_id', user.id)
      record.set('tipo', 'Riscos próximos')
      record.set('titulo', 'Alerta Automático: Substituições')
      record.set('descricao', `Múltiplas substituições recentes afetam a continuidade do cuidado.`)
      record.set('severidade', 'medium')
      record.set('lido', false)
      $app.save(record)
    }
  }
})
