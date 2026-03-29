migrate(
  (app) => {
    // 1. Create organizations collection
    const orgs = new Collection({
      name: 'organizations',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null,
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'logo',
          type: 'file',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml'],
        },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(orgs)

    // 2. Update users
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(
      new RelationField({ name: 'organizations', collectionId: orgs.id, maxSelect: 2147483647 }),
    )
    users.fields.add(
      new RelationField({ name: 'active_organization', collectionId: orgs.id, maxSelect: 1 }),
    )
    app.save(users)

    // Default org
    const defaultOrg = new Record(orgs)
    defaultOrg.set('name', 'Moraes Rodrigues Advocacia')
    app.save(defaultOrg)

    const existingUsers = app.findRecordsByFilter('users', '1=1', '', 100, 0)
    for (const u of existingUsers) {
      u.set('organizations', [defaultOrg.id])
      u.set('active_organization', defaultOrg.id)
      app.save(u)
    }

    // 3. Update business collections for strict isolation
    const collectionsToUpdate = [
      'clients',
      'collaborators',
      'legal_cases',
      'case_movements',
      'agenda_events',
      'tasks',
      'finances',
      'gazette_publications',
      'crm_interactions',
      'case_estimates',
    ]

    for (const colName of collectionsToUpdate) {
      try {
        const col = app.findCollectionByNameOrId(colName)
        col.fields.add(
          new RelationField({ name: 'organization', collectionId: orgs.id, maxSelect: 1 }),
        )

        const appendRule = (rule) => {
          if (rule === null) return null
          if (rule === '') return 'organization = @request.auth.active_organization'
          return `(${rule}) && organization = @request.auth.active_organization`
        }

        col.listRule = appendRule(col.listRule)
        col.viewRule = appendRule(col.viewRule)
        col.createRule = appendRule(col.createRule)
        col.updateRule = appendRule(col.updateRule)
        col.deleteRule = appendRule(col.deleteRule)

        app.save(col)

        // Backfill organization
        const records = app.findRecordsByFilter(colName, '1=1', '', 10000, 0)
        for (let r of records) {
          r.set('organization', defaultOrg.id)
          app.saveNoValidate(r)
        }
      } catch (err) {
        console.log('Error updating ' + colName, err)
      }
    }
  },
  (app) => {
    const orgs = app.findCollectionByNameOrId('organizations')
    app.delete(orgs)
  },
)
