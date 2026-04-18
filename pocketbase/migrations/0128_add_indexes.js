migrate(
  (app) => {
    const results = app.findCollectionByNameOrId('results')
    let hasResIdx = false
    for (let idx of results.indexes || []) {
      if (idx.includes('numero_processo')) hasResIdx = true
    }
    if (!hasResIdx) {
      results.addIndex('idx_results_numero_processo', false, 'numero_processo', '')
      app.save(results)
    }

    const cases = app.findCollectionByNameOrId('legal_cases')
    let hasCasesIdx = false
    for (let idx of cases.indexes || []) {
      if (idx.includes('case_number')) hasCasesIdx = true
    }
    if (!hasCasesIdx) {
      cases.addIndex('idx_legal_cases_case_number', false, 'case_number', '')
      app.save(cases)
    }
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
