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
  return String(courtStr)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function fetchAndMergeDatajud(record) {
  try {
    const num = record.get('number') || ''
    const cleanNum = String(num).replace(/\D/g, '')

    if (cleanNum.length !== 20) {
      record.set('datajudStatus', 'Error: Invalid Number')
      return false
    }

    let alias = null
    const courtName = record.get('court')

    // Attempt dynamic mapping from court name first
    if (courtName) {
      alias = getCourtAliasFromName(courtName)
    }

    // Fallback to extraction from number if name doesn't provide a valid alias
    if (!alias) {
      alias = getCourtAliasFromNumber(cleanNum)
    }

    if (!alias) {
      record.set('datajudStatus', 'Error: Unknown Tribunal')
      return false
    }

    const url = 'https://api-publica.datajud.cnj.jus.br/api_publica_' + alias + '/_search'
    let allHits = []
    let searchAfter = null
    const pageSize = 100
    let loopCount = 0

    // Limit pagination to 10 pages to prevent timeouts and database lock exceptions
    while (loopCount < 10) {
      loopCount++
      let bodyObj = {
        size: pageSize,
        query: { match: { numeroProcesso: cleanNum } },
        sort: [
          {
            '@timestamp': {
              order: 'asc',
            },
          },
        ],
      }

      if (searchAfter) {
        bodyObj.search_after = searchAfter
      }

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
        record.set('datajudStatus', 'Error: Connection Failed')
        console.log('Datajud Connection Error: ', err, 'URL: ', url)
        return false
      }

      if (res.statusCode !== 200) {
        record.set('datajudStatus', 'Error: API ' + res.statusCode)
        console.log('Datajud API Error: ', res.statusCode, 'URL: ', url)
        return false
      }

      let data
      try {
        data = res.json
      } catch (err) {
        record.set('datajudStatus', 'Error: Invalid Response format')
        return false
      }

      if (!data || !data.hits || !data.hits.hits) {
        break
      }

      const hits = data.hits.hits
      if (!Array.isArray(hits) || hits.length === 0) {
        break
      }

      for (let i = 0; i < hits.length; i++) {
        allHits.push(hits[i])
      }

      if (hits.length < pageSize) {
        break // Last page reached
      }

      const lastHit = hits[hits.length - 1]
      if (lastHit && lastHit.sort && lastHit.sort.length > 0) {
        searchAfter = lastHit.sort
      } else {
        break // Failsafe
      }
    }

    if (allHits.length === 0) {
      record.set('datajudStatus', 'Not Found')
      return false
    }

    // Extract metadata from the first valid hit
    for (let i = 0; i < allHits.length; i++) {
      const proc = allHits[i]?._source
      if (proc && proc.orgaoJulgador && proc.orgaoJulgador.nomeOrgao) {
        // Only override court if it wasn't already set, avoiding replacing user short codes like "TJ-RJ"
        if (!record.get('court')) {
          record.set('court', proc.orgaoJulgador.nomeOrgao)
        }
        break
      }
    }

    const newLogs = []
    const uniqueKeys = {}

    // Extract and deduplicate all movimentos across all paginated hits
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

    let existingLogsRaw = record.get('trackingLogs')
    let existingLogs = []
    if (existingLogsRaw) {
      try {
        existingLogs =
          typeof existingLogsRaw === 'string'
            ? JSON.parse(existingLogsRaw)
            : JSON.parse(JSON.stringify(existingLogsRaw))
      } catch (e) {}
    }
    if (!Array.isArray(existingLogs)) {
      existingLogs = []
    }

    const manualLogs = []
    for (let i = 0; i < existingLogs.length; i++) {
      if (existingLogs[i] && existingLogs[i].isManual) {
        manualLogs.push(existingLogs[i])
      }
    }

    const allLogs = manualLogs.concat(newLogs)
    allLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Deep copy to completely eliminate undefined or circular references before PocketBase validation
    record.set('trackingLogs', JSON.parse(JSON.stringify(allLogs)))
    record.set('datajudStatus', 'Success')
    return true
  } catch (globalErr) {
    console.log('Global error in fetchAndMergeDatajud:', globalErr)
    record.set('datajudStatus', 'Error: Internal Error')
    return false
  }
}

function createNotifications(record) {
  try {
    let logsRaw = record.get('trackingLogs')
    let logs = []
    if (logsRaw) {
      try {
        logs =
          typeof logsRaw === 'string' ? JSON.parse(logsRaw) : JSON.parse(JSON.stringify(logsRaw))
      } catch (e) {}
    }
    if (!Array.isArray(logs) || logs.length === 0) return

    let notifyUserIds = []
    try {
      // Use "1=1" instead of empty string to avoid SQL syntax errors on PB JSVM
      const users = $app.findRecordsByFilter('users', '1=1', '', 100, 0)
      for (let i = 0; i < users.length; i++) {
        notifyUserIds.push(users[i].id)
      }
    } catch (e) {
      console.log('Error fetching users for notification:', e)
    }

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
          // Properly escape and interpolate values instead of using unsupported object bindings
          const safeContent = String(log.description).replace(/'/g, "''")
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
          } catch (saveErr) {
            console.log('Error creating notification', saveErr)
          }
        }
      }
    }
  } catch (globalErr) {
    console.log('Global error in createNotifications:', globalErr)
  }
}

onRecordCreate((e) => {
  try {
    fetchAndMergeDatajud(e.record)
  } catch (err) {
    console.log('Error in Datajud hook on create:', err)
  }
  e.next()
}, 'lawsuits')

onRecordUpdate((e) => {
  if (e.record.get('datajudStatus') === 'Sync Requested') {
    try {
      fetchAndMergeDatajud(e.record)
    } catch (err) {
      console.log('Error in Datajud hook on update:', err)
      e.record.set('datajudStatus', 'Error: Internal Error')
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
