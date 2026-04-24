onRecordAfterUpdateSuccess((e) => {
  const newRecord = e.record
  const original = newRecord.original()

  if (newRecord.getBool('is_system_dispatcher') && !original.getBool('is_system_dispatcher')) {
    const orgId = newRecord.get('active_organization')
    if (orgId) {
      const others = $app.findRecordsByFilter(
        'users',
        `active_organization = {:orgId} && is_system_dispatcher = true && id != {:id}`,
        '-created',
        100,
        0,
        { orgId: orgId, id: newRecord.id },
      )
      for (const other of others) {
        other.set('is_system_dispatcher', false)
        $app.saveNoValidate(other)
      }
    } else {
      const others = $app.findRecordsByFilter(
        'users',
        `is_system_dispatcher = true && id != {:id}`,
        '-created',
        100,
        0,
        { id: newRecord.id },
      )
      for (const other of others) {
        other.set('is_system_dispatcher', false)
        $app.saveNoValidate(other)
      }
    }
  }
  e.next()
}, 'users')
