routerAdd(
  'GET',
  '/backend/v1/settings',
  (e) => {
    try {
      const records = $app.findRecordsByFilter('configuracoes_sistema', '1=1', '', 100, 0)
      const result = {}
      const key = $secrets.get('PB_INSTANCE_URL') || 'fallback_key_12345678901234567890'
      for (const record of records) {
        try {
          result[record.getString('chave')] = $security.decrypt(record.getString('valor'), key)
        } catch (_) {
          result[record.getString('chave')] = ''
        }
      }
      return e.json(200, result)
    } catch (err) {
      return e.json(500, { error: err.message })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/settings',
  (e) => {
    try {
      const body = e.requestInfo().body
      const col = $app.findCollectionByNameOrId('configuracoes_sistema')
      const key = $secrets.get('PB_INSTANCE_URL') || 'fallback_key_12345678901234567890'

      for (const [k, v] of Object.entries(body)) {
        if (typeof v !== 'string') continue

        let record
        try {
          record = $app.findFirstRecordByData('configuracoes_sistema', 'chave', k)
        } catch (_) {
          record = new Record(col)
          record.set('chave', k)
        }

        record.set('valor', $security.encrypt(v, key))
        $app.save(record)
      }

      return e.json(200, { success: true })
    } catch (err) {
      return e.json(500, { error: err.message })
    }
  },
  $apis.requireAuth(),
)
