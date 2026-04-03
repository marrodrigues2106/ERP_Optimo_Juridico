migrate(
  (app) => {
    const tribunals = [
      { name: 'STF', alias: 'stf' },
      { name: 'STJ', alias: 'stj' },
      { name: 'TST', alias: 'tst' },
      { name: 'TSE', alias: 'tse' },
      { name: 'TRF1', alias: 'trf1' },
      { name: 'TRF2', alias: 'trf2' },
      { name: 'TRF3', alias: 'trf3' },
      { name: 'TRF4', alias: 'trf4' },
      { name: 'TRF5', alias: 'trf5' },
      { name: 'TRF6', alias: 'trf6' },
      { name: 'TJRJ', alias: 'tjrj' },
      { name: 'TJSP', alias: 'tjsp' },
      { name: 'TJMG', alias: 'tjmg' },
      { name: 'TJRS', alias: 'tjrs' },
      { name: 'TJPR', alias: 'tjpr' },
      { name: 'TJSC', alias: 'tjsc' },
      { name: 'TJBA', alias: 'tjba' },
      { name: 'TJDFT', alias: 'tjdft' },
      { name: 'TJPE', alias: 'tjpe' },
      { name: 'TJCE', alias: 'tjce' },
      { name: 'TJGO', alias: 'tjgo' },
    ]

    let col
    try {
      col = app.findCollectionByNameOrId('tribunals')
    } catch (err) {
      return // collection doesn't exist yet, ignore
    }

    for (const t of tribunals) {
      try {
        app.findFirstRecordByData('tribunals', 'alias', t.alias)
      } catch (_) {
        const record = new Record(col)
        record.set('name', t.name)
        record.set('alias', t.alias)
        record.set('active', true)
        app.save(record)
      }
    }
  },
  (app) => {
    // down migration
  },
)
