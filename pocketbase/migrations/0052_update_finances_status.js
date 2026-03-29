migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('finances')
    col.fields.removeByName('status')
    col.fields.add(
      new SelectField({
        name: 'status',
        values: ['orçado', 'estimado', 'realizada', 'recebida', 'previsto', 'realizado', 'pago'],
        maxSelect: 1,
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('finances')
    col.fields.removeByName('status')
    col.fields.add(
      new TextField({
        name: 'status',
      }),
    )
    app.save(col)
  },
)
