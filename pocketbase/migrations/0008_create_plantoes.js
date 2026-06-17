migrate(
  (app) => {
    const collection = new Collection({
      name: 'plantoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'instituicaoNome', type: 'text' },
        { name: 'pessoaNome', type: 'text' },
        { name: 'especialidadeNome', type: 'text' },
        { name: 'tipoPlantaoNome', type: 'text' },
        { name: 'valorFormatado', type: 'text' },
        { name: 'duracaoEmHoras', type: 'number' },
        { name: 'diaDaSemana', type: 'text' },
        { name: 'pessoaNomeAtribuicao', type: 'text' },
        { name: 'substituicao', type: 'text' },
        { name: 'dataAtribuicao', type: 'date' },
        { name: 'horaAtribuicao', type: 'text' },
        { name: 'horarioInicioProgramado', type: 'text' },
        { name: 'horarioTerminoProgramado', type: 'text' },
        { name: 'horarioInicioFimProgramado', type: 'text' },
        { name: 'statusProfissional', type: 'text' },
        { name: 'pedidoSubstituicao', type: 'text' },
        { name: 'fechado', type: 'bool' },
        { name: 'diurno', type: 'bool' },
        { name: 'isFinalDeSemana', type: 'bool' },
        { name: 'pagamentoAVista', type: 'bool' },
        { name: 'pagamentoAntecipado', type: 'bool' },
        { name: 'valorPadrao', type: 'number' },
        { name: 'originalDaMaster', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('plantoes')
    app.delete(collection)
  },
)
