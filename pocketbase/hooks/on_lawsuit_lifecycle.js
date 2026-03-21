routerAdd('GET', '/backend/v1/datajud/health', (e) => {
  try {
    const res = $http.send({
      url: 'https://api-publica.datajud.cnj.jus.br/api_publica_stf/_search',
      method: 'POST',
      headers: {
        Authorization: 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ size: 1, query: { match_all: {} } }),
      timeout: 10,
    })

    if (res.statusCode === 200) {
      return e.json(200, { status: 'online' })
    }
    return e.json(200, { status: 'error', detail: 'HTTP ' + res.statusCode })
  } catch (err) {
    return e.json(200, { status: 'error', detail: err.message || 'Request failed' })
  }
})

function getCourtAliasFromNumber(numStr) {
  if (!numStr) return null
  const cleanNum = String(numStr).replace(/\D/g, '')
  if (cleanNum.length !== 20) return null

  const j = cleanNum.substring(13, 14)
  const tr = cleanNum.substring(14, 16)

  if (j === '4') {
    return 'trf' + parseInt(tr, 10)
  }
  if (j === '5') {
    return 'trt' + parseInt(tr, 10)
  }
  if (j === '8') {
    const stateMap = {
      1: 'tjac',
      2: 'tjal',
      3: 'tjap',
      4: 'tjam',
      5: 'tjba',
      6: 'tjce',
      7: 'tjdft',
      8: 'tjes',
      9: 'tjgo',
      10: 'tjma',
      11: 'tjmt',
      12: 'tjms',
      13: 'tjmg',
      14: 'tjpa',
      15: 'tjpb',
      16: 'tjpr',
      17: 'tjpe',
      18: 'tjpi',
      19: 'tjrj',
      20: 'tjrn',
      21: 'tjrs',
      22: 'tjro',
      23: 'tjrr',
      24: 'tjsc',
      25: 'tjse',
      26: 'tjsp',
      27: 'tjto',
    }
    return stateMap[parseInt(tr, 10)] || null
  }

  if (j === '1') return 'stf'
  if (j === '2') return 'cnj'
  if (j === '3') return 'stj'
  if (j === '6') return 'tse'
  if (j === '7') return 'stm'

  return null
}

function getCourtAliasFromName(courtStr) {
  if (!courtStr) return null
  const cleanStr = String(courtStr)
    .toLowerCase()
    .replace(/[\/\-\s.,]/g, '')
  const regex = /(stf|stj|tse|stm|cnj|tj[a-z]{2}|trf[0-9]+|trt[0-9]+|tre[a-z]{2})/
  const match = cleanStr.match(regex)
  if (match) return match[0]
  return cleanStr.replace(/[^a-z0-9]/g, '')
}

function getSafeLogs(record) {
  let raw = record.get('trackingLogs')
  if (!raw) return []
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      return []
    }
  }
  if (Array.isArray(raw)) return raw
  try {
    const parsed = JSON.parse(JSON.stringify(raw))
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

function addErrorLog(record, message) {
  let existingLogs = getSafeLogs(record)
  existingLogs.push({
    date: new Date().toISOString(),
    description: message,
    isManual: false,
    complementos: [],
  })
  record.set('trackingLogs', existingLogs)
}

function fetchAndMergeDatajud(record) {
  try {
    const num = record.get('number') || ''
    const cleanNum = String(num).replace(/\D/g, '')

    if (cleanNum.length !== 20) {
      record.set('datajudStatus', 'Sync Failed')
      addErrorLog(
        record,
        'Falha na sincronização: Número do processo inválido (' +
          cleanNum +
          '). O número deve conter 20 dígitos.',
      )
      return false
    }

    let alias = null
    const courtName = record.get('court')

    if (courtName) alias = getCourtAliasFromName(courtName)
    if (!alias) alias = getCourtAliasFromNumber(cleanNum)

    if (!alias) {
      record.set('datajudStatus', 'Sync Failed')
      addErrorLog(
        record,
        'Falha na sincronização: Não foi possível identificar o tribunal (Órgão) pelo nome ou número.',
      )
      return false
    }

    const url = 'https://api-publica.datajud.cnj.jus.br/api_publica_' + alias + '/_search'
    let allHits = []
    let searchAfter = null
    const pageSize = 100
    let loopCount = 0

    while (loopCount < 10) {
      loopCount++
      let bodyObj = {
        size: pageSize,
        query: {
          bool: {
            filter: [{ term: { numeroProcesso: cleanNum } }],
          },
        },
        sort: [{ '@timestamp': { order: 'asc' } }],
      }
      if (searchAfter) bodyObj.search_after = searchAfter

      let res
      try {
        res = $http.send({
          url: url,
          method: 'POST',
          headers: {
            Authorization: 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyObj),
          timeout: 30,
        })
      } catch (err) {
        record.set('datajudStatus', 'Sync Failed')
        const errMsg = err && err.message ? err.message : String(err)
        addErrorLog(
          record,
          'Falha na sincronização de rede com a API DataJud (' + url + '): ' + errMsg,
        )
        return false
      }

      if (res.statusCode !== 200) {
        record.set('datajudStatus', 'Sync Failed')
        addErrorLog(
          record,
          'Falha na sincronização: A API DataJud retornou status ' + res.statusCode,
        )
        return false
      }

      let data
      try {
        data = res.json
      } catch (err) {
        record.set('datajudStatus', 'Sync Failed')
        addErrorLog(record, 'Falha na sincronização: Resposta da API DataJud em formato inválido.')
        return false
      }

      if (!data || !data.hits || !data.hits.hits) break
      const hits = data.hits.hits
      if (!Array.isArray(hits) || hits.length === 0) break

      for (let i = 0; i < hits.length; i++) allHits.push(hits[i])
      if (hits.length < pageSize) break

      const lastHit = hits[hits.length - 1]
      if (lastHit && lastHit.sort && lastHit.sort.length > 0) {
        searchAfter = lastHit.sort
      } else {
        break
      }
    }

    if (allHits.length === 0) {
      record.set('datajudStatus', 'Not Found')
      return false
    }

    for (let i = 0; i < allHits.length; i++) {
      const proc = allHits[i]?._source
      if (proc && proc.orgaoJulgador && proc.orgaoJulgador.nomeOrgao) {
        if (!record.get('court')) record.set('court', proc.orgaoJulgador.nomeOrgao)
        break
      }
    }

    const newLogs = []
    const uniqueKeys = {}

    for (let i = 0; i < allHits.length; i++) {
      const proc = allHits[i]?._source
      const movimentos = proc?.movimentos || []
      for (let j = 0; j < movimentos.length; j++) {
        const m = movimentos[j]
        const dateStr = m.dataHora || new Date().toISOString()
        const descStr = m.nome || m.descricao || 'Movimentação Datajud'
        const dedupKey = dateStr + '_' + descStr

        if (!uniqueKeys[dedupKey]) {
          uniqueKeys[dedupKey] = true
          newLogs.push({
            date: dateStr,
            description: descStr,
            complementos: Array.isArray(m.complementosTabelados) ? m.complementosTabelados : [],
            isManual: false,
          })
        }
      }
    }

    const existingLogs = getSafeLogs(record)
    const manualLogs = []
    const errorLogs = []

    for (let i = 0; i < existingLogs.length; i++) {
      const log = existingLogs[i]
      if (log) {
        if (log.isManual) manualLogs.push(log)
        else if (log.description && String(log.description).startsWith('Falha')) errorLogs.push(log)
      }
    }

    const allLogs = manualLogs.concat(errorLogs).concat(newLogs)
    allLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    record.set('trackingLogs', allLogs)
    record.set('datajudStatus', 'Success')
    return true
  } catch (globalErr) {
    console.log('Global error in fetchAndMergeDatajud:', globalErr)
    record.set('datajudStatus', 'Sync Failed')
    const errMsg = globalErr && globalErr.message ? globalErr.message : String(globalErr)
    addErrorLog(record, 'Falha inesperada no processamento da sincronização DataJud: ' + errMsg)
    return false
  }
}

function createNotifications(record) {
  try {
    const logs = getSafeLogs(record)
    if (logs.length === 0) return

    let notifyUserIds = []
    try {
      const users = $app.findRecordsByFilter('users', '1=1', '', 100, 0)
      for (let i = 0; i < users.length; i++) notifyUserIds.push(users[i].id)
    } catch (e) {}

    if (notifyUserIds.length === 0) return
    let notifsCol
    try {
      notifsCol = $app.findCollectionByNameOrId('lawsuit_notifications')
    } catch (e) {
      return
    }

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i]
      if (!log || !log.description) continue

      for (let j = 0; j < notifyUserIds.length; j++) {
        const uid = notifyUserIds[j]
        try {
          const safeContent = String(log.description).replace(/'/g, "''").replace(/\\/g, '\\\\')
          $app.findFirstRecordByFilter(
            'lawsuit_notifications',
            `lawsuit = '${record.id}' && update_content = '${safeContent}' && user = '${uid}'`,
          )
        } catch (e) {
          try {
            const n = new Record(notifsCol)
            n.set('lawsuit', record.id)
            n.set('update_content', log.description)
            n.set('user', uid)
            n.set('is_read', false)
            $app.saveNoValidate(n)
          } catch (saveErr) {}
        }
      }
    }
  } catch (globalErr) {
    console.log('Global error in createNotifications:', globalErr)
  }
}

function logDatajudAudit(e, actionName, details) {
  try {
    const logs = $app.findCollectionByNameOrId('audit_logs')
    const logRecord = new Record(logs)
    logRecord.set('collection_name', 'lawsuits')
    logRecord.set('record_id', e.record?.id || '')
    logRecord.set('action', actionName)
    logRecord.set('changes', details)
    $app.saveNoValidate(logRecord)
  } catch (err) {
    console.log('Audit log err (Datajud):', err)
  }
}

onRecordCreate((e) => {
  try {
    fetchAndMergeDatajud(e.record)
    logDatajudAudit(e, 'datajud_sync_create', { status: e.record.get('datajudStatus') })
  } catch (err) {
    console.log('Error in Datajud hook on create:', err)
  }
  e.next()
}, 'lawsuits')

onRecordUpdate((e) => {
  if (e.record.get('datajudStatus') === 'Sync Requested') {
    try {
      fetchAndMergeDatajud(e.record)
      logDatajudAudit(e, 'datajud_sync_update', {
        status: e.record.get('datajudStatus'),
        court: e.record.get('court'),
      })
    } catch (err) {
      console.log('Error in Datajud hook on update:', err)
      e.record.set('datajudStatus', 'Sync Failed')
      const errMsg = err && err.message ? err.message : String(err)
      addErrorLog(e.record, 'Falha crítica na sincronização DataJud: ' + errMsg)
      logDatajudAudit(e, 'datajud_sync_error', { error: err.toString() })
    }
  }
  e.next()
}, 'lawsuits')

onRecordAfterCreateSuccess((e) => {
  createNotifications(e.record)
  if (e.record.get('notifyClient') && e.record.get('client')) {
    console.log(
      `[SIMULATION] Notificando cliente via e-mail sobre criação: ${e.record.get('parties')}`,
    )
  }
  e.next()
}, 'lawsuits')

onRecordAfterUpdateSuccess((e) => {
  createNotifications(e.record)
  if (e.record.get('notifyClient') && e.record.get('client')) {
    console.log(
      `[SIMULATION] Notificando cliente via e-mail sobre atualização: ${e.record.get('parties')}`,
    )
  }
  e.next()
}, 'lawsuits')

onRecordAfterCreateSuccess((e) => {
  const record = e.record
  if (record.get('linked_lawsuit')) {
    try {
      const lawsuit = $app.findRecordById('lawsuits', record.get('linked_lawsuit'))
      if (lawsuit.get('notifyClient') && lawsuit.get('client')) {
        console.log(
          `[SIMULATION] Notificando cliente via e-mail sobre novo evento na agenda: ${record.get('title')}`,
        )
      }
    } catch (err) {}
  }
  e.next()
}, 'agenda_events')
