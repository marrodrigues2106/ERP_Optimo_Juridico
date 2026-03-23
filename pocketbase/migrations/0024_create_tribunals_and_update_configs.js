migrate(
  (app) => {
    const tribunals = new Collection({
      name: 'tribunals',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'alias', type: 'text', required: true },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_tribunals_name ON tribunals (name)',
        'CREATE INDEX idx_tribunals_alias ON tribunals (alias)',
      ],
    })
    app.save(tribunals)

    const configs = app.findCollectionByNameOrId('monitoring_configs')
    if (!configs.fields.getByName('lastStatus')) {
      configs.fields.add(new NumberField({ name: 'lastStatus' }))
    }
    if (!configs.fields.getByName('lastLatency')) {
      configs.fields.add(new NumberField({ name: 'lastLatency' }))
    }
    if (!configs.fields.getByName('lastError')) {
      configs.fields.add(new TextField({ name: 'lastError' }))
    }
    app.save(configs)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('tribunals'))
    } catch (e) {}

    try {
      const configs = app.findCollectionByNameOrId('monitoring_configs')
      configs.fields.removeByName('lastStatus')
      configs.fields.removeByName('lastLatency')
      configs.fields.removeByName('lastError')
      app.save(configs)
    } catch (e) {}
  },
)
