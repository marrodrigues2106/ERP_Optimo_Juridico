migrate(
  (app) => {
    const results = app.findCollectionByNameOrId('results')
    results.fields.add(new BoolField({ name: 'is_read' }))
    results.fields.add(new BoolField({ name: 'is_archived' }))
    app.save(results)

    const dou = app.findCollectionByNameOrId('ocorrencias_dou')
    dou.fields.add(new BoolField({ name: 'is_archived' }))
    app.save(dou)

    const gazette = app.findCollectionByNameOrId('gazette_publications')
    gazette.fields.add(new BoolField({ name: 'is_archived' }))
    app.save(gazette)
  },
  (app) => {
    const results = app.findCollectionByNameOrId('results')
    results.fields.removeByName('is_read')
    results.fields.removeByName('is_archived')
    app.save(results)

    const dou = app.findCollectionByNameOrId('ocorrencias_dou')
    dou.fields.removeByName('is_archived')
    app.save(dou)

    const gazette = app.findCollectionByNameOrId('gazette_publications')
    gazette.fields.removeByName('is_archived')
    app.save(gazette)
  },
)
