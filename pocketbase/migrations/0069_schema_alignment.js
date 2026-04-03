migrate(
  (app) => {
    const collections = [
      'finances',
      'clients',
      'collaborators',
      'agenda_events',
      'tasks',
      'legal_cases',
      'case_movements',
      'gazette_publications',
      'case_estimates',
      'crm_interactions',
    ]

    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)

        const rule = "(@request.auth.id != '') && organization = @request.auth.active_organization"

        col.listRule = rule
        col.viewRule = rule
        col.createRule = rule
        col.updateRule = rule

        if (name === 'case_estimates') {
          col.deleteRule =
            "(@request.auth.role = 'admin' || @request.auth.role = 'manager' || @request.auth.isAdmin = true) && organization = @request.auth.active_organization"
        } else {
          col.deleteRule = rule
        }

        app.save(col)
      } catch (e) {}
    }
  },
  (app) => {},
)
