migrate(
  (app) => {
    const legalCases = app.findCollectionByNameOrId('legal_cases')

    const collection = new Collection({
      name: 'case_estimates',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule:
        "@request.auth.role = 'admin' || @request.auth.role = 'manager' || @request.auth.isAdmin = true",
      fields: [
        {
          name: 'case',
          type: 'relation',
          required: true,
          collectionId: legalCases.id,
          maxSelect: 1,
        },
        { name: 'estimated_fees', type: 'number', required: true },
        { name: 'total_estimated_costs', type: 'number', required: true },
        { name: 'margin_applied', type: 'number' },
        { name: 'estimated_duration', type: 'number' },
        { name: 'duration_unit', type: 'select', values: ['semanas', 'meses'] },
        { name: 'weighted_fixed_cost_applied', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('case_estimates')
    app.delete(collection)
  },
)
