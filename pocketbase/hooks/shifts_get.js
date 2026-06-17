routerAdd(
  'GET',
  '/backend/v1/shifts',
  (e) => {
    let token = ''
    try {
      const conf = $app.findFirstRecordByData('configuracoes_sistema', 'chave', 'DUUID_TOKEN')
      token = conf.getString('valor')
    } catch (_) {
      token = $secrets.get('DUUID_TOKEN') || ''
    }

    if (!token) {
      return e.json(401, { error: 'DUUID_TOKEN não configurado.' })
    }

    const spTime = new Date(new Date().getTime() - 3 * 3600 * 1000)
    const yyyy = spTime.getUTCFullYear()
    const month = spTime.getUTCMonth()
    const mm = String(month + 1).padStart(2, '0')
    const lastDay = new Date(Date.UTC(yyyy, month + 1, 0)).getUTCDate()

    const horarioInicio = `01/${mm}/${yyyy}`
    const horarioTermino = `${String(lastDay).padStart(2, '0')}/${mm}/${yyyy}`

    const endpoint = `https://www.doctorid.com.br/api/shiftListing?tipoEscala=Semanal&horarioInicio=${horarioInicio}&horarioTermino=${horarioTermino}&apresentarDadosDeAtribuicao=1&apresentarDadosEspecificosDaEquipe=true`

    try {
      const res = $http.send({
        url: endpoint,
        method: 'GET',
        headers: {
          DUUID: token,
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })

      if (res.statusCode === 401 || res.statusCode === 403) {
        return e.json(401, {
          error: 'Token expirado ou inválido. Por favor, atualize o DUUID_TOKEN.',
        })
      }

      if (res.statusCode >= 400) {
        $app.logger().error('Doctorid API error', 'status', res.statusCode)
        return e.json(res.statusCode, { error: 'Failed to fetch shifts from Doctorid API' })
      }

      if (!res.json || !Array.isArray(res.json.plantoes)) {
        return e.json(502, {
          error: 'Formato de resposta inválido da API Doctor ID. Chave plantoes não encontrada.',
        })
      }

      return e.json(200, res.json.plantoes)
    } catch (err) {
      $app.logger().error('Doctorid API transport error', 'error', err.message)
      return e.internalServerError('Failed to communicate with Doctorid API')
    }
  },
  $apis.requireAuth(),
)
