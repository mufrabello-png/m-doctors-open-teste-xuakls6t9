routerAdd(
  'GET',
  '/backend/v1/relatorios',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const type = e.request.url.query().get('type') || 'vagas'

    if (type === 'vagas') {
      const records = $app.findRecordsByFilter('shifts', "doctor_name = ''", 'start_time', 100, 0)

      const items = records.map((r) => {
        let start = new Date()
        let end = new Date()
        try {
          start = new Date(r.getString('start_time'))
          end = new Date(r.getString('end_time'))
        } catch (_) {}

        const duracaoH = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60)) || 0
        const isNoite = start.getHours() >= 18 || start.getHours() < 6

        return {
          id: r.id,
          data: start.toISOString().split('T')[0],
          instituicao: r.getString('location') || 'Não informada',
          especialidade: 'Não especificada',
          horario: `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`,
          duracao: `${duracaoH}h`,
          turno: isNoite ? 'Noturno' : 'Diurno',
          status: r.getString('status') || 'Aberta',
        }
      })

      return e.json(200, { items, total: items.length })
    }

    if (type === 'produtividade') {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .replace('T', ' ')

      const allShifts = $app.findRecordsByFilter(
        'shifts',
        `start_time >= '${firstDay}'`,
        '-start_time',
        1000,
        0,
      )

      let total = allShifts.length
      let filled = 0
      const byLocation = {}

      allShifts.forEach((r) => {
        const loc = r.getString('location') || 'Não informada'
        const isFilled = r.getString('doctor_name') !== ''

        if (!byLocation[loc]) byLocation[loc] = { total: 0, filled: 0 }
        byLocation[loc].total++
        if (isFilled) {
          filled++
          byLocation[loc].filled++
        }
      })

      const taxaGeral = total > 0 ? Math.round((filled / total) * 100) : 0

      const locais = Object.keys(byLocation)
        .map((loc) => {
          const t = byLocation[loc].total
          const f = byLocation[loc].filled
          return {
            local: loc,
            taxa: t > 0 ? Math.round((f / t) * 100) : 0,
            total: t,
          }
        })
        .sort((a, b) => b.taxa - a.taxa)

      return e.json(200, { taxaGeral, locais })
    }

    if (type === 'riscos') {
      const now = new Date()
      const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
      const nowStr = now.toISOString().replace('T', ' ')
      const in48hStr = in48h.toISOString().replace('T', ' ')

      const risksRecords = $app.findRecordsByFilter(
        'shifts',
        `doctor_name = '' && start_time >= '${nowStr}' && start_time <= '${in48hStr}'`,
        'start_time',
        50,
        0,
      )

      const riscos = risksRecords.map((r) => {
        let start = new Date()
        try {
          start = new Date(r.getString('start_time'))
        } catch (_) {}
        const hoursLeft = (start.getTime() - now.getTime()) / (1000 * 60 * 60)
        return {
          id: r.id,
          data: start.toISOString().split('T')[0],
          descricao: `Plantão descoberto em ${r.getString('location') || 'Local não informado'} iniciando em ${Math.round(hoursLeft)} horas`,
          criticidade: hoursLeft <= 24 ? 'alta' : 'media',
        }
      })

      let recomendacao = 'Nenhuma recomendação gerada.'
      try {
        const totalRisks = riscos.length
        const totalHigh = riscos.filter((r) => r.criticidade === 'alta').length

        if (totalRisks > 0) {
          const prompt = `Como gestor experiente, forneça uma diretriz executiva curta (no máximo 3 linhas) com ações imediatas para mitigar os seguintes riscos operacionais de escalas hospitalares: Temos ${totalRisks} plantões descobertos nas próximas 48h, sendo ${totalHigh} deles críticos (nas próximas 24h).`
          const reply = $ai.chat({
            model: 'fast',
            messages: [
              {
                role: 'system',
                content:
                  'Você é um consultor executivo focado em gestão e qualidade na saúde. Seja direto e proponha soluções urgentes.',
              },
              { role: 'user', content: prompt },
            ],
          })
          recomendacao = reply.choices[0].message.content
        } else {
          recomendacao =
            'As escalas para as próximas 48h estão cobertas. Mantenha o monitoramento padrão.'
        }
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
