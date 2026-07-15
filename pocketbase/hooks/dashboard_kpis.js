routerAdd(
  'GET',
  '/backend/v1/dashboard-kpis',
  (e) => {
    try {
      let baseUrl = ''
      let token = ''

      try {
        const urlRecord = $app.findFirstRecordByData(
          'configuracoes_sistema',
          'chave',
          'doctorid_url',
        )
        baseUrl = urlRecord.getString('valor')
      } catch (_) {}

      try {
        const tokenRecord = $app.findFirstRecordByData(
          'configuracoes_sistema',
          'chave',
          'DUUID_TOKEN',
        )
        token = tokenRecord.getString('valor')
      } catch (_) {}

      if (!baseUrl) {
        baseUrl = $secrets.get('ENDPOINT_IDDOCTORS') || 'https://www.doctorid.com.br/api'
      }
      if (!token) {
        token = $secrets.get('DUUID_TOKEN') || ''
      }

      if (!token) {
        return e.badRequestError(
          'Token DUUID não configurado. Por favor, configure as credenciais no menu de configurações.',
        )
      }

      let dashboardData = null
      const period = e.requestInfo().query.period || 'semanal'

      // Tenta buscar da API externa
      try {
        const endpoint = baseUrl.endsWith('/')
          ? baseUrl + 'dashboard?period=' + period
          : baseUrl + '/dashboard?period=' + period
        const res = $http.send({
          url: endpoint,
          method: 'GET',
          headers: {
            DUUID: token,
            'Content-Type': 'application/json',
          },
          timeout: 10,
        })

        if (res.statusCode === 200 && res.json) {
          dashboardData = res.json
        } else {
          $app
            .logger()
            .warn('DoctorID API returned non-200 for dashboard', 'status', res.statusCode)
        }
      } catch (err) {
        $app.logger().error('DoctorID dashboard API transport error', 'error', err.message)
      }

      if (!dashboardData || !dashboardData.kpis) {
        return e.json(502, {
          error: 'A API Doctor ID não retornou KPIs válidos para o período consultado.',
        })
      }

      return e.json(200, dashboardData)
    } catch (err) {
      return e.internalServerError('Erro interno ao processar KPIs do dashboard: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
