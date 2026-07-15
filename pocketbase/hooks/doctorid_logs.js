routerAdd(
  'GET',
  '/backend/v1/doctor-id/logs',
  (e) => {
    try {
      const limit = Math.min(Number(e.requestInfo().query.limit || 50), 100)
      const records = $app.findRecordsByFilter('doctorid_logs', '', '-created', limit, 0)
      return e.json(
        200,
        records.map((record) => ({
          id: record.id,
          created: record.getString('created'),
          operation: record.getString('operation'),
          endpoint: record.getString('endpoint'),
          statusCode: record.getInt('statusCode'),
          requestPeriod: record.getString('requestPeriod'),
          responseKeys: record.getString('responseKeys'),
          receivedCount: record.getFloat('receivedCount'),
          syncedCount: record.getFloat('syncedCount'),
          responsePreview: record.getString('responsePreview'),
          errorMessage: record.getString('errorMessage'),
        })),
      )
    } catch (err) {
      return e.json(500, {
        error: 'Não foi possível carregar os logs do Doctor ID: ' + err.message,
      })
    }
  },
  $apis.requireAuth(),
)
