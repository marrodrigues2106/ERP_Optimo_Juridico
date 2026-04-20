// After-success hook to clean up dependencies when a user is deleted
onRecordAfterDeleteSuccess((e) => {
  const userId = e.record.id

  try {
    const collabs = $app.findRecordsByFilter('collaborators', `user = "${userId}"`, '', 1, 0)
    if (collabs && collabs.length > 0) {
      const collabRecord = collabs[0]
      const collabId = collabRecord.id

      // 1. Clear responsible_collaborator from legal_cases
      const cases = $app.findRecordsByFilter(
        'legal_cases',
        `responsible_collaborator = "${collabId}"`,
        '',
        0,
        0,
      )
      for (const c of cases) {
        c.set('responsible_collaborator', '')
        $app.saveNoValidate(c)
      }

      // 2. Remove from participants in agenda_events
      const events = $app.findRecordsByFilter(
        'agenda_events',
        `participants ~ "${collabId}"`,
        '',
        0,
        0,
      )
      for (const ev of events) {
        const participants = ev.get('participants') || []
        const newParticipants = participants.filter((id) => id !== collabId)
        ev.set('participants', newParticipants)
        $app.saveNoValidate(ev)
      }

      // 3. Clear collaborator from tasks
      const tasks = $app.findRecordsByFilter('tasks', `collaborator = "${collabId}"`, '', 0, 0)
      for (const t of tasks) {
        t.set('collaborator', '')
        $app.saveNoValidate(t)
      }

      // 4. Hard delete collaborator record (Cascade Deletion)
      $app.delete(collabRecord)
    }

    // 5. Purge user's profile settings and tracked terms
    const termos = $app.findRecordsByFilter(
      'termos_monitorados',
      `usuario_id = "${userId}"`,
      '',
      0,
      0,
    )
    for (const t of termos) {
      $app.delete(t)
    }

    const alertas = $app.findRecordsByFilter(
      'configuracoes_alerta',
      `usuario_id = "${userId}"`,
      '',
      0,
      0,
    )
    for (const a of alertas) {
      $app.delete(a)
    }
  } catch (err) {
    console.log('Error in on_user_delete hook: ' + err)
  }

  e.next()
}, 'users')
