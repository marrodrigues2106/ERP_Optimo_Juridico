migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('crm_interactions')
    if (!col.fields.getByName('title')) {
      col.fields.add(new TextField({ name: 'title' }))
    }
    const statusField = col.fields.getByName('status')
    if (statusField) {
      statusField.values = ['Pending', 'Completed', 'open', 'closed']
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('crm_interactions')
    col.fields.removeByName('title')
    app.save(col)
  },
)
