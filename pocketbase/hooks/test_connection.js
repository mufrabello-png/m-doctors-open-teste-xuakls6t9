routerAdd(
  'GET',
  '/backend/v1/doctor-id/test-connection',
  (e) => {
    const token = $secrets.get('DUUID_TOKEN')

    if (!token) {
      return e.badRequestError(
        'Token DUUID não configurado. Por favor, verifique os segredos ou as configurações.',
      )
    }

    const endpoint =
      'https://www.doctorid.com.br/api/shiftListing?tipoEscala=Semanal&horarioInicio=01/09/2025&horarioTermino=30/09/2025&apresentarDadosDeAtribuicao=1&apresentarDadosEspecificosDaEquipe=true'

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

      return e.json(200, { success: true })
    } catch (err) {
      return e.internalServerError('Falha de comunicação (API Unreachable) ou timeout.')
    }
  },
  $apis.requireAuth(),
)
