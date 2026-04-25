migrate(
  (app) => {
    const crm = app.findCollectionByNameOrId('crm_interactions')
    const sf = crm.fields.getByName('status')
    if (sf) {
      crm.fields.removeByName('status')
      crm.fields.add(
        new SelectField({ name: 'status', values: ['Pending', 'Completed', 'open', 'closed'] }),
      )
      app.save(crm)
    }
  },
  (app) => {
    // no-op
  },
)
