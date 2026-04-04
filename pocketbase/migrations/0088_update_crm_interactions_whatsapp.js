migrate(
  (app) => {
    const interactions = app.findCollectionByNameOrId('crm_interactions')
    const typeField = interactions.fields.getByName('type')
    if (typeField) {
      const values = typeField.values || []
      if (!values.includes('WhatsApp')) {
        values.push('WhatsApp')
        typeField.values = values
      }
    }
    app.save(interactions)
  },
  (app) => {
    const interactions = app.findCollectionByNameOrId('crm_interactions')
    const typeField = interactions.fields.getByName('type')
    if (typeField) {
      typeField.values = typeField.values.filter((v) => v !== 'WhatsApp')
    }
    app.save(interactions)
  },
)
