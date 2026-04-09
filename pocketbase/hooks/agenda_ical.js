routerAdd(
  'GET',
  '/backend/v1/agenda/ical/{token}',
  (e) => {
    const token = e.request.pathValue('token')
    if (!token) throw new BadRequestError('Token missing')

    let user
    try {
      user = $app.findFirstRecordByData('users', 'ical_token', token)
    } catch (_) {
      throw new NotFoundError('Invalid token')
    }

    let filter = `deleted_at = ""`
    if (user.get('active_organization')) {
      filter += ` && organization = "${user.get('active_organization')}"`
    }

    const events = $app.findRecordsByFilter('agenda_events', filter, '-start_date', 1000, 0)
    const tasks = $app.findRecordsByFilter(
      'tasks',
      filter + ` && due_date != ""`,
      '-due_date',
      1000,
      0,
    )

    let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//MRA//Agenda//PT\r\n'

    const fmt = (dStr) => {
      if (!dStr) return ''
      const d = new Date(dStr)
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    events.forEach((ev) => {
      ics += 'BEGIN:VEVENT\r\n'
      ics += `UID:${ev.id}@mra.com.br\r\n`
      ics += `DTSTAMP:${fmt(ev.get('created'))}\r\n`
      ics += `DTSTART:${fmt(ev.get('start_date'))}\r\n`
      if (ev.get('end_date')) {
        ics += `DTEND:${fmt(ev.get('end_date'))}\r\n`
      } else {
        const end = new Date(new Date(ev.get('start_date')).getTime() + 3600000)
        ics += `DTEND:${fmt(end.toISOString())}\r\n`
      }
      ics += `SUMMARY:${ev.get('title')}\r\n`
      if (ev.get('description')) ics += `DESCRIPTION:${ev.get('description')}\r\n`
      ics += 'END:VEVENT\r\n'
    })

    tasks.forEach((tk) => {
      ics += 'BEGIN:VEVENT\r\n'
      ics += `UID:task_${tk.id}@mra.com.br\r\n`
      ics += `DTSTAMP:${fmt(tk.get('created'))}\r\n`
      ics += `DTSTART:${fmt(tk.get('due_date'))}\r\n`
      ics += `DTEND:${fmt(tk.get('due_date'))}\r\n`
      ics += `SUMMARY:[Tarefa] ${tk.get('title')}\r\n`
      if (tk.get('description')) ics += `DESCRIPTION:${tk.get('description')}\r\n`
      ics += 'END:VEVENT\r\n'
    })

    ics += 'END:VCALENDAR'

    e.response.header().set('Content-Type', 'text/calendar; charset=utf-8')
    e.response.header().set('Content-Disposition', `attachment; filename="agenda.ics"`)
    return e.string(200, ics)
  },
  $apis.requireGuestOnly(),
)
