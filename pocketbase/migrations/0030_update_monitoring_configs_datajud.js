migrate(
  (app) => {
    const configs = app.findCollectionByNameOrId('monitoring_configs')

    if (!configs.fields.getByName('datajudLastCheckAt')) {
      configs.fields.add(new DateField({ name: 'datajudLastCheckAt' }))
    }
    if (!configs.fields.getByName('datajudLastError')) {
      configs.fields.add(new TextField({ name: 'datajudLastError' }))
    }
    if (!configs.fields.getByName('datajudStatus')) {
      configs.fields.add(new TextField({ name: 'datajudStatus' }))
    }

    app.save(configs)
  },
  (app) => {
    const configs = app.findCollectionByNameOrId('monitoring_configs')

    configs.fields.removeByName('datajudLastCheckAt')
    configs.fields.removeByName('datajudLastError')
    configs.fields.removeByName('datajudStatus')

    app.save(configs)
  },
)
