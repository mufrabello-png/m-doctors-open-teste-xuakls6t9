migrate(
  (app) => {
    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'indicadores@mdoctors.com.br')

      const profiles = app.findCollectionByNameOrId('profiles')
      try {
        app.findFirstRecordByData('profiles', 'user_id', admin.id)
      } catch (_) {
        const profile = new Record(profiles)
        profile.set('user_id', admin.id)
        profile.set('nome_completo', 'Admin DoctorID')
        profile.set('cargo', 'Administrador do Sistema')
        app.save(profile)
      }

      const alerts = app.findCollectionByNameOrId('alerts')
      if (app.countRecords('alerts') === 0) {
        const mockAlerts = [
          {
            tipo: 'system',
            titulo: 'Falta de cobertura médica',
            descricao: 'Plantão Pediátrico sem médico escalado para amanhã.',
            severidade: 'high',
            lido: false,
          },
          {
            tipo: 'system',
            titulo: 'Atualização do sistema',
            descricao: 'O sistema ficará indisponível por 15min nesta madrugada.',
            severidade: 'low',
            lido: false,
          },
        ]

        mockAlerts.forEach((a) => {
          const record = new Record(alerts)
          record.set('user_id', admin.id)
          record.set('tipo', a.tipo)
          record.set('titulo', a.titulo)
          record.set('descricao', a.descricao)
          record.set('severidade', a.severidade)
          record.set('lido', a.lido)
          app.save(record)
        })
      }
    } catch (e) {}
  },
  (app) => {},
)
