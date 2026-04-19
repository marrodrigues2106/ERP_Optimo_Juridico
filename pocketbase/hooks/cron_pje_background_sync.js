// Schedule sync for active cases every 2 hours
cronAdd('pje_scheduler', '0 */2 * * *', () => {
  try {
    $app
      .db()
      .newQuery(`
      UPDATE legal_cases
      SET pje_sync_status = 'pending'
      WHERE lifecycle_status = 'Ativo'
        AND (pje_sync_status = 'idle' OR pje_sync_status = 'error' OR pje_sync_status = '' OR pje_sync_status IS NULL)
    `)
      .execute()
  } catch (err) {
    console.log('Error in pje_scheduler cron: ' + err.message)
  }
})

// Process pending cases every minute
cronAdd('pje_worker', '* * * * *', () => {
  try {
    const pendingCases = $app.findRecordsByFilter(
      'legal_cases',
      "pje_sync_status = 'pending'",
      'updated',
      10,
      0,
    )

    if (!pendingCases || pendingCases.length === 0) return

    const logsCol = $app.findCollectionByNameOrId('pje_sync_logs')
    const movementsCol = $app.findCollectionByNameOrId('case_movements')

    for (const record of pendingCases) {
      const startTime = Date.now()
      const orgId = record.getString('organization')

      record.set('pje_sync_status', 'syncing')
      $app.saveNoValidate(record)

      let syncStatus = 'failed'
      let syncMessage = ''
      let added = 0

      try {
        const num = record.getString('case_number')
        if (!num) throw new Error('No case number')

        const cleanNum = String(num).replace(/\D/g, '')
        if (cleanNum.length !== 20) throw new Error('Invalid case number')

        const url = 'https://comunica.pje.jus.br/api/v1/comunicacao?numeroProcesso=' + cleanNum
        const res = $http.send({
          url: url,
          method: 'GET',
          headers: { Accept: 'application/json' },
          timeout: 60,
        })

        let data = null
        try {
          data = res.json
        } catch (err) {}

        if (res.statusCode === 200 && data && data.items) {
          const items = data.items

          items.forEach((item) => {
            try {
              const uniqueStr = record.id + '_' + item.hash
              const extId = item.hash || $security.md5(uniqueStr)

              try {
                $app.findFirstRecordByFilter('case_movements', `external_id = '${extId}'`)
              } catch (notfound) {
                const mov = new Record(movementsCol)
                mov.set('case', record.id)
                mov.set('event_date', item.dataDisponibilizacao || new Date().toISOString())
                mov.set('description', item.tipoComunicacao || 'Comunicação PJe')
                mov.set('details', item.texto || '')
                mov.set('source', 'PJe')
                mov.set('external_id', extId)
                if (orgId) mov.set('organization', orgId)
                $app.saveNoValidate(mov)
                added++
              }
            } catch (err) {}
          })

          syncStatus = 'success'
          syncMessage = `Sincronizado com sucesso. ${added} novas movimentações.`
          record.set('pje_sync_status', 'idle')
          record.set('pje_last_sync', new Date().toISOString())
          record.set('datajud_sync_status', 'Success')
          record.set('datajud_last_sync', new Date().toISOString())
        } else {
          if (res.statusCode === 504 || res.statusCode === 503 || res.statusCode === 502) {
            syncMessage = 'PJE_TIMEOUT: Sistema PJe indisponível.'
          } else {
            syncMessage = `PJe API Error: HTTP ${res.statusCode}`
          }
          record.set('pje_sync_status', 'error')
          record.set('datajud_sync_status', 'Error')
        }
      } catch (err) {
        record.set('pje_sync_status', 'error')
        record.set('datajud_sync_status', 'Error')
        const msg = (err.message || '').toLowerCase()
        if (
          msg.includes('context deadline exceeded') ||
          msg.includes('timeout') ||
          msg.includes('network') ||
          msg.includes('gateway')
        ) {
          syncMessage = 'PJE_TIMEOUT: Sistema PJe indisponível.'
        } else {
          syncMessage = err.message || 'Erro desconhecido'
        }
      }

      try {
        $app.saveNoValidate(record)
      } catch (e) {
        console.log('Failed to save case status: ' + e.message)
      }

      try {
        const logRecord = new Record(logsCol)
        logRecord.set('case', record.id)
        logRecord.set('status', syncStatus)
        logRecord.set('message', syncMessage)
        logRecord.set('duration', Date.now() - startTime)
        if (orgId) logRecord.set('organization', orgId)
        $app.saveNoValidate(logRecord)
      } catch (e) {
        console.log('Failed to save pje_sync_log: ' + e.message)
      }
    }
  } catch (err) {
    console.log('Error in pje_worker cron: ' + err.message)
  }
})
