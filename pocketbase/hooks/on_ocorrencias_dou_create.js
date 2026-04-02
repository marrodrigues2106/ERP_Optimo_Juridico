onRecordAfterCreateSuccess((e) => {
  const record = e.record

  try {
    record.set('status_alerta', 'enviado')
    $app.saveNoValidate(record)

    const logs = $app.findCollectionByNameOrId('logs_processamento')
    let logRec = new Record(logs)
    logRec.set('publicacao_id', record.get('publicacao_id'))
    logRec.set('etapa', 'Alerta')
    logRec.set('status', 'Sucesso')
    logRec.set('mensagem', 'Alerta gerado e enviado para a ocorrência ' + record.id)
    logRec.set('data_hora', new Date().toISOString().replace('T', ' ').substring(0, 19))
    $app.save(logRec)
  } catch (err) {
    console.error('[DOU] Error creating occurrence alert', err)
  }

  e.next()
}, 'ocorrencias_dou')
