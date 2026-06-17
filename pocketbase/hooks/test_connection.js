routerAdd(
  'GET',
  '/backend/v1/doctor-id/test-connection',
  (e) => {
    let token = ''
    try {
      const conf = $app.findFirstRecordByData('configuracoes_sistema', 'chave', 'DUUID_TOKEN')
      token = conf.getString('valor')
    } catch (_) {
      token = $secrets.get('DUUID_TOKEN') || ''
    }

    if (!token) {
      return e.json(401, { error: 'Token DUUID não configurado.' })
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
      const resShift = $http.send({
        url: endpoint,
        method: 'GET',
        headers: { DUUID: token, 'Content-Type': 'application/json' },
        timeout: 15,
      })

      if (resShift.statusCode === 401 || resShift.statusCode === 403) {
        return e.json(401, { error: 'Token expirado ou inválido. Atualize o DUUID_TOKEN.' })
      }

      if (resShift.statusCode >= 400) {
        return e.badRequestError('A API retornou erro. Status: ' + resShift.statusCode)
      }

      if (!resShift.json || !Array.isArray(resShift.json.plantoes)) {
        return e.json(502, {
          error: 'Formato de resposta inválido. Chave plantoes não encontrada.',
        })
      }

      return e.json(200, { success: true })
    } catch (err) {
      return e.internalServerError('Falha de comunicação (API Unreachable) ou timeout.')
    }
  },
  $apis.requireAuth(),
)
