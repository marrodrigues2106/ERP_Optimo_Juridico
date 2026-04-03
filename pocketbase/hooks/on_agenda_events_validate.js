onRecordValidate((e) => {
  const type = e.record.get('type')
  const collaborator = e.record.get('collaborator')

  if (type === 'Task' && !collaborator) {
    throw new ValidationError('collaborator', 'Colaborador obrigatório para Task')
  }

  e.next()
}, 'agenda_events')
