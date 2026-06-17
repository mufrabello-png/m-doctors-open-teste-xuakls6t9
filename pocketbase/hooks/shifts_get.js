routerAdd(
  'GET',
  '/backend/v1/shifts',
  (e) => {
    const token = $secrets.get('DOCTORID_API_TOKEN') || ''
    if (!token) {
      return e.internalServerError('DOCTORID_API_TOKEN is not configured in project secrets.')
    }

    const endpoint =
      $secrets.get('ENDPOINT_IDDOCTORS') || 'https://www.doctorid.com.br/api/shiftListing'

    try {
      const res = $http.send({
        url: endpoint,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        timeout: 15,
      })

      if (res.statusCode >= 400) {
        $app
          .logger()
          .error(
            'Doctorid API error',
            'status',
            res.statusCode,
            'body',
            res.body ? new TextDecoder().decode(res.body) : '',
          )
        return e.json(res.statusCode, { error: 'Failed to fetch shifts from Doctorid API' })
      }

      return e.json(200, res.json || [])
    } catch (err) {
      $app.logger().error('Doctorid API transport error', 'error', err.message)
      return e.internalServerError('Failed to communicate with Doctorid API')
    }
  },
  $apis.requireAuth(),
)
