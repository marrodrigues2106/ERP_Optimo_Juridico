migrate(
  (app) => {
    try {
      app.findCollectionByNameOrId('pje_communications')
      return
    } catch (_) {}

    let orgColId = null
    try {
      orgColId = app.findCollectionByNameOrId('organizations').id
    } catch (_) {
      try {
        orgColId = app.findCollectionByNameOrId('organizacoes').id
      } catch (_) {}
    }

    let casesColId = null
    try {
      casesColId = app.findCollectionByNameOrId('cases').id
    } catch (_) {
      try {
        casesColId = app.findCollectionByNameOrId('processos').id
      } catch (_) {}
    }

    const fields = [
      { name: 'is_read', type: 'bool' },
      { name: 'is_archived', type: 'bool' },
      { name: 'data_disponibilizacao', type: 'date' },
      { name: 'numero_processo', type: 'text' },
      { name: 'tipo_comunicacao', type: 'text' },
      { name: 'sigla_tribunal', type: 'text' },
      { name: 'texto', type: 'text' },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ]

    if (orgColId) {
      fields.push({ name: 'organization', type: 'relation', collectionId: orgColId, maxSelect: 1 })
    }

    if (casesColId) {
      fields.push({ name: 'linked_case', type: 'relation', collectionId: casesColId, maxSelect: 1 })
    }

    const collection = new Collection({
      name: 'pje_communications',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: fields,
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('pje_communications')
      app.delete(collection)
    } catch (_) {}
  },
)
