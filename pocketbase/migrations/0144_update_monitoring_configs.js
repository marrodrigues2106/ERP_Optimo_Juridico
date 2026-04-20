migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('monitoring_configs')

    if (col.fields.getByName('douCredentials')) col.fields.removeByName('douCredentials')
    if (col.fields.getByName('jota')) col.fields.removeByName('jota')
    if (col.fields.getByName('tribunalStatus')) col.fields.removeByName('tribunalStatus')
    if (col.fields.getByName('tribunalLatency')) col.fields.removeByName('tribunalLatency')
    if (col.fields.getByName('tribunalError')) col.fields.removeByName('tribunalError')
    if (col.fields.getByName('datajud_tribunal_status'))
      col.fields.removeByName('datajud_tribunal_status')

    app.save(col)
  },
  (app) => {
    // Reverting would require adding fields back, which we skip for structural simplicity
  },
)
