routerAdd(
  'GET',
  '/backend/v1/doctor-id/test-connection',
  (e) => {
    let token = ''
    try {
      const tokenRecord = $app.findFirstRecordByData(
        'configuracoes_sistema',
        'chave',
        'duuid_token',
      )
      token = tokenRecord.getString('valor')
    } catch (_) {}

    if (!token) {
      token = $secrets.get('DUUID_TOKEN') || ''
    }

    if (!token) {
      return e.badRequestError(
        'Token DUUID não configurado. Por favor, verifique os segredos ou as configurações.',
      )
    }

    let endpoint = ''
    try {
      const urlRecord = $app.findFirstRecordByData('configuracoes_sistema', 'chave', 'doctorid_url')
      endpoint = urlRecord.getString('valor')
    } catch (_) {}

    if (!endpoint) {
      endpoint = $secrets.get('ENDPOINT_IDDOCTORS') || 'https://www.doctorid.com.br/api'
    }

    try {
      const targetUrl = endpoint.endsWith('/') ? endpoint + 'hospitals' : endpoint + '/hospitals'
      const resHosp = $http.send({
        url: targetUrl,
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        timeout: 15,
      })

      if (resHosp.statusCode >= 400) {
        return e.badRequestError(
          'A API retornou erro ou token inválido. Status: ' + resHosp.statusCode,
        )
      }

      const data = Array.isArray(resHosp.json)
        ? resHosp.json
        : resHosp.json?.data || resHosp.json?.hospitals || []

      if (!Array.isArray(data)) {
        return e.badRequestError('A API foi alcançada mas retornou um formato de dados inesperado.')
      }

      return e.json(200, { success: true, count: data.length })
    } catch (err) {
      $app.logger().error('DoctorID Test Connection API transport error', 'error', err.message)
      return e.internalServerError('Falha de comunicação (API Unreachable) ou timeout.')
    }
  },
  $apis.requireAuth(),
)
