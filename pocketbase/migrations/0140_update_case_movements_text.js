migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('case_movements')
    let changed = false

    if (!col.fields.getByName('details')) {
      col.fields.add(new TextField({ name: 'details' }))
      changed = true
    }

    if (!col.fields.getByName('movement_details')) {
      col.fields.add(new JSONField({ name: 'movement_details' }))
      changed = true
    }

    if (changed) {
      app.save(col)
    }
  },
  (app) => {
    // Safe to leave as-is to prevent data loss on rollback
  },
)
