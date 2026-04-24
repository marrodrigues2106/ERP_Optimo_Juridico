onRecordAfterDeleteSuccess((e) => {
  const name = e.record.getString('name')
  const org = e.record.getString('organization')

  if (!name) return e.next()

  const cases = $app.findRecordsByFilter(
    'legal_cases',
    'tags ~ {:old} && organization = {:org}',
    '',
    10000,
    0,
    { old: name, org: org },
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

      const newTags = tags.filter((t) => t !== name)

      if (newTags.length !== tags.length) {
        record.set('tags', newTags)
        txApp.saveNoValidate(record)
      }
    }
  })

  return e.next()
}, 'case_labels')
