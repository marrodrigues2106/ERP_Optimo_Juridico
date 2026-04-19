routerAdd('GET', '/backend/v1/public/agenda/{orgId}', (e) => {
  const orgId = e.request.pathValue('orgId')
  if (!orgId) return e.badRequestError('missing orgId')

  const records = $app.findRecordsByFilter(
    'agenda_events',
    "organization = {:orgId} && deleted_at = ''",
    'start_date',
    1000,
    0,
    { orgId: orgId },
  )

  const events = records.map((r) => ({
    id: r.id,
    title: r.getString('title'),
    type: r.getString('type'),
    start_date: r.getString('start_date'),
    end_date: r.getString('end_date'),
  }))

  return e.json(200, events)
})
