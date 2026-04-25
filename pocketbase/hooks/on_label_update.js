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
    for (let i = 0; i < cases.length; i++) {
      let record = cases[i]
      let tags = record.get('tags')

      let tagsArray = []
      if (typeof tags === 'string') {
        try {
          tagsArray = JSON.parse(tags)
        } catch (err) {
          tagsArray = []
        }
      } else if (Array.isArray(tags)) {
        tagsArray = tags
      }

      if (!Array.isArray(tagsArray)) continue

      let updated = false
      const newTagsArray = []

      for (let j = 0; j < tagsArray.length; j++) {
        let t = tagsArray[j]

        if (typeof t !== 'string') {
          newTagsArray.push(t)
          continue
        }

        const tTrimmed = t.trim()

        if (tTrimmed === originalName) {
          updated = true
          newTagsArray.push(newName)
        } else {
          newTagsArray.push(tTrimmed)
        }
      }

      if (updated) {
        const uniqueTags = []
        for (let j = 0; j < newTagsArray.length; j++) {
          const val = newTagsArray[j]
          if (typeof val === 'string' && val.trim() === '') continue

          const isDuplicate = uniqueTags.some((ut) =>
            typeof ut === 'string' && typeof val === 'string' ? ut === val : ut === val,
          )

          if (!isDuplicate) {
            uniqueTags.push(val)
          }
        }

        record.set('tags', uniqueTags)
        txApp.saveNoValidate(record)
      }
    }
  })

  try {
    const logCol = $app.findCollectionByNameOrId('system_logs')
    const log = new Record(logCol)
    log.set('level', 'info')
    log.set('module', 'on_label_update')
    log.set('message', 'Etiqueta renomeada com sucesso via case_labels')
    log.set('details', { oldTag: originalName, newTag: newName, updatedCases: cases.length })
    if (org) log.set('organization', org)
    $app.saveNoValidate(log)
  } catch (_) {}

  return e.next()
}, 'case_labels')
