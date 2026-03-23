migrate(
  (app) => {
    const configs = app.findCollectionByNameOrId('monitoring_configs')

    if (!configs.fields.getByName('tribunalStatus')) {
      configs.fields.add(new NumberField({ name: 'tribunalStatus' }))
    }
    if (!configs.fields.getByName('tribunalLatency')) {
      configs.fields.add(new NumberField({ name: 'tribunalLatency' }))
    }
    if (!configs.fields.getByName('tribunalError')) {
      configs.fields.add(new TextField({ name: 'tribunalError' }))
    }
    if (!configs.fields.getByName('douStatus')) {
      configs.fields.add(new NumberField({ name: 'douStatus' }))
    }
    if (!configs.fields.getByName('douLatency')) {
      configs.fields.add(new NumberField({ name: 'douLatency' }))
    }
    if (!configs.fields.getByName('douError')) {
      configs.fields.add(new TextField({ name: 'douError' }))
    }

    app.save(configs)
  },
  (app) => {
    const configs = app.findCollectionByNameOrId('monitoring_configs')

    configs.fields.removeByName('tribunalStatus')
    configs.fields.removeByName('tribunalLatency')
    configs.fields.removeByName('tribunalError')
    configs.fields.removeByName('douStatus')
    configs.fields.removeByName('douLatency')
    configs.fields.removeByName('douError')

    app.save(configs)
  },
)
