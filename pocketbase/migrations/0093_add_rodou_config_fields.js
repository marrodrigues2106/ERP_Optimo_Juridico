migrate(
  (app) => {
    const configs = app.findCollectionByNameOrId('monitoring_configs')

    if (!configs.fields.getByName('is_exact_search')) {
      configs.fields.add(new BoolField({ name: 'is_exact_search' }))
    }
    if (!configs.fields.getByName('ignore_signature_match')) {
      configs.fields.add(new BoolField({ name: 'ignore_signature_match' }))
    }
    if (!configs.fields.getByName('department_ignore')) {
      configs.fields.add(new TextField({ name: 'department_ignore' }))
    }
    if (!configs.fields.getByName('dou_sections')) {
      configs.fields.add(new TextField({ name: 'dou_sections' }))
    }
    if (!configs.fields.getByName('territory_id')) {
      configs.fields.add(new TextField({ name: 'territory_id' }))
    }

    app.save(configs)
  },
  (app) => {
    const configs = app.findCollectionByNameOrId('monitoring_configs')
    configs.fields.removeByName('is_exact_search')
    configs.fields.removeByName('ignore_signature_match')
    configs.fields.removeByName('department_ignore')
    configs.fields.removeByName('dou_sections')
    configs.fields.removeByName('territory_id')
    app.save(configs)
  },
)
