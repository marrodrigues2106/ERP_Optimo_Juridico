onRecordAfterCreateSuccess((e) => {
  if (e.record.get('type') === 'Task') {
    try {
      const tasks = $app.findCollectionByNameOrId('tasks')
      const task = new Record(tasks)
      task.set('title', e.record.get('title'))
      task.set('description', e.record.get('description'))
      task.set('due_date', e.record.get('start_date'))
      task.set('priority', 'medium')
      task.set('status', 'todo')

      const collab = e.record.get('collaborator')
      if (collab) task.set('collaborator', collab)

      const lawsuit = e.record.get('linked_lawsuit')
      if (lawsuit) task.set('linked_lawsuit', lawsuit)

      const org = e.record.get('organization')
      if (org) task.set('organization', org)

      $app.save(task)
    } catch (err) {
      console.error('Error syncing task from agenda:', err)
    }
  }
  e.next()
}, 'agenda_events')
