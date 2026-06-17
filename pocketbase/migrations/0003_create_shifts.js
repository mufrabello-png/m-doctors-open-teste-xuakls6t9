migrate(
  (app) => {
    const collection = new Collection({
      name: 'shifts',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'doctor_name', type: 'text', required: true },
        { name: 'location', type: 'text', required: true },
        { name: 'start_time', type: 'date', required: true },
        { name: 'end_time', type: 'date', required: true },
        { name: 'status', type: 'text' },
        { name: 'raw_data', type: 'json' },
        { name: 'embedding', type: 'vector', dimensions: 1536, distance: 'cosine' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('shifts')
    app.delete(collection)
  },
)
