migrate(
  (app) => {
    const caseLabels = new Collection({
      name: 'case_labels',
      type: 'base',
      listRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      viewRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      createRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      updateRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      deleteRule: "(@request.auth.id != '') && organization = @request.auth.active_organization",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'color', type: 'text', required: false },
        {
          name: 'organization',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('organizations').id,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_case_labels_name_org ON case_labels (name, organization)'],
    })
    app.save(caseLabels)

    try {
      const cases = app.findRecordsByFilter('legal_cases', "deleted_at = ''", '', 10000, 0)
      const uniqueTags = new Map()

      for (let c of cases) {
        const org = c.get('organization')
        if (!org) continue
        let tags = c.get('tags')
        if (typeof tags === 'string') {
          try {
            tags = JSON.parse(tags)
          } catch (e) {
            tags = []
          }
        }
        if (Array.isArray(tags)) {
          for (let t of tags) {
            if (t && typeof t === 'string' && t.trim() !== '') {
              const key = org + '_' + t.trim()
              if (!uniqueTags.has(key)) {
                uniqueTags.set(key, { org, name: t.trim() })
              }
            }
          }
        }
      }

      const defaultColors = [
        '#f87171',
        '#fb923c',
        '#fbbf24',
        '#facc15',
        '#a3e635',
        '#4ade80',
        '#34d399',
        '#2dd4bf',
        '#38bdf8',
        '#22d3ee',
        '#60a5fa',
        '#818cf8',
        '#a78bfa',
        '#c084fc',
        '#e879f9',
        '#f472b6',
        '#fb7185',
      ]

      let colorIdx = 0
      for (let val of uniqueTags.values()) {
        const record = new Record(caseLabels)
        record.set('name', val.name)
        record.set('color', defaultColors[colorIdx % defaultColors.length])
        record.set('organization', val.org)
        colorIdx++
        try {
          app.save(record)
        } catch (e) {
          // Ignore unique constraint violations if any
        }
      }
    } catch (err) {
      console.log('Error migrating tags:', err)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('case_labels')
    app.delete(col)
  },
)
