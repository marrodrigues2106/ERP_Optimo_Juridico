migrate(
  (app) => {
    const pje = app.findCollectionByNameOrId('pje_communications')
    if (!pje.fields.getByName('is_archived')) {
      pje.fields.add(new BoolField({ name: 'is_archived' }))
    }
    if (!pje.fields.getByName('treatment_status')) {
      pje.fields.add(
        new SelectField({
          name: 'treatment_status',
          maxSelect: 1,
          values: [
            'pending',
            'task_created',
            'event_created',
            'manual_recorded',
            'concluded',
            'discarded',
          ],
        }),
      )
    }
    if (!pje.fields.getByName('treatment_type')) {
      pje.fields.add(new TextField({ name: 'treatment_type' }))
    }
    app.save(pje)

    const gazette = app.findCollectionByNameOrId('gazette_publications')
    if (!gazette.fields.getByName('treatment_status')) {
      gazette.fields.add(
        new SelectField({
          name: 'treatment_status',
          maxSelect: 1,
          values: [
            'pending',
            'task_created',
            'event_created',
            'manual_recorded',
            'concluded',
            'discarded',
          ],
        }),
      )
    }
    if (!gazette.fields.getByName('treatment_type')) {
      gazette.fields.add(new TextField({ name: 'treatment_type' }))
    }
    app.save(gazette)
  },
  (app) => {
    const pje = app.findCollectionByNameOrId('pje_communications')
    pje.fields.removeByName('is_archived')
    pje.fields.removeByName('treatment_status')
    pje.fields.removeByName('treatment_type')
    app.save(pje)

    const gazette = app.findCollectionByNameOrId('gazette_publications')
    gazette.fields.removeByName('treatment_status')
    gazette.fields.removeByName('treatment_type')
    app.save(gazette)
  },
)
