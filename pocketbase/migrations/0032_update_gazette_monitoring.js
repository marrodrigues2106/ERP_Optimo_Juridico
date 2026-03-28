migrate(
  (app) => {
    // 1. Update monitoring_terms collection
    const termsCol = app.findCollectionByNameOrId('monitoring_terms')

    // Expand selectValues for type
    const typeField = termsCol.fields.getByName('type')
    if (typeField) {
      typeField.selectValues = ['DataJud', 'DOU', 'Municipal', 'State']
    }

    // Add user relation to identify who receives the notification
    if (!termsCol.fields.getByName('user')) {
      termsCol.fields.add(
        new RelationField({
          name: 'user',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }
    app.save(termsCol)

    // 2. Update monitoring_configs collection
    const configCol = app.findCollectionByNameOrId('monitoring_configs')

    if (!configCol.fields.getByName('queridoDiarioToken')) {
      configCol.fields.add(
        new TextField({
          name: 'queridoDiarioToken',
        }),
      )
    }

    if (!configCol.fields.getByName('douCredentials')) {
      configCol.fields.add(
        new JSONField({
          name: 'douCredentials',
        }),
      )
    }

    if (!configCol.fields.getByName('gazetteLastError')) {
      configCol.fields.add(
        new TextField({
          name: 'gazetteLastError',
        }),
      )
    }

    if (!configCol.fields.getByName('gazetteLastSync')) {
      configCol.fields.add(
        new DateField({
          name: 'gazetteLastSync',
        }),
      )
    }

    app.save(configCol)
  },
  (app) => {
    const termsCol = app.findCollectionByNameOrId('monitoring_terms')
    const typeField = termsCol.fields.getByName('type')
    if (typeField) {
      typeField.selectValues = ['DataJud', 'DOU']
    }
    termsCol.fields.removeByName('user')
    app.save(termsCol)

    const configCol = app.findCollectionByNameOrId('monitoring_configs')
    configCol.fields.removeByName('queridoDiarioToken')
    configCol.fields.removeByName('douCredentials')
    configCol.fields.removeByName('gazetteLastError')
    configCol.fields.removeByName('gazetteLastSync')
    app.save(configCol)
  },
)
