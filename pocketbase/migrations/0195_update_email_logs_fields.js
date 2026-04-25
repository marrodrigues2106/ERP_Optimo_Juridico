migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('email_logs')
    if (!col.fields.getByName('to')) {
      col.fields.add(new TextField({ name: 'to' }))
    }
    if (!col.fields.getByName('subject')) {
      col.fields.add(new TextField({ name: 'subject' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('email_logs')
    if (col.fields.getByName('to')) col.fields.removeByName('to')
    if (col.fields.getByName('subject')) col.fields.removeByName('subject')
    app.save(col)
  },
)
