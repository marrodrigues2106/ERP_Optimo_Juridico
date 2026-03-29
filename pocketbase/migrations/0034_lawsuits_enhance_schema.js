migrate(
  (app) => {
    const lawsuits = app.findCollectionByNameOrId('lawsuits')

    if (!lawsuits.fields.getByName('class')) {
      lawsuits.fields.add(new TextField({ name: 'class' }))
    }
    if (!lawsuits.fields.getByName('subject')) {
      lawsuits.fields.add(new TextField({ name: 'subject' }))
    }
    if (!lawsuits.fields.getByName('processType')) {
      lawsuits.fields.add(new TextField({ name: 'processType' }))
    }
    if (!lawsuits.fields.getByName('distributionDate')) {
      lawsuits.fields.add(new DateField({ name: 'distributionDate' }))
    }

    app.save(lawsuits)

    // Set cascadeDelete to true for related collections to prevent 400 errors on deletion
    const relations = [
      { coll: 'lawsuit_movements', field: 'lawsuit' },
      { coll: 'lawsuit_notifications', field: 'lawsuit' },
      { coll: 'agenda_events', field: 'linked_lawsuit' },
    ]

    for (let r of relations) {
      try {
        const col = app.findCollectionByNameOrId(r.coll)
        const f = col.fields.getByName(r.field)
        if (f) {
          f.cascadeDelete = true
          app.save(col)
        }
      } catch (err) {}
    }
  },
  (app) => {
    // Safe down migration: no-op since data might be lost
  },
)
