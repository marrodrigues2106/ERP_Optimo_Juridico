migrate(
  (app) => {
    const results = app.findCollectionByNameOrId('results')
    const resIdx = results.indexes || []
    results.indexes = resIdx.filter((idx) => !idx.includes('numero_processo'))
    results.addIndex('idx_results_numero_processo', false, 'numero_processo', '')
    app.save(results)

    const cases = app.findCollectionByNameOrId('legal_cases')
    const casesIdx = cases.indexes || []
    cases.indexes = casesIdx.filter((idx) => !idx.includes('case_number'))
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
