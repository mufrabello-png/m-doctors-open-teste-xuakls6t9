migrate(
  (app) => {
    try {
      const oldCol = app.findCollectionByNameOrId('plantoes')
      app.delete(oldCol)
    } catch (_) {
      // Collection might not exist, proceed
    }

    const col = new Collection({
      name: 'plantoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'idApi', type: 'text', required: true },
        { name: 'instituicaoNome', type: 'text' },
        { name: 'pessoaNome', type: 'text' },
        { name: 'pessoaConselhoRegional', type: 'text' },
        { name: 'especialidadeNome', type: 'text' },
        { name: 'tipoPlantaoNome', type: 'text' },
        { name: 'valorFormatado', type: 'text' },
        { name: 'valorApuradoFormatado', type: 'text' },
        { name: 'periodicidade', type: 'text' },
        { name: 'diaDaSemana', type: 'text' },
        { name: 'pessoaNomeAtribuicao', type: 'text' },
        { name: 'substituicao', type: 'text' },
        { name: 'pagamentoAVista', type: 'bool' },
        { name: 'pagamentoAntecipado', type: 'bool' },
        { name: 'valorPadrao', type: 'bool' },
        { name: 'originalDaMaster', type: 'bool' },
        { name: 'fechado', type: 'bool' },
        { name: 'duracaoEmHoras', type: 'number' },
        { name: 'duracaoApuradaEmHoras', type: 'number' },
        { name: 'diurno', type: 'bool' },
        { name: 'isFinalDeSemana', type: 'bool' },
        { name: 'dataAtribuicao_data', type: 'date' },
        { name: 'dataAtribuicao_hora', type: 'text' },
        { name: 'horarioInicioFormatado_data', type: 'date' },
        { name: 'horarioTerminoFormatado_data', type: 'date' },
        { name: 'horarioProgramado', type: 'text' },
        { name: 'tipoValidacaoPlantaoSemanalFormatado', type: 'text' },
        { name: 'vinculoNome', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_plantoes_idApi ON plantoes (idApi)'],
    })
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('plantoes')
      app.delete(col)
    } catch (_) {}
  },
)
