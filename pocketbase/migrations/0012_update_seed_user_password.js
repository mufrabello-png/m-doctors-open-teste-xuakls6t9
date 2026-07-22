migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'indicadores@mdoctors.com.br')
      record.setPassword('Escritorio@123')
      record.setVerified(true)
      app.save(record)
    } catch (_) {
      const record = new Record(users)
      record.setEmail('indicadores@mdoctors.com.br')
      record.setPassword('Escritorio@123')
      record.setVerified(true)
      record.set('name', 'Admin')
      app.save(record)
    }
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'indicadores@mdoctors.com.br')
      record.setPassword('Skip@Pass')
      app.save(record)
    } catch (_) {}
  },
)
