migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('case_movements')
    const field = col.fields.getByName('source')
    if (field) {
      const vals = new Set(field.values || [])
      vals.add('PJe')
      field.values = Array.from(vals)
      col.fields.add(field)
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('case_movements')
    const field = col.fields.getByName('source')
    if (field) {
      field.values = ['DataJud', 'Tribunal', 'Diário', 'Manual']
      col.fields.add(field)
      app.save(col)
    }
  },
)
