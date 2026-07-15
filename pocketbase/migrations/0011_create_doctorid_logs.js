migrate(
  (app) => {
    const collection = new Collection({
      name: 'doctorid_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'operation', type: 'text', required: true },
        { name: 'endpoint', type: 'text' },
        { name: 'statusCode', type: 'number' },
        { name: 'requestPeriod', type: 'text' },
        { name: 'responseKeys', type: 'text' },
        { name: 'receivedCount', type: 'number' },
        { name: 'syncedCount', type: 'number' },
        { name: 'responsePreview', type: 'text' },
        { name: 'errorMessage', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_doctorid_logs_created ON doctorid_logs (created DESC)'],
    })
    app.save(collection)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('doctorid_logs'))
  },
)
