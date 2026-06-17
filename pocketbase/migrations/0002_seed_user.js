migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'indicadores@mdoctors.com.br')
      return
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('indicadores@mdoctors.com.br')
    record.setPassword('Skip@Pass')
    record.setVerified(true)
    record.set('name', 'Admin')
    record.set('duuid_token', 'TOKEN123')
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'indicadores@mdoctors.com.br')
      app.delete(record)
    } catch (_) {}
  },
)
