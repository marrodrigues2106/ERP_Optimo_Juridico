migrate(
  (app) => {
    const results = app.findCollectionByNameOrId('results')
    results.addIndex('idx_results_numero_processo', false, 'numero_processo', '')
    app.save(results)

    const cases = app.findCollectionByNameOrId('legal_cases')
    cases.addIndex('idx_legal_cases_case_number', false, 'case_number', '')
    app.save(cases)
  },
  (app) => {
    const results = app.findCollectionByNameOrId('results')
    results.removeIndex('idx_results_numero_processo')
    app.save(results)

    const cases = app.findCollectionByNameOrId('legal_cases')
    cases.removeIndex('idx_legal_cases_case_number')
    app.save(cases)
  },
)
