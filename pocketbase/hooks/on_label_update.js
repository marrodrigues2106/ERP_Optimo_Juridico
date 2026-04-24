onRecordAfterUpdateSuccess((e) => {
  const originalName = e.record.original().getString('name')
  const newName = e.record.getString('name')
  const org = e.record.getString('organization')

  if (!originalName || originalName === newName) return e.next()

  const cases = $app.findRecordsByFilter(
    'legal_cases',
    'tags ~ {:old} && organization = {:org}',
    '',
    10000,
    0,
    { old: originalName, org: org },
  )

  $app.runInTransaction((txApp) => {
    for (let record of cases) {
      let tags = record.get('tags')
      if (typeof tags === 'string') {
        try {
          tags = JSON.parse(tags)
        } catch (err) {
          tags = []
        }
      }
      if (!Array.isArray(tags)) tags = []

      let updated = false
      let newTags = tags.map((t) => {
        if (t === originalName) {
          updated = true
          return newName
        }
        return t
      })

      if (updated) {
        newTags = [...new Set(newTags)]
        record.set('tags', newTags)
        txApp.saveNoValidate(record)
      }
    }
  })

  return e.next()
}, 'case_labels')
