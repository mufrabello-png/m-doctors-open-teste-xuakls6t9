migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!col.fields.getByName('duuid_token')) {
      col.fields.add(new TextField({ name: 'duuid_token' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('_pb_users_auth_')
    col.fields.removeByName('duuid_token')
    app.save(col)
  },
)
