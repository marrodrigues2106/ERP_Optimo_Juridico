migrate(
  (app) => {
    const lawsuits = app.findCollectionByNameOrId('lawsuits')

    const r1 = new Record(lawsuits)
    r1.set('number', '1000001-01.2020.4.01.3800')
    r1.set('parties', 'João da Silva vs. INSS (Seed TRF1)')
    r1.set('entryType', 'Processo')
    r1.set('trackingSource', 'Ambos')
    r1.set('datajudStatus', 'Pending')
    r1.set('status', 'Ativo')
    app.save(r1)

    const r2 = new Record(lawsuits)
    r2.set('number', '0000001-01.2020.8.19.0001')
    r2.set('parties', 'Maria Souza vs. Estado (Seed TJRJ)')
    r2.set('entryType', 'Processo')
    r2.set('trackingSource', 'Ambos')
    r2.set('datajudStatus', 'Pending')
    r2.set('status', 'Ativo')
    app.save(r2)
  },
  (app) => {
    try {
      const r1 = app.findFirstRecordByFilter('lawsuits', "number = '1000001-01.2020.4.01.3800'")
      if (r1) app.delete(r1)
    } catch (e) {}
    try {
      const r2 = app.findFirstRecordByFilter('lawsuits', "number = '0000001-01.2020.8.19.0001'")
      if (r2) app.delete(r2)
    } catch (e) {}
  },
)
