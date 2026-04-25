cronAdd('pje_sync_daily', '0 8,20 * * *', () => {
  const logCol = $app.findCollectionByNameOrId('system_logs')
  const startLog = new Record(logCol)
  startLog.set('level', 'info')
  startLog.set('module', 'pje_sync')
  startLog.set('message', 'Iniciando sincronização PJe (8h/20h)')
  $app.save(startLog)

  try {
    const cases = $app.findRecordsByFilter(
      'legal_cases',
      "lifecycle_status = 'Ativo' && case_number != ''",
      '',
      2000,
      0,
    )
    let totalMovements = 0

    for (let i = 0; i < cases.length; i++) {
      const c = cases[i]
      const cleanNumber = (c.getString('case_number') || '').replace(/\D/g, '')
      if (cleanNumber.length >= 10) {
        try {
          const res = $http.send({
            url: 'https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=' + cleanNumber,
            method: 'GET',
            timeout: 15,
          })

          if (res.statusCode === 200 && res.json && res.json.items) {
            let newMovements = 0
            for (const item of res.json.items) {
              const commId =
                item.id ||
                item.numeroComunicacao ||
                item.hash ||
                `${cleanNumber}-${item.dataDisponibilizacao}`

              let isNewComm = false
              try {
                $app.findFirstRecordByData(
                  'pje_communications',
                  'numeroComunicacao',
                  String(commId),
                )
              } catch (_) {
                isNewComm = true
                const pjeCol = $app.findCollectionByNameOrId('pje_communications')
                const record = new Record(pjeCol)
                record.set('numeroProcesso', item.numeroProcesso || c.getString('case_number'))
                record.set('dataDisponibilizacao', item.dataDisponibilizacao || '')
                record.set('texto', item.texto || item.conteudo || '')
                record.set('tipoComunicacao', item.tipoComunicacao || 'Comunicação')
                record.set('siglaTribunal', item.siglaTribunal || '')
                record.set('meio', item.meio || '')
                record.set('numeroComunicacao', String(commId))
                record.set('destinatarios', item.destinatarios || [])
                record.set('advogados', item.advogados || [])
                record.set('linked_case', c.id)
                record.set('organization', c.getString('organization'))
                record.set('is_read', false)
                $app.save(record)
              }

              const extId = 'pje_' + commId
              try {
                $app.findFirstRecordByData('case_movements', 'external_id', extId)
              } catch (_) {
                const mov = new Record($app.findCollectionByNameOrId('case_movements'))
                mov.set('case', c.id)
                mov.set('event_date', item.dataDisponibilizacao || new Date().toISOString())
                mov.set('description', item.tipoComunicacao || 'Comunicação PJe (Automático)')
                mov.set('source', 'PJe')
                mov.set('external_id', extId)
                mov.set('details', item.texto || item.conteudo || '')
                mov.set('organization', c.get('organization'))
                mov.set('movement_details', item)
                if (item.link || item.url) mov.set('external_link', item.link || item.url)
                $app.save(mov)
                newMovements++
                totalMovements++
              }

              if (isNewComm) {
                const respId = c.get('responsible_collaborator')
                if (respId) {
                  try {
                    const collab = $app.findRecordById('collaborators', respId)
                    const userId = collab.get('user')
                    if (userId) {
                      const notifCol = $app.findCollectionByNameOrId('notifications')
                      const notif = new Record(notifCol)
                      notif.set('user_id', userId)
                      notif.set('numero_processo', c.getString('case_number'))
                      notif.set('message', `Nova comunicação PJe: ${item.tipoComunicacao}`)
                      notif.set('is_read', false)
                      $app.save(notif)
                    }
                  } catch (e) {}
                }
              }
            }
            c.set('sync_status', 'updated')
            c.set('last_sync_attempt', new Date().toISOString())
            $app.saveNoValidate(c)
          }
        } catch (err) {
          $app
            .logger()
            .error('PJe cron sync failed', 'case', c.getString('case_number'), 'error', err.message)
        }
      }
    }
    const endLog = new Record(logCol)
    endLog.set('level', 'info')
    endLog.set('module', 'pje_sync')
    endLog.set('message', `Sincronização PJe concluída. ${totalMovements} novas movimentações.`)
    $app.save(endLog)
  } catch (err) {
    const errorLog = new Record(logCol)
    errorLog.set('level', 'error')
    errorLog.set('module', 'pje_sync')
    errorLog.set('message', 'Falha na rotina de sincronização PJe: ' + err.message)
    $app.save(errorLog)
  }
})
