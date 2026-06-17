migrate(
  (app) => {
    const profiles = new Collection({
      name: 'profiles',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'nome_completo', type: 'text' },
        { name: 'cargo', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_profiles_user_id ON profiles (user_id)'],
    })
    app.save(profiles)

    const config = new Collection({
      name: 'configuracoes_sistema',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'chave', type: 'text', required: true },
        { name: 'valor', type: 'text' },
        { name: 'descricao', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_configuracoes_sistema_chave ON configuracoes_sistema (chave)',
      ],
    })
    app.save(config)

    const alerts = new Collection({
      name: 'alerts',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'tipo', type: 'text' },
        { name: 'titulo', type: 'text' },
        { name: 'descricao', type: 'text' },
        { name: 'dados', type: 'text' },
        { name: 'severidade', type: 'text' },
        { name: 'lido', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_alerts_user_id ON alerts (user_id)'],
    })
    app.save(alerts)

    const historico = new Collection({
      name: 'historico_consultas',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'pergunta', type: 'text' },
        { name: 'resposta', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_historico_consultas_user_id ON historico_consultas (user_id)'],
    })
    app.save(historico)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('historico_consultas'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('alerts'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('configuracoes_sistema'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('profiles'))
    } catch (e) {}
  },
)
