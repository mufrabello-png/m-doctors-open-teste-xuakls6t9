migrate(
  (app) => {
    var removeAccents = function (s) {
      if (!s) return ''
      var accented = 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ'
      var unaccented = 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
      var result = String(s)
      for (var i = 0; i < accented.length; i++) {
        result = result.split(accented[i]).join(unaccented[i])
      }
      return result
    }

    var normalizeVacant = function (s) {
      if (!s) return false
      var n = removeAccents(String(s)).toLowerCase().trim()
      return n === 'sem profissional' || n === 'sem proficional'
    }

    var updatedPlantoes = 0
    var offset = 0
    var hasMore = true

    while (hasMore) {
      var records = app.findRecordsByFilter('plantoes', '', 'created', 200, offset)
      if (records.length === 0) {
        hasMore = false
        break
      }

      for (var i = 0; i < records.length; i++) {
        var record = records[i]
        var changed = false

        var pessoaNome = record.getString('pessoaNome')
        if (!pessoaNome || pessoaNome.trim() === '' || normalizeVacant(pessoaNome)) {
          if (pessoaNome !== 'sem profissional') {
            record.set('pessoaNome', 'sem profissional')
            changed = true
          }
        }

        var pessoaNomeAtribuicao = record.getString('pessoaNomeAtribuicao')
        if (normalizeVacant(pessoaNomeAtribuicao)) {
          if (pessoaNomeAtribuicao !== 'sem profissional') {
            record.set('pessoaNomeAtribuicao', 'sem profissional')
            changed = true
          }
        }

        if (changed) {
          app.saveNoValidate(record)
          updatedPlantoes++
        }
      }

      offset += records.length
      if (records.length < 200) hasMore = false
    }

    var updatedShifts = 0
    try {
      offset = 0
      hasMore = true

      while (hasMore) {
        var shiftRecords = app.findRecordsByFilter('shifts', '', 'created', 200, offset)
        if (shiftRecords.length === 0) {
          hasMore = false
          break
        }

        for (var j = 0; j < shiftRecords.length; j++) {
          var sRecord = shiftRecords[j]
          var doctorName = sRecord.getString('doctor_name')
          if (!doctorName || doctorName.trim() === '' || normalizeVacant(doctorName)) {
            if (doctorName !== 'sem profissional') {
              sRecord.set('doctor_name', 'sem profissional')
              app.saveNoValidate(sRecord)
              updatedShifts++
            }
          }
        }

        offset += shiftRecords.length
        if (shiftRecords.length < 200) hasMore = false
      }
    } catch (_) {}

    console.log(
      'Normalization complete: ' +
        updatedPlantoes +
        ' plantoes, ' +
        updatedShifts +
        ' shifts updated',
    )
  },
  (app) => {
    // Data normalization is one-way — no meaningful rollback
  },
)
