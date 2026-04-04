migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clients')
    if (!col.fields.getByName('phone_type')) {
      col.fields.add(
        new SelectField({
          name: 'phone_type',
          values: ['Fixo', 'Celular', 'WhatsApp'],
          maxSelect: 1,
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('clients')
    col.fields.removeByName('phone_type')
    app.save(col)
  },
)
