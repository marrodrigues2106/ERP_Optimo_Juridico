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
        if (typeof t === 'string' && t === originalName) {
          updated = true
          return newName
        }
        return t
      })

      const cleanedTags = newTags.filter((t) => typeof t === 'string' && !/^\d+$/.test(t))
      if (cleanedTags.length !== newTags.length) {
        updated = true
      }

      if (updated) {
        const uniqueTags = [...new Set(cleanedTags)]
        record.set('tags', uniqueTags)
        txApp.saveNoValidate(record)
      }
    }
  })

  return e.next()
}, 'case_labels')
