migrate(
  (app) => {
    // 1. Create monitoring_configs
    const configs = new Collection({
      name: 'monitoring_configs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'apiKey', type: 'text', required: true },
        {
          name: 'frequency',
          type: 'select',
          values: ['Hourly', 'Daily', 'Weekly'],
          required: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(configs)

    // 2. Create monitoring_terms
    const terms = new Collection({
      name: 'monitoring_terms',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'term', type: 'text', required: true },
        { name: 'type', type: 'select', values: ['DataJud', 'DOU'], required: true },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(terms)

    // 3. Update lawsuit_notifications to support generic alerts
    const notifs = app.findCollectionByNameOrId('lawsuit_notifications')

    const lawsuitField = notifs.fields.getByName('lawsuit')
    if (lawsuitField) {
      lawsuitField.required = false
    }

    if (!notifs.fields.getByName('type')) {
      notifs.fields.add(
        new SelectField({ name: 'type', maxSelect: 1, values: ['update', 'discovery'] }),
      )
    }

    if (!notifs.fields.getByName('discovered_data')) {
      notifs.fields.add(new JSONField({ name: 'discovered_data' }))
    }

    app.save(notifs)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('monitoring_terms'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('monitoring_configs'))
    } catch (e) {}
  },
)
