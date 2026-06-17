migrate(
  (app) => {
    // Create hospitals collection
    const hospitals = new Collection({
      name: 'hospitals',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'doctor_id_ref', type: 'text', required: true },
        { name: 'nome', type: 'text', required: true },
        { name: 'endereco', type: 'text' },
        { name: 'cidade', type: 'text' },
        { name: 'estado', type: 'text' },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_hospitals_doctor_id_ref ON hospitals (doctor_id_ref)'],
    })
    app.save(hospitals)

    // Update shifts collection to add doctor_id_ref and indexes
    const shifts = app.findCollectionByNameOrId('shifts')
    if (!shifts.fields.getByName('doctor_id_ref')) {
      shifts.fields.add(new TextField({ name: 'doctor_id_ref' }))
    }
    shifts.addIndex('idx_shifts_doctor_id_ref', false, 'doctor_id_ref', '')
    shifts.addIndex('idx_shifts_start_time_location', false, 'start_time, location', '')
    app.save(shifts)
  },
  (app) => {
    try {
      const hospitals = app.findCollectionByNameOrId('hospitals')
      app.delete(hospitals)
    } catch (_) {}

    try {
      const shifts = app.findCollectionByNameOrId('shifts')
      shifts.fields.removeByName('doctor_id_ref')
      shifts.removeIndex('idx_shifts_doctor_id_ref')
      shifts.removeIndex('idx_shifts_start_time_location')
      app.save(shifts)
    } catch (_) {}
  },
)
