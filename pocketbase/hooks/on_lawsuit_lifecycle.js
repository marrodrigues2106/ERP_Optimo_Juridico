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

function fetchAndMergeDatajud(record) {
  try {
    const num = record.get('number') || ''
    const cleanNum = String(num).replace(/\D/g, '')

    if (cleanNum.length !== 20) {
      record.set('datajudStatus', 'Error: Invalid Number')
      return false
    }

    const alias = getCourtAliasFromNumber(cleanNum)
    if (!alias) {
      record.set('datajudStatus', 'Error: Unknown Tribunal')
      return false
    }

    let res
    try {
      const url = 'https://api-publica.datajud.cnj.jus.br/api_publica_' + alias + '/_search'
      res = $http.send({
        url: url,
        method: 'POST',
        headers: {
          Authorization: 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: { match: { numeroProcesso: cleanNum } },
        }),
        timeout: 15,
      })
    } catch (err) {
      record.set('datajudStatus', 'Error: Connection Failed')
      console.log('Datajud Error: ', err)
      return false
    }

    if (res.statusCode !== 200) {
      record.set('datajudStatus', 'Error: API ' + res.statusCode)
      return false
    }

    let data
    try {
      data = res.json
    } catch (err) {
      record.set('datajudStatus', 'Error: Invalid Response format')
      return false
    }

    if (!data || !data.hits || !data.hits.hits || data.hits.hits.length === 0) {
      record.set('datajudStatus', 'Not Found')
      return false
    }

    const proc = data.hits.hits[0]._source
    const movimentos = proc.movimentos || []

    // Extract process metadata when available
    if (proc.orgaoJulgador && proc.orgaoJulgador.nomeOrgao) {
      record.set('court', proc.orgaoJulgador.nomeOrgao)
    }

    const newLogs = []
    for (let i = 0; i < movimentos.length; i++) {
      const m = movimentos[i]
      newLogs.push({
        date: m.dataHora || new Date().toISOString(),
        description: m.nome || m.descricao || 'Movimentação Datajud',
        complementos: m.complementosTabelados || [],
        isManual: false,
      })
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

    // Apply raw array directly to prevent validation errors with JSON parsing during hook assignment
    record.set('trackingLogs', allLogs)
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
      const users = $app.findRecordsByFilter('users', '', '', 100, 0)
      for (let i = 0; i < users.length; i++) {
        notifyUserIds.push(users[i].id)
      }
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
          $app.findFirstRecordByFilter(
            'lawsuit_notifications',
            'lawsuit = {:lawsuit} && update_content = {:content} && user = {:user}',
            {
              lawsuit: record.id,
              content: log.description,
              user: uid,
            },
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
