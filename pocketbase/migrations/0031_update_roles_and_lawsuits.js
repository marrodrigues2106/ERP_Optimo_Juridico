migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const roleField = users.fields.getByName('role')
    if (roleField) {
      roleField.values = [
        'admin',
        'legal_team',
        'admin_user',
        'financial_user',
        'collaborator',
        'coordinator',
        'manager',
      ]
    }
    app.save(users)

    const lawsuits = app.findCollectionByNameOrId('lawsuits')
    lawsuits.fields.add(new BoolField({ name: 'isFavorite' }))
    lawsuits.fields.add(
      new SelectField({
        name: 'lifecycle_status',
        values: ['Acompanhado', 'Arquivado'],
        maxSelect: 1,
      }),
    )
    lawsuits.fields.add(
      new SelectField({
        name: 'trackingSource',
        values: ['Diários Oficiais', 'Tribunais', 'Ambos'],
        maxSelect: 1,
      }),
    )
    app.save(lawsuits)

    const notifs = app.findCollectionByNameOrId('lawsuit_notifications')
    const typeField = notifs.fields.getByName('type')
    if (typeField) {
      typeField.values = ['update', 'discovery', 'gazette', 'court']
    }
    app.save(notifs)
  },
  (app) => {
    // down migration
  },
)
