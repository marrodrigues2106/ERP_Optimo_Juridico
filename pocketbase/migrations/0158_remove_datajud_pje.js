migrate(
  (app) => {
    const collectionsToRemove = [
      'monitoring_configs',
      'monitoring_terms',
      'pje_sync_logs',
      'followed_processes',
      'searches',
      'results',
      'tribunals',
    ]

    for (const name of collectionsToRemove) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }

    try {
      const legalCases = app.findCollectionByNameOrId('legal_cases')
      legalCases.removeIndex('idx_legal_cases_pje_status')
      legalCases.removeIndex('idx_legal_cases_pje_last_sync')
      legalCases.fields.removeByName('datajud_last_sync')
      legalCases.fields.removeByName('datajud_sync_status')
      legalCases.fields.removeByName('pje_last_sync')
      legalCases.fields.removeByName('pje_sync_status')
      legalCases.fields.removeByName('search_after_token')
      legalCases.fields.removeByName('court_alias')
      app.save(legalCases)
    } catch (_) {}

    try {
      const users = app.findCollectionByNameOrId('users')
      users.fields.removeByName('can_view_search_module')
      app.save(users)
    } catch (_) {}
  },
  (app) => {
    // Irreversible changes
  },
)
