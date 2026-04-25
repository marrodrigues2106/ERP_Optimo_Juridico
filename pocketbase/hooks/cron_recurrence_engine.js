cronAdd('recurrence_engine', '0 1 * * *', () => {
  const collections = ['tasks', 'agenda_events']
  const now = new Date()
  for (const col of collections) {
    const records = $app.findRecordsByFilter(
      col,
      "is_recurring = true && next_instance_generated = false && deleted_at = ''",
      '',
      1000,
      0,
    )
    for (const r of records) {
      const dateField = col === 'tasks' ? 'due_date' : 'start_date'
      const dStr = r.getString(dateField)
      if (!dStr) continue

      const d = new Date(dStr)
      if (d < now) {
        const type = r.getString('recurrence_type')
        const nextDate = new Date(d)
        if (type === 'daily') nextDate.setDate(nextDate.getDate() + 1)
        else if (type === 'weekly') nextDate.setDate(nextDate.getDate() + 7)
        else if (type === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1)
        else if (type === 'annual') nextDate.setFullYear(nextDate.getFullYear() + 1)
        else continue

        const endStr = r.getString('recurrence_end')
        if (endStr) {
          const endDate = new Date(endStr)
          if (nextDate > endDate) continue
        }

        const newRec = new Record(r.collection())
        for (const f of r.collection().fields) {
          if (
            f.name !== 'id' &&
            f.name !== 'created' &&
            f.name !== 'updated' &&
            f.name !== 'next_instance_generated' &&
            f.name !== dateField &&
            f.name !== 'end_date'
          ) {
            newRec.set(f.name, r.get(f.name))
          }
        }

        newRec.set(dateField, nextDate.toISOString())
        if (col === 'agenda_events' && r.getString('end_date')) {
          const endD = new Date(r.getString('end_date'))
          const diff = endD.getTime() - d.getTime()
          const newEnd = new Date(nextDate.getTime() + diff)
          newRec.set('end_date', newEnd.toISOString())
        }

        if (col === 'tasks') {
          newRec.set('status', 'todo')
        }

        try {
          $app.save(newRec)
          r.set('next_instance_generated', true)
          $app.save(r)
        } catch (e) {
          $app.logger().error('Recurrence engine failed for record ' + r.id, 'error', e.message)
        }
      }
    }
  }
})
