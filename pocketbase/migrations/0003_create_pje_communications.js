migrate(
  (app) => {
    let orgCol
    try {
      orgCol = app.findCollectionByNameOrId('organizations')
    } catch (_) {
      try {
        orgCol = app.findCollectionByNameOrId('organizacoes')
      } catch (_) {}
    }

    let casesCol
    try {
      casesCol = app.findCollectionByNameOrId('cases')
    } catch (_) {
      try {
        casesCol = app.findCollectionByNameOrId('processos')
      } catch (_) {}
    }

    const fields = [
      { name: 'is_read', type: 'bool' },
      { name: 'is_archived', type: 'bool' },
      { name: 'dataDisponibilizacao', type: 'date' },
      { name: 'numeroProcesso', type: 'text' },
      { name: 'tipoComunicacao', type: 'text' },
      { name: 'siglaTribunal', type: 'text' },
      { name: 'texto', type: 'text' },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ]

    if (orgCol) {
      fields.push({ name: 'organization', type: 'relation', collectionId: orgCol.id, maxSelect: 1 })
    }

    if (casesCol) {
      fields.push({
        name: 'linked_case',
        type: 'relation',
        collectionId: casesCol.id,
        maxSelect: 1,
      })
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
    const collection = app.findCollectionByNameOrId('pje_communications')
    app.delete(collection)
  },
)
