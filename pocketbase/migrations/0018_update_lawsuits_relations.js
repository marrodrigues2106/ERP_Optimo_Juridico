migrate(
  (app) => {
    const lawsuits = app.findCollectionByNameOrId('lawsuits')

    if (!lawsuits.fields.getByName('client')) {
      lawsuits.fields.add(
        new RelationField({
          name: 'client',
          collectionId: app.findCollectionByNameOrId('clients').id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }

    if (!lawsuits.fields.getByName('collaborator')) {
      lawsuits.fields.add(
        new RelationField({
          name: 'collaborator',
          collectionId: app.findCollectionByNameOrId('collaborators').id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }

    if (!lawsuits.fields.getByName('notifyClient')) {
      lawsuits.fields.add(
        new BoolField({
          name: 'notifyClient',
        }),
      )
    }

    app.save(lawsuits)

    const agenda = app.findCollectionByNameOrId('agenda_events')
    if (!agenda.fields.getByName('collaborator')) {
      agenda.fields.add(
        new RelationField({
          name: 'collaborator',
          collectionId: app.findCollectionByNameOrId('collaborators').id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }
    app.save(agenda)
  },
  (app) => {
    const lawsuits = app.findCollectionByNameOrId('lawsuits')
    lawsuits.fields.removeByName('client')
    lawsuits.fields.removeByName('collaborator')
    lawsuits.fields.removeByName('notifyClient')
    app.save(lawsuits)

    const agenda = app.findCollectionByNameOrId('agenda_events')
    agenda.fields.removeByName('collaborator')
    app.save(agenda)
  },
)
