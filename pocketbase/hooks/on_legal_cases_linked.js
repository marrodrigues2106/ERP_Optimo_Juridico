onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  const related = record.get('related_cases') || []
  if (!related || related.length === 0) return e.next()

  for (let i = 0; i < related.length; i++) {
    try {
      const otherCase = $app.findRecordById('legal_cases', related[i])
      const otherRelated = otherCase.get('related_cases') || []
      if (!otherRelated.includes(record.id)) {
        otherRelated.push(record.id)
        otherCase.set('related_cases', otherRelated)
        $app.saveNoValidate(otherCase)
      }
    } catch (err) {
      $app.logger().error('Failed reciprocal link', 'error', err.message)
    }
  }
  return e.next()
}, 'legal_cases')
