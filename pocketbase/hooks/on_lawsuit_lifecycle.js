function getCourtAlias(courtName) {
  if (!courtName) return null
  const lower = String(courtName).toLowerCase()
  if (lower.indexOf('tjrj') > -1 || lower.indexOf('rio de janeiro') > -1) return 'tjrj'
  if (lower.indexOf('tjsp') > -1 || lower.indexOf('são paulo') > -1) return 'tjsp'
  if (lower.indexOf('tjmg') > -1 || lower.indexOf('minas gerais') > -1) return 'tjmg'
  if (lower.indexOf('tjrs') > -1 || lower.indexOf('rio grande do sul') > -1) return 'tjrs'
  if (lower.indexOf('tjpr') > -1 || lower.indexOf('paraná') > -1) return 'tjpr'
  if (lower.indexOf('tjsc') > -1 || lower.indexOf('santa catarina') > -1) return 'tjsc'
  if (lower.indexOf('tjdf') > -1 || lower.indexOf('distrito federal') > -1) return 'tjdft'
  if (lower.indexOf('stj') > -1 || lower.indexOf('superior tribunal') > -1) return 'stj'
  if (lower.indexOf('stf') > -1 || lower.indexOf('supremo') > -1) return 'stf'
  if (lower.indexOf('tst') > -1 || lower.indexOf('trabalho') > -1) return 'tst'

  const match = lower.match(/(tj[a-z]{2}|stj|stf|tst|trt\d+|trf\d+|trf|tre\d+)/)
  if (match) {
    if (match[1] === 'tjdf') return 'tjdft'
    return match[1]
  }
  return null
}

function fetchAndMergeDatajud(record) {
  const num = record.get('number') || ''
  const court = record.get('court') || ''

  if (!num) {
    record.set('datajudStatus', 'Sem número de processo')
    return false
  }

  const cleanNum = String(num).replace(/\D/g, '')
  if (cleanNum.length < 10) {
    record.set('datajudStatus', 'Número inválido')
    return false
  }

  const courtAlias = getCourtAlias(String(court))
  if (!courtAlias) {
    record.set('datajudStatus', 'Tribunal não suportado')
    return false
  }

  try {
    const url = 'https://api-publica.datajud.cnj.jus.br/api_publica_' + courtAlias + '/_search'
    const res = $http.send({
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

    if (res.statusCode !== 200) {
      record.set('datajudStatus', 'API Error: ' + res.statusCode)
      return false
    }

    const data = res.json
    if (!data || !data.hits || !data.hits.hits || data.hits.hits.length === 0) {
      record.set('datajudStatus', 'Sem resultados no Datajud')
      return false
    }

    const proc = data.hits.hits[0]._source
    const movimentos = proc.movimentos || []

    let existingLogsRaw = record.get('trackingLogs')
    let existingLogs = []
    if (existingLogsRaw) {
      try {
        existingLogs = JSON.parse(JSON.stringify(existingLogsRaw))
      } catch (e) {}
    }
    if (!Array.isArray(existingLogs)) {
      existingLogs = []
    }

    const existingDescs = existingLogs.map((l) => (l && l.description ? l.description : null))

    let changed = false
    const allLogs = [...existingLogs]

    for (let i = 0; i < movimentos.length; i++) {
      const mov = movimentos[i]
      const desc = mov.nome || mov.descricao || 'Movimentação Datajud'
      const dateStr = mov.dataHora || new Date().toISOString()

      if (existingDescs.indexOf(desc) === -1) {
        allLogs.push({ date: dateStr, description: desc })
        changed = true
      }
    }

    if (changed) {
      allLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      record.set('trackingLogs', allLogs)
    }

    record.set('datajudStatus', 'Synced')
    return changed
  } catch (err) {
    record.set('datajudStatus', 'Connection Error')
    console.log('Datajud Error: ', err)
    return false
  }
}

function createNotifications(record) {
  let logsRaw = record.get('trackingLogs')
  let logs = []
  if (logsRaw) {
    try {
      logs = JSON.parse(JSON.stringify(logsRaw))
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

  const notifsCol = $app.findCollectionByNameOrId('lawsuit_notifications')

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
}

onRecordCreate((e) => {
  fetchAndMergeDatajud(e.record)
  e.next()
}, 'lawsuits')

onRecordUpdate((e) => {
  if (e.record.get('datajudStatus') === 'Sync Requested') {
    fetchAndMergeDatajud(e.record)
  }
  e.next()
}, 'lawsuits')

onRecordAfterCreateSuccess((e) => {
  createNotifications(e.record)

  if (e.record.get('notifyClient') && e.record.get('client')) {
    console.log(
      `[SIMULATION] Notificando cliente via e-mail sobre atualização: ${e.record.get('parties')}`,
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
