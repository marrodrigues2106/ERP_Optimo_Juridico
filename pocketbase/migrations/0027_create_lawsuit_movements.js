migrate(
  (app) => {
    const lawsuits = app.findCollectionByNameOrId('lawsuits')

    const collection = new Collection({
      name: 'lawsuit_movements',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'lawsuit',
          type: 'relation',
          required: true,
          collectionId: lawsuits.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'event_date', type: 'date', required: true },
        { name: 'description', type: 'text', required: true },
        {
          name: 'source',
          type: 'select',
          required: true,
          values: ['DataJud', 'Tribunal', 'Diario', 'Manual', 'Sistema'],
          maxSelect: 1,
        },
        { name: 'hash', type: 'text', required: true },
        { name: 'metadata', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_lawsuit_movements_hash ON lawsuit_movements (hash)',
        'CREATE INDEX idx_lawsuit_movements_lawsuit_date ON lawsuit_movements (lawsuit, event_date DESC)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('lawsuit_movements')
    app.delete(collection)
  },
)
