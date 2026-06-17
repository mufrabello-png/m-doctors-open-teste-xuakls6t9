routerAdd(
  'GET',
  '/backend/v1/relatorios',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const type = e.request.url.query().get('type') || 'vagas'

    if (type === 'vagas') {
      return e.json(200, {
        items: [
          {
            id: 1,
            data: '2026-06-20',
            instituicao: 'Hospital São Lucas',
            especialidade: 'Cardiologia',
            horario: '08:00 - 20:00',
            duracao: '12h',
            turno: 'Diurno',
            status: 'Crítica',
          },
          {
            id: 2,
            data: '2026-06-21',
            instituicao: 'Clínica Sul',
            especialidade: 'Pediatria',
            horario: '20:00 - 08:00',
            duracao: '12h',
            turno: 'Noturno',
            status: 'Aberta',
          },
          {
            id: 3,
            data: '2026-06-22',
            instituicao: 'Hospital Norte',
            especialidade: 'Ortopedia',
            horario: '19:00 - 07:00',
            duracao: '12h',
            turno: 'Noturno',
            status: 'Em negociação',
          },
          {
            id: 4,
            data: '2026-06-23',
            instituicao: 'Hospital São Lucas',
            especialidade: 'Neurologia',
            horario: '08:00 - 14:00',
            duracao: '6h',
            turno: 'Diurno',
            status: 'Aberta',
          },
        ],
        total: 4,
      })
    }

    if (type === 'produtividade') {
      return e.json(200, {
        tempoPreenchimento: [
          { especialidade: 'Cardiologia', horas: 12 },
          { especialidade: 'Pediatria', horas: 8 },
          { especialidade: 'Ortopedia', horas: 24 },
          { especialidade: 'Neurologia', horas: 16 },
        ],
        substituicoes: [
          { medico: 'Dr. João Silva', taxa: '15%', status: 'Alto' },
          { medico: 'Dra. Maria Souza', taxa: '8%', status: 'Normal' },
          { medico: 'Dr. Roberto Costa', taxa: '4%', status: 'Normal' },
        ],
      })
    }

    if (type === 'riscos') {
      const riscos = [
        {
          id: 1,
          data: '2026-06-22',
          descricao: 'Furo detectado na escala da UTI (falta apenas 48h)',
          criticidade: 'alta',
        },
        {
          id: 2,
          data: '2026-06-25',
          descricao: '3 médicos do plantão noturno atingiram limite de horas extras',
          criticidade: 'media',
        },
        {
          id: 3,
          data: '2026-06-27',
          descricao: 'Baixa adesão voluntária aos plantões de final de semana na pediatria',
          criticidade: 'baixa',
        },
      ]

      let recomendacao = 'Nenhuma recomendação gerada.'
      try {
        const prompt =
          'Como gestor experiente, forneça uma diretriz executiva curta (no máximo 3 linhas) com ações imediatas para mitigar os seguintes riscos de escalas hospitalares: ' +
          JSON.stringify(riscos)
        const reply = $ai.chat({
          model: 'fast',
          messages: [
            {
              role: 'system',
              content: 'Você é um consultor executivo focado em gestão e qualidade na saúde.',
            },
            { role: 'user', content: prompt },
          ],
        })
        recomendacao = reply.choices[0].message.content
      } catch (err) {
        $app.logger().error('AI recommendation error', 'err', err.message)
        recomendacao =
          'Serviço de IA temporariamente indisponível. Recomendamos avaliação manual imediata dos riscos e contato com a equipe de rotina.'
      }

      return e.json(200, { items: riscos, recomendacao })
    }

    return e.json(400, { error: 'Tipo de relatório inválido' })
  },
  $apis.requireAuth(),
)
